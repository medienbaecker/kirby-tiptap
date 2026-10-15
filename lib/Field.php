<?php

namespace Medienbaecker\Tiptap;

/**
 * Tiptap field configuration and props
 */
class Field
{
	public const DEFAULT_BUTTONS = [
		['headings' => [1, 2, 3]],
		'|',
		'bold',
		'italic',
		'|',
		'link',
		'file',
		'|',
		'bulletList',
		'orderedList',
	];

	/**
	 * Save transform for markdown fields: Tiptap JSON becomes markdown.
	 * Inexpressible docs stay JSON and converge on a later save
	 */
	public static function store(mixed $value, string $format, bool $inline, \Kirby\Cms\App $kirby)
	{
		if ($format !== 'markdown' || is_string($value) === false || trim($value) === '') {
			return $value;
		}

		$decoded = json_decode($value, true);
		if (is_array($decoded) === false || ($decoded['type'] ?? null) !== 'doc') {
			return $value;
		}

		if (MarkdownSerializer::findUnsupportedNodes($decoded) !== []) {
			return $value;
		}

		return MarkdownSerializer::serialize($decoded, static::kirbytags($kirby), $inline);
	}

	/**
	 * Load transform for markdown fields: the mirror of store()
	 */
	public static function load(mixed $value, string $format, array $buttons, \Kirby\Cms\App $kirby): mixed
	{
		if (is_string($value) === false || trim($value) === '') {
			return $value;
		}

		$decoded = json_decode($value, true);
		if (is_array($decoded) === true && ($decoded['type'] ?? null) === 'doc') {
			return static::rename($decoded, $value);
		}

		if ($format !== 'markdown') {
			return $value;
		}

		return json_encode(MarkdownParser::parse($value, $buttons, [
			'breaks' => $kirby->option('markdown.breaks', true),
			'extra' => $kirby->option('markdown.extra', false),
			'safe' => $kirby->option('markdown.safe', false),
		]), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
	}

	/**
	 * The editor drops a node type it does not know, so a document stored under
	 * the old name would lose its content
	 */
	private static function rename(array $doc, string $original): string
	{
		$renamed = false;

		$walk = function (array $node) use (&$walk, &$renamed): array {
			if (($node['type'] ?? null) === 'rawMarkdownTable') {
				$node['type'] = 'rawSource';
				$renamed = true;
			}
			if (isset($node['content']) && is_array($node['content'])) {
				$node['content'] = array_map($walk, $node['content']);
			}
			return $node;
		};

		$doc = $walk($doc);

		return $renamed
			? json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
			: $original;
	}

	/**
	 * Map of tag name => registered attribute names, so the Panel and
	 * the CLI converter split attributes exactly like KirbyTag::parse()
	 */
	public static function kirbytags(\Kirby\Cms\App $kirby): array
	{
		$tags = [];
		foreach ($kirby->extensions('tags') as $name => $tag) {
			$tags[$name] = $tag['attr'] ?? [];
		}
		return $tags;
	}

	/**
	 * Get UUID configuration from plugin options
	 * @return array UUID configuration with 'pages' and 'files' keys
	 */
	public static function getUuidConfig(): array
	{
		$globalUuid = option('content.uuid', true); // Kirby's global UUID setting
		$pluginConfig = option('medienbaecker.tiptap.uuid');

		// If no plugin config, use global setting for both
		if ($pluginConfig === null) {
			return [
				'pages' => $globalUuid !== false,
				'files' => $globalUuid !== false
			];
		}

		// If simple boolean, apply to both
		if (is_bool($pluginConfig)) {
			return [
				'pages' => $pluginConfig,
				'files' => $pluginConfig
			];
		}

		// If array, use individual settings with global fallback
		return [
			'pages' => $pluginConfig['pages'] ?? ($globalUuid !== false),
			'files' => $pluginConfig['files'] ?? ($globalUuid !== false)
		];
	}
}
