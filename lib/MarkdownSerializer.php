<?php

declare(strict_types=1);

namespace Medienbaecker\Tiptap;

/**
 * Serializes Tiptap JSON to markdown, mirroring the Panel's
 * @tiptap/markdown pipeline byte for byte so a later Panel save
 * produces no diff.
 */
class MarkdownSerializer
{
	private const MARK_DELIMITER = [
		'bold' => '**',
		'italic' => '*',
		'strike' => '~~',
		'code' => '`',
		'kirbytagRaw' => '',
	];

	private const HTML_TAGS = [
		'bold' => 'strong',
		'italic' => 'em',
		'strike' => 'del',
	];

	private const HTML_REOPEN = [
		'bold' => ['<strong>', '</strong>'],
		'italic' => ['<em>', '</em>'],
	];

	// Registration order in the Panel's MarkdownManager (higher rank nests inner)
	private const MARK_RANKS = [
		'bold' => 3,
		'code' => 6,
		'italic' => 15,
		'strike' => 19,
		'kirbytagRaw' => 22,
	];

	private const VERBATIM_NODES = [
		'codeBlock' => true,
		'rawSource' => true,
		'rawMarkdownTable' => true,
	];

	// code: true extensions; their text bypasses escaping
	private const CODE_TYPES = [
		'code' => true,
		'codeBlock' => true,
		'kirbytagRaw' => true,
	];

	private const HTML_ATTRS = '(?:\s(?:"[^"]*"|\'[^\']*\'|[^<>"\'])*)?';

	// A whole element, not just its tags: the parser hands the element back as
	// one literal token, so escaping its contents compounds on every save
	private const HTML_RAW =
		'<!--[\s\S]*?-->' .
		'|<([a-zA-Z][a-zA-Z0-9-]*)' . self::HTML_ATTRS . '>[\s\S]*?<\/\s*\1\s*>' .
		'|<\/?[a-zA-Z][a-zA-Z0-9-]*' . self::HTML_ATTRS . '\/?>';

	private const SUPPORTED_NODES = [
		'doc' => true,
		'paragraph' => true,
		'text' => true,
		'hardBreak' => true,
		'heading' => true,
		'bulletList' => true,
		'orderedList' => true,
		'listItem' => true,
		'blockquote' => true,
		'codeBlock' => true,
		'horizontalRule' => true,
		'rawSource' => true,
		'rawMarkdownTable' => true,
	];

	// link is allowed because transformInline rewrites it to a KirbyTag
	private const SUPPORTED_MARKS = [
		'bold' => true,
		'italic' => true,
		'strike' => true,
		'code' => true,
		'kirbytagRaw' => true,
		'link' => true,
	];

	// Attributes the emitter consumes; any other non-null attribute
	// (e.g. a paragraph class from a custom extension) cannot be
	// expressed in markdown and must trigger the JSON fallback
	private const SUPPORTED_ATTRS = [
		'heading' => ['level' => true],
		'orderedList' => ['start' => true, 'type' => true],
		'codeBlock' => ['language' => true],
		'rawSource' => ['raw' => true],
		'rawMarkdownTable' => ['raw' => true],
	];

	// Per tag, because an attribute the tag does not register gets folded into
	// the preceding attribute's value by KirbyTag::parse
	private const LINK_TAG_ATTRS = [
		'link' => ['class', 'lang', 'rel', 'role', 'target', 'title'],
		'email' => ['class', 'rel', 'target', 'title'],
		'tel' => ['class', 'rel', 'title'],
	];

	private const ESCAPABLE = '\\`*_{}[]()>#+-.!|~';

	private static bool $escapeAll = false;

	// JavaScript's \s (unicode) for whitespace parity with the Panel
	private const WS_CHARS = ' \t\n\r\f\x0B\x{00a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}';
	private const WS = '[' . self::WS_CHARS . ']';

	public static function serialize(array $doc, ?array $kirbytags, bool $inline, array $buttons, array $options): ?string
	{
		if ($inline) {
			$doc = static::flattenInline($doc);
		}

		$doc = static::transform($doc);
		$doc = static::protect($doc, $kirbytags);

		foreach ([false, true] as $escapeAll) {
			static::$escapeAll = $escapeAll;
			try {
				$markdown = static::renderInline($doc['content'] ?? [], $doc, "\n\n");
			} finally {
				static::$escapeAll = false;
			}

			$markdown = static::isEmptyOutput($markdown) ? '' : $markdown;

			if (static::readsBackAs($markdown, $doc, $buttons, $options)) {
				return $markdown;
			}
		}

		return null;
	}

	private static function readsBackAs(string $markdown, array $doc, array $buttons, array $options): bool
	{
		$parsed = static::transform(MarkdownParser::parse($markdown, $buttons, $options));
		$expected = static::readSource($doc['content'] ?? [], $buttons, $options);
		return static::canonical($parsed['content'] ?? []) === static::canonical($expected);
	}

	private static function readSource(array $nodes, array $buttons, array $options): array
	{
		$formatting = '/<(' . implode('|', array_keys(MarkdownParser::HTML_MARKS)) . ')>/i';
		$out = [];
		foreach ($nodes as $node) {
			if (isset($node['content']) && isset(self::VERBATIM_NODES[$node['type'] ?? '']) === false) {
				$node['content'] = static::readSource($node['content'], $buttons, $options);
			}

			if (($node['type'] ?? null) !== 'text' || static::hasMark($node, 'kirbytagRaw') === false || preg_match($formatting, $node['text'] ?? '') !== 1) {
				$out[] = $node;
				continue;
			}

			$read = MarkdownParser::parse($node['text'], $buttons, $options)['content'] ?? [];
			if (count($read) !== 1 || ($read[0]['type'] ?? null) !== 'paragraph') {
				$out[] = $node;
				continue;
			}
			foreach ($read[0]['content'] ?? [] as $child) {
				$child['marks'] = [...($node['marks'] ?? []), ...($child['marks'] ?? [])];
				$out[] = $child;
			}
		}
		return $out;
	}

	private static function canonical(array $nodes): array
	{
		$out = [];
		foreach ($nodes as $node) {
			$type = $node['type'] ?? null;

			if ($type === 'text') {
				$marks = array_values(array_diff(array_column($node['marks'] ?? [], 'type'), ['kirbytagRaw']));
				sort($marks);
				$last = array_key_last($out);
				if ($last !== null && $out[$last]['type'] === 'text' && $out[$last]['marks'] === $marks) {
					$out[$last]['text'] .= $node['text'] ?? '';
				} else {
					$out[] = ['type' => 'text', 'text' => (string)($node['text'] ?? ''), 'marks' => $marks];
				}
				continue;
			}

			$attrs = array_filter(
				array_intersect_key($node['attrs'] ?? [], self::SUPPORTED_ATTRS[$type] ?? []),
				fn ($value) => $value !== null && $value !== ''
			);
			if ($type === 'orderedList') {
				$attrs['start'] = (int)($attrs['start'] ?? 1);
			}

			$entry = ['type' => $type, 'attrs' => $attrs];

			if (isset(self::VERBATIM_NODES[$type])) {
				$entry['text'] = rtrim(implode('', array_column($node['content'] ?? [], 'text')) ?: (string)($node['attrs']['raw'] ?? ''));
				unset($entry['attrs']['raw']);
			} elseif ($type === 'paragraph' || $type === 'heading') {
				$entry['content'] = static::canonicalLines(static::canonical($node['content'] ?? []));
				if ($entry['content'] === []) {
					continue;
				}
			} elseif (isset($node['content'])) {
				$entry['content'] = static::canonical($node['content']);
			}

			$out[] = $entry;
		}
		return $out;
	}

	private static function canonicalLines(array $nodes): array
	{
		$lines = [[]];
		foreach ($nodes as $node) {
			if ($node['type'] === 'hardBreak') {
				$lines[] = [];
				continue;
			}
			$line = &$lines[array_key_last($lines)];
			$parts = $node['type'] === 'text'
				? preg_split('/([ \t]+)/', $node['text'], -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY)
				: [null];
			foreach ($parts as $part) {
				$piece = $part === null ? $node : ['type' => 'text', 'text' => $part, 'marks' => trim($part) === '' ? [] : $node['marks']];
				$last = array_key_last($line);
				if ($last !== null && $piece['type'] === 'text' && $line[$last]['type'] === 'text' && $line[$last]['marks'] === $piece['marks']) {
					$line[$last]['text'] .= $piece['text'];
				} else {
					$line[] = $piece;
				}
			}
			unset($line);
		}

		$out = [];
		foreach ($lines as $index => $line) {
			if ($index > 0) {
				$out[] = ['type' => 'hardBreak', 'attrs' => []];
			}
			foreach ($line as $position => $node) {
				if ($node['type'] === 'text') {
					if (in_array('code', $node['marks'], true)) {
						$node['text'] = trim($node['text'], ' ');
					}
					$node['text'] = preg_replace('/[ \t]+/', ' ', $node['text']);
					if ($position === 0) {
						$node['text'] = ltrim($node['text'], ' ');
					}
					if ($position === count($line) - 1) {
						$node['text'] = rtrim($node['text'], ' ');
					}
					if ($node['text'] === '') {
						continue;
					}
				}
				$out[] = $node;
			}
		}

		while ($out !== [] && $out[array_key_last($out)]['type'] === 'hardBreak') {
			array_pop($out);
		}

		return $out;
	}

	public static function linkLabel(array $nodes): string
	{
		$label = static::protect(['type' => 'paragraph', 'content' => $nodes], null);
		return str_replace(['&lt;', '&amp;'], ['<', '&'], static::renderInline($label['content'], $label, ''));
	}

	public static function findUnsupportedNodes(array $doc): array
	{
		$found = [];
		static::collectUnsupported($doc, $found);
		return array_keys($found);
	}

	private static function collectUnsupported(array $node, array &$found): void
	{
		$type = $node['type'] ?? '';
		if (isset(self::SUPPORTED_NODES[$type]) === false) {
			$found[$type] = true;
		} else {
			static::collectUnsupportedAttrs($type, $node['attrs'] ?? [], $found);
		}
		foreach ($node['marks'] ?? [] as $mark) {
			$markType = $mark['type'] ?? '';
			if (isset(self::SUPPORTED_MARKS[$markType]) === false) {
				$found['mark:' . $markType] = true;
			} elseif ($markType === 'link') {
				static::collectUnsupportedLinkAttrs($mark['attrs'] ?? [], $found);
			} else {
				static::collectUnsupportedAttrs($markType, $mark['attrs'] ?? [], $found);
			}
		}
		foreach ($node['content'] ?? [] as $child) {
			static::collectUnsupported($child, $found);
		}
	}

	private static function collectUnsupportedLinkAttrs(array $attrs, array &$found): void
	{
		$allowed = self::LINK_TAG_ATTRS[static::linkTagName((string)($attrs['href'] ?? ''))];

		foreach ($attrs as $key => $value) {
			if ($value !== null && $key !== 'href' && in_array($key, $allowed, true) === false) {
				$found['attr:link.' . $key] = true;
			}
		}
	}

	private static function collectUnsupportedAttrs(string $type, array $attrs, array &$found): void
	{
		foreach ($attrs as $key => $value) {
			if ($value !== null && isset(self::SUPPORTED_ATTRS[$type][$key]) === false) {
				$found['attr:' . $type . '.' . $key] = true;
			}
		}
	}

	/**
	 * Inline fields flatten paragraphs to single line breaks in the JSON
	 * pipeline; mirror that so the markdown render matches
	 */
	private static function flattenInline(array $doc): array
	{
		$content = $doc['content'] ?? [];
		$paragraphs = array_values(array_filter(
			$content,
			fn ($node) => ($node['type'] ?? null) === 'paragraph'
		));

		if (count($paragraphs) < 2 || count($paragraphs) !== count($content)) {
			return $doc;
		}

		$merged = [];
		foreach ($paragraphs as $i => $paragraph) {
			if ($i > 0) {
				$merged[] = ['type' => 'hardBreak'];
			}
			foreach ($paragraph['content'] ?? [] as $child) {
				$merged[] = $child;
			}
		}

		return [
			'type' => 'doc',
			'content' => [['type' => 'paragraph', 'content' => $merged]],
		];
	}

	private static function transform(array $node): array
	{
		if (isset($node['content']) === false || isset(self::VERBATIM_NODES[$node['type'] ?? ''])) {
			return $node;
		}

		$content = array_map([static::class, 'transform'], $node['content']);

		$hasInline = false;
		foreach ($content as $child) {
			$type = $child['type'] ?? null;
			if ($type === 'text' || $type === 'hardBreak') {
				$hasInline = true;
				break;
			}
		}

		if ($hasInline) {
			$content = static::transformInline($content, ($node['type'] ?? null) === 'heading');
		}

		$node['content'] = $content;
		return $node;
	}

	/**
	 * Rewrites constructs markdown cannot express: emphasis on
	 * whitespace-only text, hard breaks in headings, consecutive
	 * hard breaks, legacy link marks
	 */
	private static function transformInline(array $nodes, bool $inHeading): array
	{
		$lines = [[]];
		foreach ($nodes as $node) {
			if (($node['type'] ?? null) === 'hardBreak') {
				$lines[] = [$node];
				continue;
			}
			$lines[array_key_last($lines)][] = $node;
		}

		$nodes = [];
		foreach ($lines as $line) {
			$text = array_filter($line, fn ($node) => ($node['type'] ?? null) !== 'hardBreak');
			if ($text !== [] && array_filter($text, fn ($node) => static::isWhitespaceOnly($node) === false) === []) {
				$line = array_diff_key($line, $text);
			}
			array_push($nodes, ...array_values($line));
		}

		foreach ($nodes as $index => $node) {
			if (($nodes[$index + 1]['type'] ?? null) === 'hardBreak' && ($node['type'] ?? null) === 'text') {
				$nodes[$index]['text'] = rtrim($node['text'], " \t");
			}
		}
		$nodes = array_values(array_filter($nodes, fn ($node) => ($node['type'] ?? null) !== 'text' || $node['text'] !== ''));

		$result = [];
		$count = count($nodes);

		for ($i = 0; $i < $count; $i++) {
			$node = $nodes[$i];

			if (($node['type'] ?? null) === 'hardBreak') {
				if ($inHeading || $result === []) {
					$result[] = static::rawText('<br>');
					continue;
				}
				$result[] = $node;
				while ($i + 1 < $count && ($nodes[$i + 1]['type'] ?? null) === 'hardBreak') {
					$result[] = static::rawText('<br>');
					$i++;
				}
				continue;
			}

			$link = static::linkMarkOf($node);
			if ($link !== null) {
				$href = (string)($link['attrs']['href'] ?? '');
				$text = $node['text'] ?? '';
				// Merge adjacent nodes of the same link
				while ($i + 1 < $count) {
					$nextLink = static::linkMarkOf($nodes[$i + 1]);
					if ($nextLink === null || (string)($nextLink['attrs']['href'] ?? '') !== $href) {
						break;
					}
					$text .= $nodes[$i + 1]['text'] ?? '';
					$i++;
				}
				$result[] = static::rawText(static::linkTag($href, $text, $link['attrs'] ?? []));
				continue;
			}

			if (static::isWhitespaceOnly($node) && empty($node['marks']) === false) {
				unset($node['marks']);
				$result[] = $node;
				continue;
			}

			$result[] = $node;
		}

		return $result;
	}

	private static function rawText(string $text): array
	{
		return [
			'type' => 'text',
			'text' => $text,
			'marks' => [['type' => 'kirbytagRaw']],
		];
	}

	private static function linkTagName(string $href): string
	{
		if (str_starts_with($href, 'mailto:')) {
			return 'email';
		}
		return str_starts_with($href, 'tel:') ? 'tel' : 'link';
	}

	/**
	 * Mirrors generateLinkTag() in src/utils/inputValidation.ts
	 */
	public static function linkTag(string $href, string $text, array $attrs = []): string
	{
		$name = static::linkTagName($href);
		$value = match ($name) {
			'email' => substr($href, 7),
			'tel' => substr($href, 4),
			default => $href,
		};

		$tag = "({$name}: {$value}";

		if ($text !== '' && $text !== $value && $text !== $href) {
			$tag .= ' text: ' . preg_replace('/[()]/', '\\\\$0', $text);
		}

		foreach ($attrs as $key => $attr) {
			if ($key === 'href' || $attr === null || $attr === '' || $attr === false || $attr === []) {
				continue;
			}
			$tag .= ' ' . $key . ': ' . (is_array($attr) ? implode(' ', $attr) : $attr);
		}

		return $tag . ')';
	}

	// Writer stores /@/page/<uuid>, but only the scheme form resolves inline:
	// the (link:) tag gates on Uuid::is(), which does not match the permalink path
	public static function normalizeHref(string $href): string
	{
		return preg_replace(
			'!^/(?:[a-z]{2}(?:-[a-z]{2})?/)?@/(page|file)/!i',
			'$1://',
			$href
		);
	}

	private static function linkMarkOf(array $node): ?array
	{
		foreach ($node['marks'] ?? [] as $mark) {
			if (($mark['type'] ?? null) === 'link') {
				return $mark;
			}
		}
		return null;
	}

	private static function isWhitespaceOnly(array $node): bool
	{
		return ($node['type'] ?? null) === 'text'
			&& preg_match('/^' . self::WS . '*$/u', $node['text'] ?? '') === 1;
	}

	/**
	 * Wraps KirbyTags and bare URLs in a kirbytagRaw mark so the emitter
	 * leaves them unescaped; escaped tag content would break in Kirby
	 * because tags parse before markdown unescaping
	 */
	private static function protect(array $node, ?array $registered): array
	{
		if (isset($node['content']) === false || isset(self::VERBATIM_NODES[$node['type'] ?? ''])) {
			return $node;
		}

		$content = [];
		foreach ($node['content'] as $child) {
			$child = static::protect($child, $registered);
			if (($child['type'] ?? null) === 'text' && ($child['text'] ?? '') !== '') {
				array_push($content, ...static::protectText($child, $registered));
			} else {
				$content[] = $child;
			}
		}

		$node['content'] = $content;
		return $node;
	}

	private static function protectText(array $node, ?array $registered): array
	{
		$text = $node['text'] ?? '';

		foreach ($node['marks'] ?? [] as $mark) {
			if (in_array($mark['type'] ?? null, ['code', 'kirbytagRaw'], true)) {
				return [$node];
			}
		}

		$ranges = static::sourceRanges($text, $registered);

		if ($ranges === []) {
			return [$node];
		}

		$result = [];
		$cursor = 0;
		foreach ($ranges as [$start, $end]) {
			if ($start > $cursor) {
				$gap = $node;
				$gap['text'] = substr($text, $cursor, $start - $cursor);
				$result[] = $gap;
			}
			$result[] = [
				'type' => 'text',
				'text' => substr($text, $start, $end - $start),
				'marks' => [...($node['marks'] ?? []), ['type' => 'kirbytagRaw']],
			];
			$cursor = $end;
		}
		if ($cursor < strlen($text)) {
			$tail = $node;
			$tail['text'] = substr($text, $cursor);
			$result[] = $tail;
		}

		return $result;
	}

	public static function sourceRanges(string $text, ?array $registered): array
	{
		$ranges = [];
		preg_match_all('/' . self::HTML_RAW . '/i', $text, $html, PREG_OFFSET_CAPTURE);
		foreach ($html[0] as [$raw, $start]) {
			$ranges[] = [$start, $start + strlen($raw)];
		}

		foreach (static::findKirbyTagRanges($text) as $range) {
			if ($registered !== null) {
				$slice = substr($text, $range[0], $range[1] - $range[0]);
				if (
					preg_match('/^\(([a-z0-9_-]+):/i', $slice, $match) !== 1 ||
					isset($registered[strtolower($match[1])]) === false
				) {
					continue;
				}
			}
			if (static::overlaps($ranges, $range[0], $range[1]) === false) {
				$ranges[] = $range;
			}
		}

		preg_match_all(
			'/https?:\/\/[^<>' . self::WS_CHARS . ']+/u',
			$text,
			$matches,
			PREG_OFFSET_CAPTURE
		);
		foreach ($matches[0] as [$url, $start]) {
			$end = $start + strlen(preg_replace('/[.,;:!?\'"]+$/', '', $url));
			if (static::overlaps($ranges, $start, $end) === false) {
				$ranges[] = [$start, $end];
			}
		}

		usort($ranges, fn ($a, $b) => $a[0] <=> $b[0]);

		return $ranges;
	}

	private static function overlaps(array $ranges, int $start, int $end): bool
	{
		foreach ($ranges as [$s, $e]) {
			if ($start < $e && $end > $s) {
				return true;
			}
		}
		return false;
	}

	public static function findKirbyTagRanges(string $text): array
	{
		preg_match_all(
			'/(\([a-z0-9_-]+:)|(\()|(\))/i',
			$text,
			$matches,
			PREG_OFFSET_CAPTURE | PREG_SET_ORDER
		);

		$ranges = [];
		$level = 0;
		$inTag = false;
		$tagStart = -1;

		foreach ($matches as $match) {
			$isTagOpener = isset($match[1]) && $match[1][1] !== -1;
			$isParenOpen = isset($match[2]) && $match[2][1] !== -1;
			$isParenClose = isset($match[3]) && $match[3][1] !== -1;

			if ($inTag === false && $isTagOpener) {
				$inTag = true;
				$level = 1;
				$tagStart = $match[0][1];
			} elseif ($inTag && ($isTagOpener || $isParenOpen)) {
				$level++;
			} elseif ($inTag && $isParenClose) {
				$level--;
				if ($level === 0) {
					$ranges[] = [$tagStart, $match[0][1] + strlen($match[0][0])];
					$inTag = false;
					$tagStart = -1;
				}
			}
		}

		return $ranges;
	}

	private static function renderNode(array $node, ?array $parent, int $index): string
	{
		switch ($node['type'] ?? '') {
			case 'text':
				return static::encodeText($node['text'] ?? '', $node, $parent);

			case 'paragraph':
				$content = $node['content'] ?? [];
				if ($content === []) {
					$previous = $parent['content'][$index - 1] ?? null;
					$previousEmpty = $previous !== null
						&& ($previous['type'] ?? null) === 'paragraph'
						&& ($previous['content'] ?? []) === [];
					// &nbsp; keeps runs of empty paragraphs alive across reparses
					return $previousEmpty ? '&nbsp;' : '';
				}
				return static::renderInline($content, $node, '');

			case 'heading':
				if (isset($node['content']) === false) {
					return '';
				}
				$level = (int)($node['attrs']['level'] ?? 0) ?: 1;
				$content = static::renderInline($node['content'], $node, '');
				return str_repeat('#', $level) . ' ' . $content . (str_ends_with($content, '#') ? ' #' : '');

			case 'blockquote':
				$parts = [];
				foreach ($node['content'] ?? [] as $childIndex => $child) {
					$lines = explode("\n", static::renderNode($child, $node, $childIndex));
					$prefixed = array_map(
						fn ($line) => preg_match('/^' . self::WS . '*$/u', $line) === 1 ? '>' : '> ' . $line,
						$lines
					);
					$parts[] = implode("\n", $prefixed);
				}
				return implode("\n>\n", $parts);

			case 'codeBlock':
				$language = (string)($node['attrs']['language'] ?? '');
				if (isset($node['content']) === false) {
					return "```{$language}\n\n```";
				}
				$code = static::renderInline($node['content'], $node, '');
				preg_match_all('/^\s*(`+)/m', $code, $runs);
				$fence = str_repeat('`', max(3, ...array_map(fn ($run) => strlen($run) + 1, $runs[1] ?: [''])));
				return "{$fence}{$language}\n{$code}\n{$fence}";

			case 'horizontalRule':
				return '---';

			case 'hardBreak':
				return "  \n";

			case 'bulletList':
			case 'orderedList':
				if (isset($node['content']) === false) {
					return '';
				}
				return static::renderInline($node['content'], $node, "\n");

			case 'listItem':
				return static::renderListItem($node, $parent, $index);

			case 'rawSource':
			case 'rawMarkdownTable':
				$raw = '';
				foreach ($node['content'] ?? [] as $child) {
					$raw .= $child['text'] ?? '';
				}
				return $raw !== '' ? $raw : (string)($node['attrs']['raw'] ?? '');
		}

		return '';
	}

	/**
	 * A bare "-" straight after the parent item's text reads as a setext
	 * underline and turns that text into a heading. Nothing claims "*"
	 */
	private static function escapeNestedEmptyItem(array $child, string $rendered): string
	{
		if (($child['type'] ?? null) !== 'bulletList' || str_starts_with($rendered, '- ') === false) {
			return $rendered;
		}

		$firstLine = strtok($rendered, "\n");
		return rtrim((string)$firstLine) === '-' ? preg_replace('/^-(?= |$)/m', '*', $rendered) : $rendered;
	}

	/**
	 * A line opening with a block marker is read back as that block:
	 * "#tag" becomes a heading, "- x" a list, "---" a rule, ":--" a table
	 * and an indent a code block. Parsedown has no escape for "=" and ":"
	 */
	private static function escapeBlockStart(string $markdown): string
	{
		$markdown = ltrim($markdown, " \t");

		if (preg_match('/^=+[ \t]*(?:\n|$)/', $markdown) === 1) {
			return '&#61;' . substr($markdown, 1);
		}

		if (preg_match('/^:[-:| ]*(?:\n|$)/', $markdown) === 1) {
			return '&#58;' . substr($markdown, 1);
		}

		if (str_starts_with($markdown, '<')) {
			return '&lt;' . substr($markdown, 1);
		}

		if (preg_match('/^(?:#|>|\||-(?=[-\s|:]|$)|\+(?=\s|$))/', $markdown) === 1) {
			return '\\' . $markdown;
		}

		if (preg_match('/^(\d+)(?=[.)](?:\s|$))/', $markdown, $match) === 1) {
			return $match[1] . '\\' . substr($markdown, strlen($match[1]));
		}

		return $markdown;
	}

	private static function renderListItem(array $node, ?array $parent, int $index): string
	{
		if (($parent['type'] ?? null) === 'orderedList') {
			$start = (int)($parent['attrs']['start'] ?? 0) ?: 1;
			$type = $parent['attrs']['type'] ?? null;
			$prefix = static::listMarker(is_string($type) ? $type : null, $start + $index);
		} else {
			$prefix = '- ';
		}

		$children = $node['content'] ?? [];
		$first = array_shift($children);
		$output = $prefix . ($first === null ? '' : static::renderInline([$first], $node, ''));

		// Kirby's parser nests by the marker's own width, so "1. " needs three
		$width = str_repeat(' ', strlen($prefix));

		foreach (array_values($children) as $i => $child) {
			$childContent = static::renderNode($child, $node, $i + 1);
			$childContent = static::escapeNestedEmptyItem($child, $childContent);
			$indented = implode("\n", array_map(
				fn ($line) => $width . $line,
				explode("\n", $childContent)
			));
			$output .= (($child['type'] ?? null) === 'paragraph' ? "\n\n" : "\n") . $indented;
		}

		return $output;
	}

	// Only produced by parsing hand-typed markdown like "a. item"
	private static function listMarker(?string $type, int $position): string
	{
		return match ($type) {
			'a' => static::alphaMarker($position) . '. ',
			'A' => strtoupper(static::alphaMarker($position)) . '. ',
			'i' => static::romanMarker($position) . '. ',
			'I' => strtoupper(static::romanMarker($position)) . '. ',
			default => $position . '. ',
		};
	}

	private static function alphaMarker(int $num): string
	{
		$alpha = 'abcdefghijklmnopqrstuvwxyz';
		if ($num <= 26) {
			return $alpha[$num - 1];
		}
		$first = intdiv($num - 1, 26) - 1;
		$second = ($num - 1) % 26;
		return $alpha[$first] . $alpha[$second];
	}

	private static function romanMarker(int $num): string
	{
		$numerals = [
			1000 => 'm', 900 => 'cm', 500 => 'd', 400 => 'cd',
			100 => 'c', 90 => 'xc', 50 => 'l', 40 => 'xl',
			10 => 'x', 9 => 'ix', 5 => 'v', 4 => 'iv', 1 => 'i',
		];
		$result = '';
		foreach ($numerals as $value => $numeral) {
			while ($num >= $value) {
				$result .= $numeral;
				$num -= $value;
			}
		}
		return $result;
	}

	/**
	 * Renders a node array while tracking mark boundaries across text
	 * nodes, mirroring MarkdownManager.renderNodesWithMarkBoundaries
	 */
	private static function renderInline(array $nodes, ?array $parent, string $separator): string
	{
		$result = [];
		$activeMarks = [];
		$openingModes = [];
		$reopenHtml = [];
		$nodes = array_values($nodes);
		$count = count($nodes);
		$lineStart = ($parent['type'] ?? null) === 'paragraph';

		foreach ($nodes as $i => $node) {
			$next = $i < $count - 1 ? $nodes[$i + 1] : null;
			$type = $node['type'] ?? null;
			if ($type === null) {
				continue;
			}

			if ($type !== 'text') {
				$nodeMarkTypes = [];
				foreach ($node['marks'] ?? [] as $mark) {
					$nodeMarkTypes[$mark['type'] ?? ''] = true;
				}
				$reopen = [];
				$reopenModes = [];
				foreach ($activeMarks as $markType => $mark) {
					if (isset($nodeMarkTypes[$markType])) {
						$reopen[$markType] = $mark;
						$reopenModes[$markType] = $openingModes[$markType] ?? 'markdown';
					}
				}

				$before = '';
				foreach (array_reverse(array_keys($activeMarks)) as $markType) {
					$before = static::markClosing($markType, $openingModes[$markType] ?? 'markdown') . $before;
				}
				$activeMarks = [];
				$openingModes = [];

				$content = static::renderNode($node, $parent, $i);
				$lineStart = $type === 'hardBreak';
				if ($content === '' && $before === '' && $type !== 'paragraph') {
					continue;
				}

				// Hard breaks terminate marks instead of reopening them
				$after = '';
				if ($type !== 'hardBreak') {
					foreach ($reopen as $markType => $mark) {
						$mode = $reopenModes[$markType];
						$openingModes[$markType] = $mode;
						$after .= static::markOpening($markType, $mode);
						$activeMarks[$markType] = $mark;
					}
				}

				$result[] = $before . $content . $after;
				continue;
			}

			$text = static::encodeText($node['text'] ?? '', $node, $parent);
			if ($lineStart) {
				if (static::hasMark($node, 'kirbytagRaw')) {
					$lineStart = false;
				} elseif (static::hasMark($node, 'code')) {
					$text = ltrim($text, " \t");
					$lineStart = $text === '';
				} else {
					$text = static::escapeBlockStart($text);
					$lineStart = trim($text) === '';
				}
			}

			if (static::$escapeAll) {
				$result[] = static::htmlMarks($node, $text);
				continue;
			}

			$currentMarks = [];
			foreach ($node['marks'] ?? [] as $mark) {
				if (isset($mark['type'])) {
					$currentMarks[$mark['type']] = $mark;
				}
			}

			$marksToOpen = static::marksToOpen($activeMarks, $currentMarks, $next);
			$marksToClose = static::marksToClose($currentMarks, $next);
			$closingHere = array_values(array_filter(
				$marksToClose,
				fn ($markType) => isset($activeMarks[$markType])
			));
			// An active mark ending exactly where a new one opens: defer the
			// old closings past the new ones so delimiters nest, not interleave
			$crossed = $closingHere !== [] && $marksToOpen !== [];

			$middleTrailing = '';
			if ($marksToClose !== [] && $crossed === false) {
				if (preg_match('/(' . self::WS . '+)$/u', $text, $match) === 1) {
					$middleTrailing = $match[1];
					$text = substr($text, 0, strlen($text) - strlen($middleTrailing));
				}
			}

			if ($crossed === false) {
				foreach (array_reverse($marksToClose) as $markType) {
					if (isset($activeMarks[$markType]) === false) {
						continue;
					}
					$text .= static::markClosing($markType, $openingModes[$markType] ?? 'markdown');
					unset($activeMarks[$markType], $openingModes[$markType]);
				}
			}

			$leading = '';
			if ($marksToOpen !== []) {
				if (preg_match('/^(' . self::WS . '+)/u', $text, $match) === 1) {
					$leading = $match[1];
					$text = substr($text, strlen($leading));
				}
			}

			foreach ($marksToOpen as $entry) {
				$mode = isset($reopenHtml[$entry['type']]) ? 'html' : 'markdown';
				if ($mode === 'markdown' && $entry['type'] === 'italic'
					&& static::italicTouchesBold($nodes, $i, $result)
				) {
					$mode = 'underscore';
				}
				if ($mode === 'markdown' && $entry['type'] === 'code') {
					$code = '';
					for ($j = $i; isset($nodes[$j]) && static::hasMark($nodes[$j], 'code'); $j++) {
						$code .= $nodes[$j]['text'] ?? '';
					}
					$mode = static::codeDelimiter($code);
				}
				$text = static::markOpening($entry['type'], $mode) . $text;
				$openingModes[$entry['type']] = $mode;
				unset($reopenHtml[$entry['type']]);
			}

			if ($crossed === false) {
				foreach (array_reverse($marksToOpen) as $entry) {
					$activeMarks[$entry['type']] = $entry['mark'];
				}
			}

			$text = $leading . $text;

			if ($crossed) {
				$nextMarkTypes = [];
				foreach ($next['marks'] ?? [] as $mark) {
					$nextMarkTypes[$mark['type'] ?? ''] = true;
				}
				foreach ($marksToOpen as $entry) {
					if (isset($nextMarkTypes[$entry['type']], self::HTML_REOPEN[$entry['type']])) {
						$reopenHtml[$entry['type']] = true;
					}
				}
				$activeKeys = array_keys($activeMarks);
				$lifo = $closingHere;
				usort($lifo, fn ($a, $b) =>
					array_search($b, $activeKeys, true) <=> array_search($a, $activeKeys, true));
				$closeAtEnd = [
					...array_map(fn ($entry) => $entry['type'], $marksToOpen),
					...$lifo,
				];
			} else {
				$closeAtEnd = static::marksToCloseAtEnd($activeMarks, $currentMarks, $next);
			}

			$trailing = '';
			if ($closeAtEnd !== []) {
				if (preg_match('/(' . self::WS . '+)$/u', $text, $match) === 1) {
					$trailing = $match[1];
					$text = substr($text, 0, strlen($text) - strlen($trailing));
				}
			}

			foreach ($closeAtEnd as $markType) {
				$text .= static::markClosing($markType, $openingModes[$markType] ?? 'markdown');
				unset($activeMarks[$markType], $openingModes[$markType]);
			}

			$text .= $trailing . $middleTrailing;
			$result[] = $text;
		}

		return implode($separator, $result);
	}

	private static function marksToOpen(array $activeMarks, array $currentMarks, ?array $next): array
	{
		$open = [];
		foreach ($currentMarks as $markType => $mark) {
			$active = $activeMarks[$markType] ?? null;
			if (
				$active === null ||
				static::attrsEqual($active['attrs'] ?? null, $mark['attrs'] ?? null) === false
			) {
				$open[] = ['type' => $markType, 'mark' => $mark];
			}
		}

		if (count($open) <= 1) {
			return $open;
		}

		$nextMarks = $next['marks'] ?? [];
		$continues = function (string $markType, $attrs) use ($nextMarks): bool {
			foreach ($nextMarks as $mark) {
				if (($mark['type'] ?? null) === $markType && static::attrsEqual($mark['attrs'] ?? null, $attrs)) {
					return true;
				}
			}
			return false;
		};

		// Ending-here marks nest inner so delimiters cannot interleave
		$byRankInnerFirst = function (array $a, array $b): int {
			$rankA = self::MARK_RANKS[$a['type']] ?? PHP_INT_MAX;
			$rankB = self::MARK_RANKS[$b['type']] ?? PHP_INT_MAX;
			return $rankA !== $rankB ? $rankB <=> $rankA : strcmp($a['type'], $b['type']);
		};

		$ending = array_values(array_filter(
			$open,
			fn ($entry) => $continues($entry['type'], $entry['mark']['attrs'] ?? null) === false
		));
		$continuing = array_values(array_filter(
			$open,
			fn ($entry) => $continues($entry['type'], $entry['mark']['attrs'] ?? null)
		));
		usort($ending, $byRankInnerFirst);
		usort($continuing, $byRankInnerFirst);

		return [...$ending, ...$continuing];
	}

	private static function marksToClose(array $currentMarks, ?array $next): array
	{
		$close = [];
		foreach ($currentMarks as $markType => $mark) {
			if ($next === null) {
				$close[] = $markType;
				continue;
			}
			$found = false;
			foreach ($next['marks'] ?? [] as $nextMark) {
				if (
					($nextMark['type'] ?? null) === $markType &&
					static::attrsEqual($nextMark['attrs'] ?? null, $mark['attrs'] ?? null)
				) {
					$found = true;
					break;
				}
			}
			if ($found === false) {
				$close[] = $markType;
			}
		}
		return $close;
	}

	private static function marksToCloseAtEnd(array $activeMarks, array $currentMarks, ?array $next): array
	{
		$isLast = $next === null;
		$nextNoMarks = $next !== null && empty($next['marks']);
		$nextDifferent = false;
		if ($next !== null && isset($next['marks'])) {
			$nextMap = [];
			foreach ($next['marks'] as $mark) {
				if (isset($mark['type'])) {
					$nextMap[$mark['type']] = $mark;
				}
			}
			$nextDifferent = static::markSetsEqual($currentMarks, $nextMap) === false;
		}

		$close = [];
		if ($isLast || $nextNoMarks || $nextDifferent) {
			if ($next !== null && isset($next['marks'])) {
				foreach (array_reverse($activeMarks, true) as $markType => $activeMark) {
					$found = false;
					foreach ($next['marks'] as $nextMark) {
						if (
							($nextMark['type'] ?? null) === $markType &&
							static::attrsEqual($nextMark['attrs'] ?? null, $activeMark['attrs'] ?? null)
						) {
							$found = true;
							break;
						}
					}
					if ($found === false) {
						$close[] = $markType;
					}
				}
			} elseif ($isLast || $nextNoMarks) {
				$close = array_reverse(array_keys($activeMarks));
			}
		}

		return $close;
	}

	private static function markSetsEqual(array $a, array $b): bool
	{
		if (count($a) !== count($b)) {
			return false;
		}
		foreach ($a as $markType => $mark) {
			if (
				isset($b[$markType]) === false ||
				static::attrsEqual($mark['attrs'] ?? null, $b[$markType]['attrs'] ?? null) === false
			) {
				return false;
			}
		}
		return true;
	}

	private static function attrsEqual(mixed $a, mixed $b): bool
	{
		if ($a === $b) {
			return true;
		}
		if (!$a || !$b) {
			return false;
		}
		if (count($a) !== count($b)) {
			return false;
		}
		foreach ($a as $key => $value) {
			if (array_key_exists($key, $b) === false || $b[$key] !== $value) {
				return false;
			}
		}
		return true;
	}

	private static function encodeText(string $text, array $node, ?array $parent): string
	{
		$insideCode = isset(self::CODE_TYPES[$parent['type'] ?? '']);
		if ($insideCode === false) {
			foreach ($node['marks'] ?? [] as $mark) {
				if (isset(self::CODE_TYPES[$mark['type'] ?? ''])) {
					$insideCode = true;
					break;
				}
			}
		}
		if ($insideCode) {
			return $text;
		}

		if (static::$escapeAll) {
			return static::escapeAllCharacters($text);
		}

		// Only an entity-shaped "&" needs escaping; Parsedown passes those
		// through and escapes every other ampersand itself
		$text = preg_replace('/&(?=#?+[0-9a-zA-Z]++;)/', '&amp;', $text);
		$text = preg_replace('/<(?=[\w\/!]|[^\s>]*(?:@|$))/', '&lt;', $text);
		$text = preg_replace('/([\\\\`*_\[\]~])/', '\\\\$1', $text);
		return preg_replace_callback('/\n([^\n]*)/', fn ($line) => "\n" . static::escapeBlockStart($line[1]), $text);
	}

	private static function hasMark(array $node, string $type): bool
	{
		foreach ($node['marks'] ?? [] as $mark) {
			if (($mark['type'] ?? null) === $type) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Against bold, italic asterisks make a run of three no parser can split.
	 * An underscore is safe here: its neighbour is punctuation
	 */
	private static function italicTouchesBold(array $nodes, int $index, array $result): bool
	{
		$before = $result === [] ? '' : (string)end($result);
		if ($before !== '' && str_ends_with($before, '*')) {
			return true;
		}

		$count = count($nodes);
		$at = $index;
		while ($at < $count && static::hasMark($nodes[$at], 'italic')) {
			$at++;
		}

		$after = $nodes[$at] ?? null;
		if ($after === null || static::hasMark($after, 'bold') === false) {
			return false;
		}

		return preg_match('/^' . self::WS . '/u', (string)($after['text'] ?? '')) !== 1;
	}

	private static function htmlMarks(array $node, string $text): string
	{
		preg_match('/^([ \t]*)(.*?)([ \t]*)$/s', $text, $parts);
		[, $leading, $text, $trailing] = $parts;
		if ($text === '') {
			return $leading . $trailing;
		}
		if (static::hasMark($node, 'code')) {
			$text = '<code>' . static::escapeAllCharacters($text) . '</code>';
		}
		foreach (array_reverse(self::HTML_TAGS) as $markType => $tag) {
			if (static::hasMark($node, $markType)) {
				$text = '<' . $tag . '>' . $text . '</' . $tag . '>';
			}
		}
		return $leading . $text . $trailing;
	}

	private static function escapeAllCharacters(string $text): string
	{
		return preg_replace_callback(
			'/[!-\/:-@\[-`{-~\t]/',
			fn ($match) => str_contains(self::ESCAPABLE, $match[0]) ? '\\' . $match[0] : '&#' . ord($match[0]) . ';',
			$text
		);
	}

	private static function codeDelimiter(string $code): string
	{
		$code = trim($code, " \t");
		preg_match_all('/`+/', $code, $runs);
		$delimiter = str_repeat('`', max(0, ...array_map('strlen', $runs[0] ?: [''])) + 1);
		return $delimiter . (str_starts_with($code, '`') || str_ends_with($code, '`') ? ' ' : '');
	}

	private static function markOpening(string $markType, string $mode): string
	{
		if ($markType === 'code' && str_starts_with($mode, '`')) {
			return $mode;
		}
		if ($mode === 'html') {
			return self::HTML_REOPEN[$markType][0] ?? '';
		}
		if ($mode === 'underscore') {
			return '_';
		}
		return self::MARK_DELIMITER[$markType] ?? '';
	}

	private static function markClosing(string $markType, string $mode): string
	{
		if ($markType === 'code' && str_starts_with($mode, '`')) {
			return strrev($mode);
		}
		if ($mode === 'html') {
			return self::HTML_REOPEN[$markType][1] ?? '';
		}
		if ($mode === 'underscore') {
			return '_';
		}
		return self::MARK_DELIMITER[$markType] ?? '';
	}

	private static function isEmptyOutput(string $markdown): bool
	{
		if (preg_match('/^' . self::WS . '*$/u', $markdown) === 1) {
			return true;
		}
		$cleaned = str_replace('&nbsp;', '', $markdown);
		$cleaned = preg_replace('/\x{00a0}/u', '', $cleaned);
		$cleaned = preg_replace('/^' . self::WS . '+|' . self::WS . '+$/u', '', $cleaned);
		return $cleaned === '';
	}
}
