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

// Custom text node that conditionally escapes HTML based on context
class ConditionalTextNode extends \Tiptap\Nodes\Text
{
  private $allowHtml;

  public function __construct($allowHtml = false)
  {
    $this->allowHtml = $allowHtml;
    parent::__construct();
  }

  public function renderText($node)
  {
    // Always escape HTML in code contexts for security
    if (isset($node->_inCodeBlock) && $node->_inCodeBlock) {
      return htmlspecialchars($node->text, ENT_QUOTES, 'UTF-8');
    }

    // Always escape HTML in inline code for security
    if (isset($node->marks)) {
      foreach ($node->marks as $mark) {
        if ($mark->type === 'code') {
          return htmlspecialchars($node->text, ENT_QUOTES, 'UTF-8');
        }
      }
    }

    // For regular text, respect the allowHtml setting
    return $this->allowHtml
      ? $node->text
      : htmlspecialchars($node->text, ENT_QUOTES, 'UTF-8');
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

function processContent(&$node, $parent, $allowHtml = false, $inCodeBlock = false)
{
  // Track if we're entering a code block context
  if (isset($node['type']) && $node['type'] === 'codeBlock') {
    $inCodeBlock = true;
  }

  // Process current node's text if it exists
  if (isset($node['text'])) {
    $text = $node['text'];

    // Mark text nodes that are inside code blocks
    $node['_inCodeBlock'] = $inCodeBlock;

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

    // Only treat as KirbyTag if KirbyTags actually transformed the content
    if ($parsed !== $text) {
      $node['type'] = 'kirbyTag';
      $node['attrs'] = ['content' => $parsed];
      unset($node['text']);
    } else {
      $node['text'] = $text;
    }
  }

  // Recursively process nested content
  if (isset($node['content']) && is_array($node['content'])) {
    foreach ($node['content'] as &$contentNode) {
      processContent($contentNode, $parent, $allowHtml, $inCodeBlock);
    }
  }
}

function convertTiptapToHtml($json, $parent, array $options = [])
{
  // Set default options
  $options = array_merge([
    'offsetHeadings' => 0,
    'allowHtml' => false
  ], $options);

  // Handle invalid input
  if ($json === null || $json === '') {
    return '';
  }

  // Parse JSON if needed
  if (is_string($json)) {
    $decoded = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
      return ''; // Invalid JSON
    }
    $json = $decoded;
  }

  // Validate JSON structure
  if (!is_array($json) || !isset($json['content']) || !is_array($json['content'])) {
    return '';
  }

  // Check if inline mode is active
  $isInline = $json['inline'] ?? false;

  // Clean list items to remove unnecessary paragraph wrappers
  $json = cleanListItemContent($json);

  // Handle inline mode by flattening paragraphs
  if ($isInline) {
    $newContent = [];
    foreach ($json['content'] as $index => $node) {
      if ($node['type'] === 'paragraph') {
        // Add line break between paragraphs
        if ($index > 0) {
          $newContent[] = ['type' => 'hardBreak'];
        }
        // Add all content from the paragraph
        if (isset($node['content'])) {
          foreach ($node['content'] as $content) {
            $newContent[] = $content;
          }
        }
      } else {
        $newContent[] = $node;
      }
    }
    $json['content'] = $newContent;
    $json['type'] = 'paragraph'; // Wrap everything in a single paragraph
  }

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

    // Process all content recursively
    processContent($node, $parent, $options['allowHtml']);
  }

  // Convert to HTML
  try {
    $html = (new Editor([
      'extensions' => [
        new \Tiptap\Extensions\StarterKit([
          'text' => false, // Disable default text node
        ]),
        new ConditionalTextNode($options['allowHtml']), // Use our custom text handler
        new KirbyTagNode()
      ]
    ]))->setContent($json)->getHTML();

    // Handle Smartypants
    if (option('smartypants', false) !== false) {
      $html = smartypants($html);
    }

    return $html;
  } catch (\Exception) {
    return '';
  }
}
