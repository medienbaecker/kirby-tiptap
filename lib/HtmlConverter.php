<?php

namespace Medienbaecker\Tiptap;

use Kirby\Exception\Exception;
use Kirby\Template\Snippet;

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

			$name = 'tiptap/' . ($node['type'] ?? '');

			// A node type without a snippet (e.g. a custom extension node)
			// must not silently swallow content: warn, throw in debug mode,
			// and fall back to the children so text survives.
			if (Snippet::file($name) === null) {
				$message = 'kirby-tiptap: no snippet "' . $name . '" for node type "' . ($node['type'] ?? '?') . '"';
				if (option('debug', false) === true) {
					throw new Exception(message: $message);
				}
				error_log($message);
				$html .= $children;
				$previous = $node;
				continue;
			}

			$html .= snippet($name, [
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
			'inline' => false,
		], $options);

		// Handle invalid input
		if ($json === null || $json === '') {
			return '';
		}

		// Parse JSON if needed
		if (is_string($json)) {
			$decoded = json_decode($json, true);
			if (
				json_last_error() !== JSON_ERROR_NONE ||
				!ContentProcessor::validateJsonStructure($decoded)
			) {
				// Markdown value (format: markdown) or legacy plain text:
				// render with Kirby's own pipeline (KirbyTags + Markdown +
				// SmartyPants), like a textarea field
				return kirbytext($json, [
					'parent' => $parent,
					'markdown' => ['inline' => $options['inline'] === true],
				]);
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

		try {
			// Process nodes for KirbyTags and UUIDs
			$content = [];
			foreach ($json['content'] as $node) {
				if (!is_array($node)) {
					continue;
				}

				array_push($content, ...KirbyTagProcessor::processContent($node, $parent, $options['allowHtml'], false));
			}
			$json['content'] = $content;

			// Split paragraphs containing block-level kirbyTags
			$json['content'] = ContentProcessor::splitBlockContent($json['content']);

			// Convert to HTML using snippets
			$dom = (new MarkProcessor())->processNode($json);
			$html = static::renderSnippets([$dom]);

			// Handle Smartypants
			if (option('smartypants', false) !== false) {
				$html = smartypants($html);
			}

			return $html;
		} catch (\Throwable $e) {
			if (option('debug', false) === true) {
				throw $e;
			}
			error_log('kirby-tiptap: render failed: ' . $e->getMessage());
			return '';
		}
	}
}
