<?php

namespace Medienbaecker\Tiptap;

use Kirby\Text\KirbyTags;

/**
 * Processes KirbyTags in Tiptap content
 * Handles the transformation of KirbyTag text
 */
class KirbyTagProcessor
{
	/**
	 * Process content node for KirbyTags
	 * @param array $node Node to process (passed by reference)
	 * @param object $parent Parent page/model for KirbyTag context
	 * @param bool $allowHtml Whether to allow HTML in text nodes
	 * @param bool $inCodeBlock Whether we're inside a code block
	 */
	public static function processContent(&$node, $parent, $allowHtml = false, $inCodeBlock = false)
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
				static::processContent($contentNode, $parent, $allowHtml, $inCodeBlock);
			}
		}
	}
}
