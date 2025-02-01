<?php

@require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/lib/helpers.php';
require_once __DIR__ . '/lib/KirbyTagNode.php';

use Kirby\Cms\App as Kirby;

Kirby::plugin('medienbaecker/tiptap', [
  'options' => [
    'highlights' => []
  ],
  'fields' => [
    'tiptap' => [
      'props' => [
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
          'strike',
          'code',
          '|',
          'link',
          '|',
          'bulletList',
          'orderedList'
        ]) {
          return $buttons;
        },
        'highlights' => function () {
          return option('medienbaecker.tiptap.highlights');
        },
        'kirbytags' => function () {
          return array_keys($this->kirby()->extensions('tags'));
        },
      ]
    ]
  ],
  'fieldMethods' => [
    'toHtml' => function ($field) {
      return convertTiptapToHtml(
        json_decode($field->value, true),
        $field->parent()
      );
    }
  ]
]);
