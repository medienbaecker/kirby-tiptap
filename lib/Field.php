<?php

namespace Medienbaecker\Tiptap;

/**
 * Tiptap field helpers
 */
class Field
{
	/**
	 * Save transform for markdown fields: Tiptap JSON becomes markdown.
	 * Inexpressible docs stay JSON and converge on a later save
	 */
	public static function store($value, string $format, bool $inline, \Kirby\Cms\App $kirby)
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
