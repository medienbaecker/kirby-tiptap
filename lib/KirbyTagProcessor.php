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
	 * @param bool $allowHtml Whether to allow raw HTML in literal text
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
			if (static::isCode($node, $inCodeBlock) === false) {
				$node = static::renderText($node, $parent, $allowHtml);
			}
		}

		// Recursively process nested content
		if (isset($node['content']) && is_array($node['content'])) {
			foreach ($node['content'] as &$contentNode) {
				static::processContent($contentNode, $parent, $allowHtml, $inCodeBlock);
			}
		}
	}

	/**
	 * Whether a text node is inside code (code block or inline code mark).
	 */
	private static function isCode(array $node, bool $inCodeBlock): bool
	{
		if ($inCodeBlock === true) {
			return true;
		}

		foreach ($node['marks'] ?? [] as $mark) {
			if (($mark['type'] ?? '') === 'code') {
				return true;
			}
		}

		return false;
	}

	/**
	 * Render a text node, escaping literal text and parsing KirbyTags
	 * segment by segment so text surrounding a tag cannot inject HTML.
	 */
	private static function renderText(array $node, $parent, bool $allowHtml): array
	{
		$text = $node['text'];

		// Split into literal-text and balanced KirbyTag segments
		$regex = '!(?=[^\]])(?=\([a-z0-9_-]+:)(\((?:[^()]+|(?1))*+\))!isx';
		$parts = preg_split($regex, $text, -1, PREG_SPLIT_DELIM_CAPTURE);
		$hasTag = $parts !== false && count($parts) > 1;

		// Plain text without tags: leave as a text node so text.php escapes it.
		if ($hasTag === false && $allowHtml === false) {
			return $node;
		}

		$rendered = '';
		foreach ($parts === false ? [$text] : $parts as $i => $part) {
			if ($part === '') {
				continue;
			}

			if ($i % 2 === 1) {
				$parsed = KirbyTags::parse($part, ['parent' => $parent]);
				if ($parsed !== $part) {
					$rendered .= $parsed;
					continue;
				}
			}

			$rendered .= $allowHtml ? $part : html($part);
		}

		// Don't wrap block-level tag output (e.g. an image's <figure>) in an inline mark
		if (
			isset($node['marks']) &&
			preg_match('/<(figure|video|audio|iframe|table|ul|ol|blockquote|pre|div|hr|h[1-6])\b/i', $rendered)
		) {
			unset($node['marks']);
		}

		$node['type'] = 'kirbyTag';
		$node['attrs'] = ['content' => $rendered];
		unset($node['text']);

		return $node;
	}
}
