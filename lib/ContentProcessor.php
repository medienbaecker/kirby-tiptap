<?php

namespace Medienbaecker\Tiptap;

/**
 * Processes and cleans Tiptap content structure
 * Handles content normalization and inline mode processing
 */
class ContentProcessor
{
	/**
	 * Clean list item content by removing unnecessary paragraph wrappers
	 * @param array $node Node to clean
	 * @return array Cleaned node
	 */
	public static function cleanListItemContent($node)
	{
		if ($node['type'] === 'listItem' && isset($node['content'])) {
			if (count($node['content']) === 1 && $node['content'][0]['type'] === 'paragraph') {
				$node['content'] = $node['content'][0]['content'];
			}
		}

		if (isset($node['content']) && is_array($node['content'])) {
			$node['content'] = array_map([static::class, 'cleanListItemContent'], $node['content']);
		}

		return $node;
	}

	/**
	 * Process inline mode by flattening paragraphs
	 * @param array $json Content array to process
	 * @return array Processed content array
	 */
	public static function processInlineMode($json)
	{
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

		return [
			'type' => 'inline',
			'content' => $newContent
		];
	}

	/**
	 * Apply heading offset to content nodes
	 * @param array $nodes Array of nodes to process
	 * @param int $offset Heading level offset to apply
	 * @return array Processed nodes
	 */
	public static function applyHeadingOffset($nodes, $offset)
	{
		if ($offset <= 0) {
			return $nodes;
		}

		foreach ($nodes as &$node) {
			if (!is_array($node)) {
				continue;
			}

			if (isset($node['type']) && $node['type'] === 'heading') {
				$currentLevel = $node['attrs']['level'] ?? 1;
				$node['attrs']['level'] = min($currentLevel + $offset, 6);
			}
		}

		return $nodes;
	}

	/**
	 * Validate JSON structure for Tiptap content
	 * @param mixed $json Content to validate
	 * @return bool Whether the JSON structure is valid
	 */
	public static function validateJsonStructure($json)
	{
		return is_array($json) && isset($json['content']) && is_array($json['content']);
	}

	/**
	 * Restructure content to prevent invalid HTML nesting.
	 *
	 * Browsers auto-close <p> tags when encountering block elements,
	 * creating empty paragraphs with unwanted margins. This splits
	 * paragraphs around block-level KirbyTag output to produce
	 * valid, predictable HTML structure.
	 *
	 * @param array $nodes Top-level content nodes
	 * @return array Restructured nodes
	 */
	public static function splitBlockContent(array $nodes): array
	{
		$blockPattern = '/^<(figure|div|table|video|audio|iframe|section|article|aside|blockquote|pre|ul|ol|dl|details|form|hr|script)[\s>\/]/i';
		$result = [];

		foreach ($nodes as $node) {
			if (!isset($node['type']) || $node['type'] !== 'paragraph' || empty($node['content'])) {
				$result[] = $node;
				continue;
			}

			$hasBlockKirbyTag = false;
			foreach ($node['content'] as $child) {
				if (static::isBlockKirbyTag($child, $blockPattern)) {
					$hasBlockKirbyTag = true;
					break;
				}
			}

			if (!$hasBlockKirbyTag) {
				$result[] = $node;
				continue;
			}

			array_push($result, ...static::splitParagraph($node, $blockPattern));
		}

		return $result;
	}

	/**
	 * @param array $child Content node to check
	 * @param string $blockPattern Regex for block elements
	 * @return bool
	 */
	private static function isBlockKirbyTag(array $child, string $blockPattern): bool
	{
		return ($child['type'] ?? '') === 'kirbyTag' &&
			   isset($child['attrs']['content']) &&
			   preg_match($blockPattern, trim($child['attrs']['content']));
	}

	/**
	 * @param array $node Paragraph node to split
	 * @param string $blockPattern Regex for block elements
	 * @return array Split nodes
	 */
	private static function splitParagraph(array $node, string $blockPattern): array
	{
		$result = [];
		$attrs = $node['attrs'] ?? [];
		$currentContent = [];

		foreach ($node['content'] as $child) {
			if (static::isBlockKirbyTag($child, $blockPattern)) {
				if (!empty($currentContent)) {
					$result[] = ['type' => 'paragraph', 'attrs' => $attrs, 'content' => $currentContent];
					$currentContent = [];
				}
				$result[] = $child;
			} else {
				$currentContent[] = $child;
			}
		}

		if (!empty($currentContent)) {
			$result[] = ['type' => 'paragraph', 'attrs' => $attrs, 'content' => $currentContent];
		}

		return $result;
	}
}
