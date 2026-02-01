<?php

@include_once __DIR__ . '/vendor/autoload.php';

use Kirby\Cms\App as Kirby;
use Kirby\Toolkit\A;
use Kirby\Filesystem\Dir;
use Kirby\Filesystem\F;
use Kirby\Data\Json;
use Kirby\CLI\CLI;
use Medienbaecker\Tiptap\Field;
use Medienbaecker\Tiptap\Validations;
use Medienbaecker\Tiptap\Api;
use Medienbaecker\Tiptap\TextareaConverter;

Kirby::plugin('medienbaecker/tiptap', [
	'options' => [
		'highlights' => [],
		'buttons' => []
	],
	'blueprints' => [
		'blocks/tiptap' => __DIR__ . '/blueprints/blocks/tiptap.yml',
	],
	'snippets' => [
		'blocks/tiptap' => __DIR__ . '/snippets/blocks/tiptap.php',
		// Tiptap HTML rendering snippets
		'tiptap/doc' => __DIR__ . '/snippets/tiptap/doc.php',
		'tiptap/text' => __DIR__ . '/snippets/tiptap/text.php',
		'tiptap/paragraph' => __DIR__ . '/snippets/tiptap/paragraph.php',
		'tiptap/hardBreak' => __DIR__ . '/snippets/tiptap/hardBreak.php',
		'tiptap/heading' => __DIR__ . '/snippets/tiptap/heading.php',
		'tiptap/bold' => __DIR__ . '/snippets/tiptap/bold.php',
		'tiptap/italic' => __DIR__ . '/snippets/tiptap/italic.php',
		'tiptap/strike' => __DIR__ . '/snippets/tiptap/strike.php',
		'tiptap/code' => __DIR__ . '/snippets/tiptap/code.php',
		'tiptap/bulletList' => __DIR__ . '/snippets/tiptap/bulletList.php',
		'tiptap/orderedList' => __DIR__ . '/snippets/tiptap/orderedList.php',
		'tiptap/listItem' => __DIR__ . '/snippets/tiptap/listItem.php',
		'tiptap/blockquote' => __DIR__ . '/snippets/tiptap/blockquote.php',
		'tiptap/codeBlock' => __DIR__ . '/snippets/tiptap/codeBlock.php',
		'tiptap/horizontalRule' => __DIR__ . '/snippets/tiptap/horizontalRule.php',
		'tiptap/taskList' => __DIR__ . '/snippets/tiptap/taskList.php',
		'tiptap/taskItem' => __DIR__ . '/snippets/tiptap/taskItem.php',
		'tiptap/kirbyTag' => __DIR__ . '/snippets/tiptap/kirbyTag.php',
		'tiptap/inline' => __DIR__ . '/snippets/tiptap/inline.php',
	],
	'fields' => [
		'tiptap' => [
			'mixins' => [
				'filepicker',
			],
			'props' => Field::props(),
			'validations' => Validations::rules(),
			'api' => function () {
				return Api::endpoints();
			}
		]
	],
	'fieldMethods' => [
		'tiptapText' => function ($field, array $options = []) {
			// Add custom buttons from plugin configuration
			if (!isset($options['customButtons'])) {
				$options['customButtons'] = option('medienbaecker.tiptap.buttons', []);
			}

			// UUID configuration
			if (!isset($options['uuid'])) {
				$options['uuid'] = Field::getUuidConfig();
			}

			$field->value = convertTiptapToHtml(
				$field->value,
				$field->parent(),
				$options
			);

			return $field;
		}
	],
	'translations' => A::keyBy(
		A::map(
			Dir::files(__DIR__ . '/translations'),
			function ($file) {
				$translations = [];
				foreach (Json::read(__DIR__ . '/translations/' . $file) as $key => $value) {
					$translations["tiptap.{$key}"] = $value;
				}

				return A::merge(
					['lang' => F::name($file)],
					$translations
				);
			}
		),
		'lang'
	),
	'commands' => [
		'tiptap:convert' => [
			'description' => 'Convert textarea fields to Tiptap JSON format',
			'args' => [
				'page' => [
					'longPrefix' => 'page',
					'description' => 'Convert only this page and its children (e.g., "blog" or "projects/project-a")',
					'defaultValue' => null,
				],
				'dry-run' => [
					'longPrefix' => 'dry-run',
					'description' => 'Preview changes without updating files',
					'defaultValue' => false,
					'noValue' => true,
				],
			],
			'command' => static function (CLI $cli): void {
				$converter = new TextareaConverter($cli);
				$converter->run();
			}
		]
	]
]);
