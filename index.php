<?php

@require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/lib/helpers.php';

use Kirby\Cms\App as Kirby;
use Kirby\Exception\InvalidArgumentException;
use Kirby\Toolkit\V;

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
          '|',
          'link',
          'image',
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
        'kirbytags' => function () {
          return array_keys($this->kirby()->extensions('tags'));
        },
        'links' => function ($links = []) {
          return $links;
        },
      ],
      'validations' => [
        'minlength' => function ($value) {

          $value = convertTiptapToHtml(
            $value,
            $this->model()
          );

          if (
            $this->minlength &&
            V::minLength(strip_tags($value), $this->minlength) === false
          ) {
            throw new InvalidArgumentException(
              key: 'validation.minlength',
              data: ['min' => $this->minlength]
            );
          }
        },
        'maxlength'  => function ($value) {

          $value = convertTiptapToHtml(
            $value,
            $this->model()
          );

          if (
            $this->maxlength &&
            V::maxLength(strip_tags($value), $this->maxlength) === false
          ) {
            throw new InvalidArgumentException(
              key: 'validation.maxlength',
              data: ['max' => $this->maxlength]
            );
          }
        },
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
    'tiptapText' => function ($field, array $options = []) {
      return convertTiptapToHtml(
        $field->value,
        $field->parent(),
        $options
      );
    }
  ]
]);
