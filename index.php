<?php

use Kirby\Cms\App as Kirby;

Kirby::plugin('medienbaecker/tiptap', [
  'fields' => [
    'tiptap' => [
      'props' => [
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
        }
      ]
    ]
  ]
]);
