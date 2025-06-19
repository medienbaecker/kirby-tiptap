<?php

namespace Medienbaecker\Tiptap\Nodes;

/**
 * Custom text node that conditionally escapes HTML based on context
 * Provides security by escaping HTML in code contexts while allowing
 * controlled HTML in regular text when allowHtml is enabled
 */
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