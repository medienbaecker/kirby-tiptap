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

    return [
      'content' => $content
    ];

    // TODO: Find a way to fix images/figures in paragraphs. The below doesn't play nicely with links

    // // Check if this has a figure tag
    // if (strpos($content, '<figure') === 0) {
    //   // Return block without paragraph
    //   return [
    //     'content' => $content,
    //   ];
    // }

    // // Wrap all other content in paragraphs
    // return [
    //   'content' => "<p>{$content}</p>",
    // ];
  }
}

function convertTiptapToHtml($json, $parent, array $options = [])
{
  // Set default options
  $options = array_merge([
    'offsetHeadings' => 0
  ], $options);

  // Handle null or empty string cases
  if ($json === null || $json === '') {
    return '';
  }

  // If $json is a string, try to decode it
  if (is_string($json)) {
    $json = json_decode($json, true);
  }

  // Validate JSON structure
  if (!is_array($json) || !isset($json['content']) || !is_array($json['content'])) {
    return '';
  }

  foreach ($json['content'] as &$node) {
    // Skip if node or content is not properly structured
    if (!is_array($node)) {
      continue;
    }

    // Handle heading offset
    if ($options['offsetHeadings'] > 0 && isset($node['type']) && $node['type'] === 'heading') {
      $currentLevel = $node['attrs']['level'] ?? 1;
      $newLevel = min($currentLevel + $options['offsetHeadings'], 6); // Max h6
      $node['attrs']['level'] = $newLevel;
    }

    if (!isset($node['content']) || !is_array($node['content'])) {
      continue;
    }

    // Process each text node in the content array
    foreach ($node['content'] as &$contentNode) {
      if (isset($contentNode['text'])) {
        $text = $contentNode['text'];

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
        $parsed = KirbyTags::parse($text, ['parent' => $parent]);

        if ($parsed !== strip_tags($parsed)) {
          $contentNode['type'] = 'kirbyTag';
          $contentNode['attrs'] = ['content' => $parsed];
          unset($contentNode['text']);
        }
      }
    }
  }

  try {
    return (new Editor([
      'extensions' => [
        new \Tiptap\Extensions\StarterKit(),
        new KirbyTagNode()
      ]
    ]))->setContent($json)->getHTML();
  } catch (\Exception $e) {
    // Handle any errors during HTML conversion
    return '';
  }
}
