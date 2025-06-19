<?php

namespace Medienbaecker\Tiptap\Nodes;

use Tiptap\Nodes\Paragraph;
use Tiptap\Utils\HTML;

class ParagraphWithClass extends Paragraph
{
    public function renderHTML($node, $HTMLAttributes = [])
    {
        // Check if the node has a class attribute
        if (isset($node->attrs->class) && $node->attrs->class) {
            $existingClass = $HTMLAttributes['class'] ?? '';
            $HTMLAttributes['class'] = trim($existingClass . ' ' . $node->attrs->class);
        }
        
        return ['p', HTML::mergeAttributes($this->options['HTMLAttributes'], $HTMLAttributes), 0];
    }
}