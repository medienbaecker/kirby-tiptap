<?php

namespace Medienbaecker\Tiptap;

use Kirby\Cms\Blueprint;
use Kirby\Toolkit\Str;

/**
 * Tiptap field configuration and props
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

	/**
	 * Process dialog fields - resolves extends and adds auto-labels
	 * @param array $fields Field definitions from blueprint
	 * @return array Processed field definitions
	 */
	public static function processDialogFields(array $fields): array
	{
		$processed = [];

		foreach ($fields as $name => $field) {
			// Skip if field is null/false
			if (!$field) {
				continue;
			}

			// Resolve extends
			$field = Blueprint::extend($field);

			// Auto-generate label from field name if not set
			if (empty($field['label'])) {
				$field['label'] = method_exists(Str::class, 'label')
					? Str::label($name)
					: ucfirst(str_replace('_', ' ', $name));
			}

			$processed[$name] = $field;
		}

		return $processed;
	}

	/**
	 * Get field props configuration
	 */
	public static function props(): array
	{
		return [
			'size' => function ($size = 'auto') {
				return $size;
			},
			'spellcheck' => function ($spellcheck = true) {
				return $spellcheck;
			},
			'inline' => function ($inline = false) {
				return $inline;
			},
			'format' => function ($format = null) {
				// Blueprint value wins over the global config option
				$format ??= option('medienbaecker.tiptap.format', 'json');
				if (in_array($format, ['json', 'markdown'], true) === false) {
					throw new \Kirby\Exception\InvalidArgumentException(
						message: 'Invalid tiptap format "' . $format . '", expected "json" or "markdown"'
					);
				}
				return $format;
			},
			'pretty' => function ($pretty = false) {
				return $pretty;
			},
			'minlength' => function ($minlength = null) {
				return $minlength;
			},
			'maxlength' => function ($maxlength = null) {
				return $maxlength;
			},
			'buttons' => function ($buttons = [
				['headings' => [1, 2, 3]],
				'|',
				'bold',
				'italic',
				'|',
				'link',
				'file',
				'|',
				'bulletList',
				'orderedList'
			]) {
				if ($buttons === false) return [];
				return $buttons;
			},
			'kirbytags' => function () {
				return Field::kirbytags($this->kirby());
			},
			'links' => function ($links = []) {
				if (isset($links['fields']) && is_array($links['fields'])) {
					// Explicit class: Kirby calls prop closures with Closure::call(),
					// which rebinds static:: to the field class
					$links['fields'] = Field::processDialogFields($links['fields']);
				}
				return $links;
			},
			'files' => function ($files = []) {
				if (is_string($files) === true) {
					return ['query' => $files];
				}
				if (is_array($files) === false) {
					$files = [];
				}
				if (isset($files['fields']) && is_array($files['fields'])) {
					$files['fields'] = Field::processDialogFields($files['fields']);
				}
				return $files;
			},
			'uuid' => function () {
				return Field::getUuidConfig();
			},
		];
	}
}
