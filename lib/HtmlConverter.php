<?php

namespace Medienbaecker\Tiptap;

/**
 * Converts Tiptap JSON content to HTML using Kirby snippets.
 * Each node type is rendered by a snippet in snippets/tiptap/{type}.php
 */
class HtmlConverter
{
	/**
	 * Render content recursively using Kirby snippets.
	 */
	protected static function renderSnippets(array $content, ?array $parent = null): string
	{
		$html = '';
		$previous = null;

		for ($i = 0, $count = count($content); $i < $count; $i++) {
			$node = $content[$i];
			$children = static::renderSnippets($node['content'] ?? [], $node);

			$html .= snippet('tiptap/' . $node['type'], [
				...$node,
				'content' => $children,
				'next' => $content[$i + 1] ?? null,
				'previous' => $previous,
				'parent' => $parent,
			], true);

			$previous = $node;
		}

		return $html;
	}

	/**
	 * Convert Tiptap JSON to HTML
	 * @param mixed $json Tiptap JSON content
	 * @param object $parent Parent page/model for KirbyTag context
	 * @param array $options Conversion options
	 * @return string Generated HTML
	 */
	public static function convert($json, $parent, array $options = [])
	{
		// Set default options
		$options = array_merge([
			'offsetHeadings' => 0,
			'allowHtml' => false,
			'customButtons' => []
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
		if (!ContentProcessor::validateJsonStructure($json)) {
			return '';
		}

		// Check if inline mode is active
		$isInline = $json['inline'] ?? false;

		// Clean list items to remove unnecessary paragraph wrappers
		$json = ContentProcessor::cleanListItemContent($json);

		// Handle inline mode by flattening paragraphs
		if ($isInline) {
			$json = ContentProcessor::processInlineMode($json);
		}

		// Apply heading offset
		$json['content'] = ContentProcessor::applyHeadingOffset(
			$json['content'],
			$options['offsetHeadings']
		);

		// Process nodes for KirbyTags and UUIDs
		foreach ($json['content'] as &$node) {
			if (!is_array($node)) {
				continue;
			}

			KirbyTagProcessor::processContent($node, $parent, $options['allowHtml'], false);
		}

		// Convert to HTML using snippets
		try {
			$dom = (new MarkProcessor())->processNode($json);
			$html = static::renderSnippets([$dom]);

			// Handle Smartypants
			if (option('smartypants', false) !== false) {
				$html = smartypants($html);
			}

			return $html;
		} catch (\Exception) {
			return '';
		}
	}
}
