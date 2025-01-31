<?php

use Kirby\Text\KirbyTags;
use Kirby\Uuid\Uuid;
use Tiptap\Editor;

function convertTiptapToHtml($json, $page)
{
  foreach ($json['content'] as &$node) {
    if (isset($node['content'][0]['text'])) {
      $text = $node['content'][0]['text'];

      // Only process if text contains potential UUID patterns
      if (str_contains($text, '://')) {
        $text = preg_replace_callback('/(page|file):\/\/[a-zA-Z0-9-]+/', function ($matches) {
          try {
            if ($url = Uuid::for($matches[0])?->model()?->url()) {
              return $url;
            }
          } catch (InvalidArgumentException) {
            // ignore anything else than permalinks
          }
          return $matches[0];
        }, $text);
      }

      // Then parse Kirbytags
      $parsed = KirbyTags::parse($text, ['parent' => $page]);

      if ($parsed !== strip_tags($parsed)) {
        $node['type'] = 'kirbyTag';
        $node['attrs'] = ['content' => $parsed];
      }
    }
  }

  return (new Editor([
    'extensions' => [
      new \Tiptap\Extensions\StarterKit(),
      new KirbyTagNode()
    ]
  ]))->setContent($json)->getHTML();
}
