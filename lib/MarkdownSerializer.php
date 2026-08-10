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

	// code: true extensions; their text bypasses escaping
	private const CODE_TYPES = [
		'code' => true,
		'codeBlock' => true,
		'kirbytagRaw' => true,
	];

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
		'rawMarkdownTable' => ['raw' => true],
		'link' => ['href' => true],
	];

	private const INDENT = '  ';

	// JavaScript's \s (unicode) for whitespace parity with the Panel
	private const WS_CHARS = ' \t\n\r\f\x0B\x{00a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}';
	private const WS = '[' . self::WS_CHARS . ']';

	public static function serialize(array $doc, ?array $kirbytags = null, bool $inline = false): string
	{
		if ($inline) {
			$doc = static::flattenInline($doc);
		}

		$doc = static::transform($doc);
		$doc = static::protect($doc, $kirbytags);

		$markdown = static::renderInline($doc['content'] ?? [], $doc, "\n\n");

		return static::isEmptyOutput($markdown) ? '' : $markdown;
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
			} else {
				static::collectUnsupportedAttrs($markType, $mark['attrs'] ?? [], $found);
			}
		}
		foreach ($node['content'] ?? [] as $child) {
			static::collectUnsupported($child, $found);
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
		if (isset($node['content']) === false || ($node['type'] ?? null) === 'codeBlock') {
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
		$result = [];
		$count = count($nodes);

		for ($i = 0; $i < $count; $i++) {
			$node = $nodes[$i];

			if (($node['type'] ?? null) === 'hardBreak') {
				if ($inHeading) {
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
				$result[] = static::rawText(static::linkTag($href, $text));
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

	/**
	 * Mirrors generateLinkTag() in src/utils/inputValidation.ts
	 */
	public static function linkTag(string $href, string $text): string
	{
		if (str_starts_with($href, 'mailto:')) {
			$name = 'email';
			$value = substr($href, 7);
		} elseif (str_starts_with($href, 'tel:')) {
			$name = 'tel';
			$value = substr($href, 4);
		} else {
			$name = 'link';
			$value = $href;
		}

		if ($text === '' || $text === $value || $text === $href) {
			return "({$name}: {$value})";
		}

		return "({$name}: {$value} text: " . preg_replace('/[()]/', '\\\\$0', $text) . ')';
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
		if (isset($node['content']) === false || ($node['type'] ?? null) === 'codeBlock') {
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

		$ranges = [];
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
			$ranges[] = $range;
		}

		preg_match_all(
			'/https?:\/\/[^<>' . self::WS_CHARS . ']+/u',
			$text,
			$matches,
			PREG_OFFSET_CAPTURE
		);
		foreach ($matches[0] as [$url, $start]) {
			$end = $start + strlen(preg_replace('/[.,;:!?\'"]+$/', '', $url));
			$overlaps = false;
			foreach ($ranges as [$s, $e]) {
				if ($start < $e && $end > $s) {
					$overlaps = true;
					break;
				}
			}
			if ($overlaps === false) {
				$ranges[] = [$start, $end];
			}
		}

		usort($ranges, fn ($a, $b) => $a[0] <=> $b[0]);

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
				return str_repeat('#', $level) . ' ' . static::renderInline($node['content'], $node, '');

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
				return "```{$language}\n" . static::renderInline($node['content'], $node, '') . "\n```";

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

			case 'rawMarkdownTable':
				return (string)($node['attrs']['raw'] ?? '');
		}

		return '';
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

		foreach (array_values($children) as $i => $child) {
			$childContent = static::renderNode($child, $node, $i + 1);
			$indented = implode("\n", array_map(
				fn ($line) => self::INDENT . $line,
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

		$text = str_replace(['&', '<', '>'], ['&amp;', '&lt;', '&gt;'], $text);
		return preg_replace('/([\\\\`*_\[\]~])/', '\\\\$1', $text);
	}

	private static function markOpening(string $markType, string $mode): string
	{
		if ($mode === 'html') {
			return self::HTML_REOPEN[$markType][0] ?? '';
		}
		return self::MARK_DELIMITER[$markType] ?? '';
	}

	private static function markClosing(string $markType, string $mode): string
	{
		if ($mode === 'html') {
			return self::HTML_REOPEN[$markType][1] ?? '';
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
