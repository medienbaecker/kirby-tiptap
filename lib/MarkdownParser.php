<?php

declare(strict_types=1);

namespace Medienbaecker\Tiptap;

class MarkdownParser
{
	private const MARKS = [
		'strong' => 'bold',
		'b' => 'bold',
		'em' => 'italic',
		'i' => 'italic',
		'del' => 'strike',
		's' => 'strike',
	];

	private const HEADINGS = ['h1' => 1, 'h2' => 2, 'h3' => 3, 'h4' => 4, 'h5' => 5, 'h6' => 6];

	private const BLOCK_TYPES = ['paragraph', 'heading', 'blockquote', 'codeBlock',
		'horizontalRule', 'bulletList', 'orderedList', 'taskList', 'rawSource'];

	private const BUTTON_NODES = [
		'blockquote' => 'blockquote',
		'codeBlock' => 'codeBlock',
		'bulletList' => 'bulletList',
		'orderedList' => 'orderedList',
		'horizontalRule' => 'horizontalRule',
	];

	public function __construct(private ParsedownTree $parsedown) {}

	public static function parse(string $markdown, array $buttons, array $options = []): array
	{
		$parser = new static(static::parsedown(static::disabled($buttons), $options));
		return [
			'type' => 'doc',
			'content' => $parser->wrap($parser->blocks($parser->parsedown->blocks($markdown))),
		];
	}

	// Kirby's defaults, not Parsedown's: breaks is true
	private static function parsedown(array $disabled, array $options): ParsedownTree
	{
		$options = [...['breaks' => true, 'extra' => false, 'safe' => false], ...$options];

		$parsedown = $options['extra'] === true
			? new TiptapParsedownExtra()
			: new TiptapParsedown();

		$parsedown->setBreaksEnabled($options['breaks']);
		$parsedown->setSafeMode($options['safe']);
		$parsedown->setDisabled($disabled);

		return $parsedown;
	}

	private static function disabled(array $buttons): array
	{
		$names = [];
		$headings = false;
		foreach ($buttons as $button) {
			if (is_string($button)) {
				$names[$button] = true;
				continue;
			}
			if (is_array($button) === false) {
				continue;
			}
			if (array_key_exists('headings', $button)) {
				$headings = true;
			}
			if (isset($button['type']) && is_string($button['type'])) {
				$names[$button['type']] = true;
			}
		}

		$off = [];
		if ($headings === false) {
			$off['heading'] = true;
		}
		foreach ([...array_keys(self::BUTTON_NODES), 'bold', 'italic', 'strike', 'code'] as $name) {
			if (isset($names[$name]) === false) {
				$off[self::BUTTON_NODES[$name] ?? $name] = true;
			}
		}
		return $off;
	}

	private function off(string $construct): bool
	{
		return $this->parsedown->isDisabled($construct);
	}

	private function resolve(array $element): array
	{
		if (isset($element['handler']) === false) {
			return $element['elements'] ?? (isset($element['element']) ? [$element['element']] : []);
		}
		$handler = $element['handler'];
		$resolved = $this->parsedown->call(
			is_array($handler) ? $handler['function'] : $handler,
			is_array($handler) ? $handler['argument'] : ($element['text'] ?? '')
		);
		return is_array($resolved) ? $resolved : [];
	}

	private function source(array $element): ?string
	{
		return isset($element['_src']) ? rtrim((string)$element['_src']) : null;
	}

	private function rawBlock(array $element): ?array
	{
		$source = $this->source($element);
		return $source === null ? null : $this->sourceBlock($source);
	}

	private function sourceBlock(string $source): array
	{
		return [
			'type' => 'rawSource',
			'content' => [['type' => 'text', 'text' => $source]],
		];
	}

	private function textNode(string $text, array $marks): array
	{
		return ['type' => 'text', 'text' => $text] + ($marks !== [] ? ['marks' => $marks] : []);
	}

	private function merge(array $nodes): array
	{
		$out = [];
		foreach ($nodes as $node) {
			$last = $out === [] ? null : array_key_last($out);
			if (
				$last !== null
				&& ($node['type'] ?? '') === 'text'
				&& ($out[$last]['type'] ?? '') === 'text'
				&& ($node['marks'] ?? []) == ($out[$last]['marks'] ?? [])
			) {
				$out[$last]['text'] .= $node['text'];
				continue;
			}
			$out[] = $node;
		}
		return $out;
	}

	private function breaks(array $nodes): array
	{
		$nodes = $this->merge($nodes);
		$out = [];
		$afterBreak = false;
		foreach ($nodes as $node) {
			if (($node['type'] ?? '') === 'hardBreak') {
				$afterBreak = true;
				$out[] = $node;
				continue;
			}
			if ($afterBreak && ($node['type'] ?? '') === 'text' && str_starts_with((string)$node['text'], "\n")) {
				$node['text'] = substr((string)$node['text'], 1);
				if ($node['text'] === '') {
					$afterBreak = false;
					continue;
				}
			}
			$afterBreak = false;
			$out[] = $node;
		}
		return $this->merge($out);
	}

	private function plain(array $nodes): array
	{
		if (count($nodes) === 1 && ($nodes[0]['type'] ?? '') === 'hardBreak') {
			return [$this->textNode((string)($nodes[0]['_raw'] ?? '<br>'), [])];
		}
		foreach ($nodes as $index => $node) {
			unset($nodes[$index]['_raw']);
		}
		return array_values($nodes);
	}

	private function inline(array $elements, array $marks = []): array
	{
		$out = [];
		foreach ($elements as $element) {
			if (isset($element['rawHtml'])) {
				$html = (string)$element['rawHtml'];
				if (preg_match('/^<br\s*\/?>$/i', $html) === 1) {
					$out[] = ['type' => 'hardBreak', '_raw' => $html];
					continue;
				}
				$out[] = isset($element['_protect'])
					? $this->textNode($html, [...$marks, ['type' => 'kirbytagRaw']])
					: $this->textNode($html, $marks);
				continue;
			}

			$name = $element['name'] ?? null;

			if ($name === null) {
				if (array_key_exists('text', $element)) {
					if ($element['text'] !== '') {
						$out[] = $this->textNode((string)$element['text'], $marks);
					}
					continue;
				}
				foreach ($this->inline($element['elements'] ?? [], $marks) as $node) {
					$out[] = $node;
				}
				continue;
			}

			if (isset(self::MARKS[$name])) {
				$next = [...$marks, ['type' => self::MARKS[$name]]];
				foreach ($this->inline($this->resolve($element), $next) as $node) {
					$out[] = $node;
				}
				continue;
			}

			if ($name === 'code') {
				$out[] = $this->textNode((string)($element['text'] ?? ''), [...$marks, ['type' => 'code']]);
				continue;
			}

			if ($name === 'br') {
				$out[] = ['type' => 'hardBreak'];
				continue;
			}

			if ($name === 'a') {
				$href = (string)($element['attributes']['href'] ?? '');
				$label = '';
				foreach ($this->inline($this->resolve($element)) as $node) {
					$label .= $node['text'] ?? '';
				}
				$attrs = $element['attributes'] ?? [];
				unset($attrs['href']);
				$out[] = $this->textNode(
					MarkdownSerializer::linkTag($href, $label, $attrs),
					[...$marks, ['type' => 'kirbytagRaw']]
				);
				continue;
			}

			foreach ($this->inline($this->resolve($element), $marks) as $node) {
				$out[] = $node;
			}
		}
		return $out;
	}

	private function blocks(array $elements): array
	{
		$out = [];
		foreach ($elements as $element) {
			$name = $element['name'] ?? null;

			// A reference definition leaves nothing behind
			if (
				$name === null
				&& isset($element['rawHtml']) === false
				&& isset($element['elements']) === false
				&& isset($element['handler']) === false
				&& array_key_exists('text', $element) === false
			) {
				continue;
			}

			if ($name === null && isset($element['rawHtml'])) {
				$out[] = $this->sourceBlock(rtrim((string)$element['rawHtml']));
				continue;
			}

			if ($name === 'p' || $name === null) {
				$content = $this->plain($this->breaks($this->inline($this->resolve($element))));
				$out[] = ['type' => 'paragraph'] + ($content !== [] ? ['content' => $content] : []);
				continue;
			}

			if (isset(self::HEADINGS[$name])) {
				if ($this->off('heading') && ($raw = $this->rawBlock($element)) !== null) {
					$out[] = $raw;
					continue;
				}
				$out[] = [
					'type' => 'heading',
					'attrs' => ['level' => self::HEADINGS[$name]],
					'content' => $this->plain($this->breaks($this->inline($this->resolve($element)))),
				];
				continue;
			}

			if ($name === 'blockquote') {
				if ($this->off('blockquote') && ($raw = $this->rawBlock($element)) !== null) {
					$out[] = $raw;
					continue;
				}
				$out[] = ['type' => 'blockquote', 'content' => $this->wrap($this->blocks($this->resolve($element)))];
				continue;
			}

			if ($name === 'hr') {
				if ($this->off('horizontalRule') && ($raw = $this->rawBlock($element)) !== null) {
					$out[] = $raw;
					continue;
				}
				$out[] = ['type' => 'horizontalRule'];
				continue;
			}

			if ($name === 'pre') {
				if ($this->off('codeBlock') && ($raw = $this->rawBlock($element)) !== null) {
					$out[] = $raw;
					continue;
				}
				$code = $element['element'] ?? [];
				$class = (string)($code['attributes']['class'] ?? '');
				$text = (string)($code['text'] ?? '');
				$out[] = [
					'type' => 'codeBlock',
					'attrs' => ['language' => str_starts_with($class, 'language-') ? substr($class, 9) : null],
				] + ($text !== '' ? ['content' => [['type' => 'text', 'text' => $text]]] : []);
				continue;
			}

			if ($name === 'ul' || $name === 'ol') {
				$construct = $name === 'ul' ? 'bulletList' : 'orderedList';
				if ($this->off($construct) && ($raw = $this->rawBlock($element)) !== null) {
					$out[] = $raw;
					continue;
				}

				$items = [];
				foreach ($element['elements'] ?? [] as $item) {
					$inner = $this->wrap($this->blocks($this->resolve($item)));
					$items[] = $inner !== [] ? $inner : [['type' => 'paragraph']];
				}

				if ($name === 'ol') {
					$out[] = [
						'type' => 'orderedList',
						'attrs' => ['start' => (int)($element['attributes']['start'] ?? 1)],
						'content' => array_map(fn ($content) => ['type' => 'listItem', 'content' => $content], $items),
					];
					continue;
				}

				foreach ($this->lists($items) as $list) {
					$out[] = $list;
				}
				continue;
			}

			if (($raw = $this->rawBlock($element)) !== null) {
				$out[] = $raw;
				continue;
			}

			$out[] = ['type' => 'paragraph', 'content' => $this->inline($this->resolve($element))];
		}
		return $out;
	}

	// Parsedown has no task list syntax, so "[ ] " reaches us as plain text
	private function checkbox(array $content): ?bool
	{
		$first = $content[0]['content'][0] ?? null;
		if (($content[0]['type'] ?? '') !== 'paragraph' || ($first['type'] ?? '') !== 'text') {
			return null;
		}
		if (preg_match('/^\[([ xX])\]\s+/', (string)$first['text'], $match) !== 1) {
			return null;
		}
		return $match[1] !== ' ';
	}

	private function strip(array $content): array
	{
		$content[0]['content'][0]['text'] = preg_replace(
			'/^\[[ xX]\]\s+/',
			'',
			(string)$content[0]['content'][0]['text']
		);
		return $content;
	}

	private function lists(array $items): array
	{
		$out = [];
		$run = [];
		$runIsTask = null;

		$flush = function () use (&$out, &$run, &$runIsTask): void {
			if ($run === []) {
				return;
			}
			$out[] = ['type' => $runIsTask ? 'taskList' : 'bulletList', 'content' => $run];
			$run = [];
		};

		foreach ($items as $content) {
			$checked = $this->checkbox($content);
			$isTask = $checked !== null;
			if ($runIsTask !== null && $isTask !== $runIsTask) {
				$flush();
			}
			$runIsTask = $isTask;
			$run[] = $isTask
				? ['type' => 'taskItem', 'attrs' => ['checked' => $checked], 'content' => $this->strip($content)]
				: ['type' => 'listItem', 'content' => $content];
		}
		$flush();

		return $out;
	}

	private function wrap(array $nodes): array
	{
		$out = [];
		$loose = [];
		foreach ($nodes as $node) {
			if (in_array($node['type'], self::BLOCK_TYPES, true)) {
				if ($loose !== []) {
					$out[] = ['type' => 'paragraph', 'content' => $loose];
					$loose = [];
				}
				$out[] = $node;
			} else {
				$loose[] = $node;
			}
		}
		if ($loose !== []) {
			$out[] = ['type' => 'paragraph', 'content' => $loose];
		}
		return $out;
	}
}
