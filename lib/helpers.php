<?php

use Kirby\Text\KirbyTags;
use Tiptap\Editor;

function convertTiptapToHtml($json, $page)
{
  foreach ($json['content'] as &$node) {
    if (isset($node['content'][0]['text'])) {
      $parsed = KirbyTags::parse(
        $node['content'][0]['text'],
        ['parent' => $page]
      );

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
