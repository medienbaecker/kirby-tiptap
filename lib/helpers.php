<?php

use Kirby\Text\KirbyTags;
use Kirby\Uuid\Uuid;
use Tiptap\Editor;
use Tiptap\Core\Node;

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

function cleanListItemContent($node)
{
  if ($node['type'] === 'listItem' && isset($node['content'])) {
    if (count($node['content']) === 1 && $node['content'][0]['type'] === 'paragraph') {
      $node['content'] = $node['content'][0]['content'];
    }
  }

  if (isset($node['content']) && is_array($node['content'])) {
    $node['content'] = array_map('cleanListItemContent', $node['content']);
  }

  return $node;
}

function convertTiptapToHtml($json, $parent, array $options = [])
{
  // Set default options
  $options = array_merge([
    'offsetHeadings' => 0
  ], $options);

  // Handle invalid input
  if ($json === null || $json === '') {
    return '';
  }

  // Parse JSON if needed
  if (is_string($json)) {
    $json = json_decode($json, true);
  }

  // Validate JSON structure
  if (!is_array($json) || !isset($json['content']) || !is_array($json['content'])) {
    return '';
  }

  // Clean list items
  $json = cleanListItemContent($json);

  // Process nodes
  foreach ($json['content'] as &$node) {
    if (!is_array($node)) {
      continue;
    }

    // Handle heading offset
    if ($options['offsetHeadings'] > 0 && isset($node['type']) && $node['type'] === 'heading') {
      $currentLevel = $node['attrs']['level'] ?? 1;
      $node['attrs']['level'] = min($currentLevel + $options['offsetHeadings'], 6);
    }

    if (!isset($node['content']) || !is_array($node['content'])) {
      continue;
    }

    // Process content nodes
    foreach ($node['content'] as &$contentNode) {
      if (!isset($contentNode['text'])) {
        continue;
      }

      $text = $contentNode['text'];

      // Process UUIDs
      if (str_contains($text, '://')) {
        $text = preg_replace_callback('/(page|file):\/\/[a-zA-Z0-9-]+/', function ($matches) {
          try {
            if ($url = Uuid::for($matches[0])?->model()?->url()) {
              return $url;
            }
          } catch (InvalidArgumentException) {
            // Ignore invalid UUIDs
          }
          return $matches[0];
        }, $text);
      }

      // Process KirbyTags
      $parsed = KirbyTags::parse($text, ['parent' => $parent]);

      if ($parsed !== strip_tags($parsed)) {
        $contentNode['type'] = 'kirbyTag';
        $contentNode['attrs'] = ['content' => $parsed];
        unset($contentNode['text']);
      }
    }
  }

  // Convert to HTML
  try {
    return (new Editor([
      'extensions' => [
        new \Tiptap\Extensions\StarterKit(),
        new KirbyTagNode()
      ]
    ]))->setContent($json)->getHTML();
  } catch (\Exception) {
    return '';
  }
}
