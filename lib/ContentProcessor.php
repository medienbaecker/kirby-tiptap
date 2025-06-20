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
			'type' => 'paragraph', // Wrap everything in a single paragraph
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
}
