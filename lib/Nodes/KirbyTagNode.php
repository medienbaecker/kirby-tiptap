<?php

namespace Medienbaecker\Tiptap\Nodes;

use Tiptap\Core\Node;

/**
 * Tiptap node for rendering KirbyTags
 * Handles the conversion of KirbyTag nodes to HTML
 */
class KirbyTagNode extends Node
{
  public static $name = 'kirbyTag';
  public static $priority = 100;

  public function renderHTML($node, $HTMLAttributes = [])
  {
    $content = html_entity_decode($node->attrs->content ?? '');
    return ['content' => $content];
  }
}