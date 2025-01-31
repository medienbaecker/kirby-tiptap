<?php

use Tiptap\Core\Node;

class KirbyTagNode extends Node
{
  public static $name = 'kirbyTag';

  public static $priority = 100;

  public function renderHTML($node, $HTMLAttributes = [])
  {
    $content = html_entity_decode($node->attrs->content ?? '');

    // Check if this has a figure tag
    if (strpos($content, '<figure') === 0) {
      // Return block without paragraph
      return [
        'content' => $content,
      ];
    }

    // Wrap all other content in paragraphs
    return [
      'content' => "<p>{$content}</p>",
    ];
  }
}
