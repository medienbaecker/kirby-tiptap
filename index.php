<?php

use Kirby\Cms\App as Kirby;

Kirby::plugin('medienbaecker/tiptap', [
  'fields' => [
    'tiptap' => [
      'props' => [
        'buttons' => function ($buttons = ['bold', 'italic', 'strike', 'code', '|', 'link', 'email', '|', 'bulletList', 'orderedList']) {
          return $buttons;
        }
      ]
    ]
  ]
]);
