<?php

@include_once __DIR__ . '/vendor/autoload.php';

use Kirby\Cms\App as Kirby;
use Kirby\Toolkit\A;
use Kirby\Filesystem\Dir;
use Kirby\Filesystem\F;
use Kirby\Data\Json;
use Kirby\CLI\CLI;
use Medienbaecker\Tiptap\Field;
use Medienbaecker\Tiptap\TiptapField;
use Medienbaecker\Tiptap\Converter;

Kirby::plugin('medienbaecker/tiptap', [
	'options' => [
		'uuid' => null,
		'format' => 'json',
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
		'tiptap' => TiptapField::class
	],
	'fieldMethods' => [
		'tiptapText' => function ($field, array $options = []) {
			// UUID configuration
			if (!isset($options['uuid'])) {
				$options['uuid'] = Field::getUuidConfig();
			}

			return $field->value(convertTiptapToHtml(
				$field->value,
				$field->parent(),
				$options
			));
		}
	],
	'translations' => (function () {
		$translations = A::keyBy(
			A::map(
				Dir::files(__DIR__ . '/translations'),
				function ($file) {
					$strings = [];
					foreach (Json::read(__DIR__ . '/translations/' . $file) as $key => $value) {
						$strings["tiptap.{$key}"] = $value;
					}

					return A::merge(
						['lang' => F::name($file)],
						$strings
					);
				}
			),
			'lang'
		);

		foreach ($translations as &$strings) {
			unset($strings['lang']);
		}
		unset($strings);

		return $translations;
	})(),
	'commands' => [
		'tiptap:convert' => [
			'description' => 'Convert stored tiptap field content to the format configured in the blueprint',
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
				$converter = new Converter($cli);
				$converter->run();
			}
		]
	]
]);
