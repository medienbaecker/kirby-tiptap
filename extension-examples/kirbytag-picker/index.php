<?php

use Kirby\Text\KirbyTag;
use Kirby\Toolkit\Str;

Kirby::plugin('my/kirbytag-picker', [
	'tags' => [
		'note' => [
			'attr' => ['type'],
			'dialog' => [
				'type' => [
					'type' => 'select',
					'options' => [
						['text' => 'Info', 'value' => 'info'],
						['text' => 'Warning', 'value' => 'warning'],
						['text' => 'Error', 'value' => 'error'],
					]
				]
			],
			'html' => function ($tag) {
				$type = $tag->type ?? 'info';
				return '<div class="note note--' . $type . '">' . $tag->value . '</div>';
			}
		]
	],
	'api' => [
		'routes' => [
			[
				'pattern' => 'kirbytag-picker/tags',
				'method' => 'GET',
				'action' => function () {
					$tags = [];

					foreach (KirbyTag::$types as $name => $config) {
						if (!isset($config['dialog'])) continue;
						$dialog = is_array($config['dialog']) ? $config['dialog'] : [];
						$attrs = [];
						foreach ($config['attr'] ?? [] as $attr) {
							$field = $dialog[$attr] ?? [];
							$attrs[] = array_merge([
								'name'  => $attr,
								'label' => Str::label($attr),
							], $field);
						}
						$tags[] = [
							'name'  => $name,
							'label' => Str::label($name),
							'attrs' => $attrs
						];
					}

					return $tags;
				}
			]
		]
	]
]);
