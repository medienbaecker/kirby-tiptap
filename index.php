<?php

@require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/lib/helpers.php';

use Kirby\Cms\App as Kirby;

Kirby::plugin('medienbaecker/tiptap', [
  'options' => [
    'highlights' => []
  ],
  'fields' => [
    'tiptap' => [
      'mixins' => [
        'filepicker', /* Needed for the API endpoint */
      ],
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
          'image',
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
        }
      ],
      'api' => function () {
        return [
          [
            'pattern' => 'files',
            'action' => function () {
              return $this->field()->filepicker([
                'query' => 'page.images',
                'page'   => $this->requestQuery('page'),
                'search' => $this->requestQuery('search')
              ]);
            }
          ]
        ];
      }
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
