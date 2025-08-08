<?php

@include_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/lib/helpers.php';
require_once __DIR__ . '/lib/Field.php';
require_once __DIR__ . '/lib/Validations.php';
require_once __DIR__ . '/lib/Api.php';

use Kirby\Cms\App as Kirby;
use Kirby\Toolkit\A;
use Kirby\Filesystem\Dir;
use Kirby\Filesystem\F;
use Kirby\Data\Json;
use Medienbaecker\Tiptap\Field;
use Medienbaecker\Tiptap\Validations;
use Medienbaecker\Tiptap\Api;

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

			return convertTiptapToHtml(
				$field->value,
				$field->parent(),
				$options
			);
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
	)
]);
