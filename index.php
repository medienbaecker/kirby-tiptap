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
		'format' => 'markdown',
		'kirbytags' => false,
	],
	'blueprints' => [
		'blocks/tiptap' => __DIR__ . '/blueprints/blocks/tiptap.yml',
	],
	'snippets' => [
		'blocks/tiptap' => __DIR__ . '/snippets/blocks/tiptap.php',
		// Tiptap HTML rendering snippets
		'tiptap/built-in/doc' => __DIR__ . '/snippets/tiptap/doc.php',
		'tiptap/built-in/text' => __DIR__ . '/snippets/tiptap/text.php',
		'tiptap/built-in/paragraph' => __DIR__ . '/snippets/tiptap/paragraph.php',
		'tiptap/built-in/hardBreak' => __DIR__ . '/snippets/tiptap/hardBreak.php',
		'tiptap/built-in/heading' => __DIR__ . '/snippets/tiptap/heading.php',
		'tiptap/built-in/bold' => __DIR__ . '/snippets/tiptap/bold.php',
		'tiptap/built-in/italic' => __DIR__ . '/snippets/tiptap/italic.php',
		'tiptap/built-in/strike' => __DIR__ . '/snippets/tiptap/strike.php',
		'tiptap/built-in/code' => __DIR__ . '/snippets/tiptap/code.php',
		'tiptap/built-in/bulletList' => __DIR__ . '/snippets/tiptap/bulletList.php',
		'tiptap/built-in/orderedList' => __DIR__ . '/snippets/tiptap/orderedList.php',
		'tiptap/built-in/listItem' => __DIR__ . '/snippets/tiptap/listItem.php',
		'tiptap/built-in/blockquote' => __DIR__ . '/snippets/tiptap/blockquote.php',
		'tiptap/built-in/codeBlock' => __DIR__ . '/snippets/tiptap/codeBlock.php',
		'tiptap/built-in/horizontalRule' => __DIR__ . '/snippets/tiptap/horizontalRule.php',
		'tiptap/built-in/taskList' => __DIR__ . '/snippets/tiptap/taskList.php',
		'tiptap/built-in/taskItem' => __DIR__ . '/snippets/tiptap/taskItem.php',
		'tiptap/built-in/kirbyTag' => __DIR__ . '/snippets/tiptap/kirbyTag.php',
		'tiptap/built-in/inline' => __DIR__ . '/snippets/tiptap/inline.php',
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
		},
		'tiptapTextInline' => function ($field, array $options = []) {
			return $field->tiptapText([...$options, 'inline' => true]);
		},
		'tiptap' => function ($field, array $options = []) {
			return $field->tiptapText($options);
		},
		'tiptapInline' => function ($field, array $options = []) {
			return $field->tiptapTextInline($options);
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
