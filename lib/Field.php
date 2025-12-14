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
			if (!isset($field['label'])) {
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
			'highlights' => function () {
				return option('medienbaecker.tiptap.highlights');
			},
			'customButtons' => function () {
				return option('medienbaecker.tiptap.buttons');
			},
			'kirbytags' => function () {
				return array_keys($this->kirby()->extensions('tags'));
			},
			'links' => function ($links = []) {
				if (isset($links['fields']) && is_array($links['fields'])) {
					$links['fields'] = \Medienbaecker\Tiptap\Field::processDialogFields($links['fields']);
				}
				return $links;
			},
			'files' => function ($files = []) {
				if (isset($files['fields']) && is_array($files['fields'])) {
					$files['fields'] = \Medienbaecker\Tiptap\Field::processDialogFields($files['fields']);
				}
				return $files;
			},
			'uploads' => function ($uploads = false) {
				// Handle upload configuration similar to textarea field
				if ($uploads === false) {
					return false;
				}

				if ($uploads === true) {
					return ['accept' => '*'];
				}

				if (is_string($uploads)) {
					return ['template' => $uploads, 'accept' => '*'];
				}

				if (is_array($uploads)) {
					return array_merge(['accept' => '*'], $uploads);
				}

				return ['accept' => '*'];
			},
			'uuid' => function () {
				return static::getUuidConfig();
			},
		];
	}
}
