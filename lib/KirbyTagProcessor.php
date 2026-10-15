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
	 * Process a content node for KirbyTags.
	 *
	 * Returns an array of nodes: a text node containing tags expands into a
	 * sequence of literal text nodes and one kirbyTag node per tag, so block
	 * detection and paragraph splitting can work per tag.
	 *
	 * @param array $node Node to process
	 * @param object $parent Parent page/model for KirbyTag context
	 * @param bool $allowHtml Whether to allow raw HTML in literal text
	 * @param bool $inCodeBlock Whether we're inside a code block
	 * @return array Replacement node sequence
	 */
	public static function processContent(array $node, $parent, bool $allowHtml = false, bool $inCodeBlock = false): array
	{
		// Track if we're entering a code block context
		if (($node['type'] ?? '') === 'codeBlock') {
			$inCodeBlock = true;
		}

		if (isset($node['text'])) {
			if (static::isCode($node, $inCodeBlock) === false) {
				return static::renderText($node, $parent, $allowHtml);
			}
			return [$node];
		}

		// Recursively process nested content
		if (isset($node['content']) && is_array($node['content'])) {
			$children = [];
			foreach ($node['content'] as $child) {
				if (!is_array($child)) {
					continue;
				}
				array_push($children, ...static::processContent($child, $parent, $allowHtml, $inCodeBlock));
			}
			$node['content'] = $children;
		}

		return [$node];
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
	 * Render a text node as a node sequence: literal segments stay text
	 * nodes (escaped later by the text snippet), each parsed KirbyTag
	 * becomes its own kirbyTag node.
	 */
	private static function renderText(array $node, $parent, bool $allowHtml): array
	{
		$text = $node['text'];

		// Split into literal-text and balanced KirbyTag segments
		$regex = '!(?=[^\]])(?=\([a-z0-9_-]+:)(\((?:[^()]+|(?1))*+\))!isx';
		$parts = preg_split($regex, $text, -1, PREG_SPLIT_DELIM_CAPTURE);
		$hasTag = $parts !== false && count($parts) > 1;

		// Plain text without tags or URLs: leave as a text node so text.php escapes it.
		if ($hasTag === false && $allowHtml === false) {
			return static::linkUrls($text, $node['marks'] ?? null);
		}

		$marks = $node['marks'] ?? null;
		$nodes = [];

		foreach ($parts === false ? [$text] : $parts as $i => $part) {
			if ($part === '') {
				continue;
			}

			if ($i % 2 === 1) {
				$parsed = KirbyTags::parse($part, ['parent' => $parent]);
				if ($parsed !== $part) {
					$nodes[] = static::tagNode($parsed, $marks);
					continue;
				}
			}

			if ($allowHtml) {
				// No autolinking here: the text may already contain an
				// <a href="https://…">, and linkifying inside the href
				// would corrupt it
				$nodes[] = static::tagNode($part, $marks);
			} else {
				array_push($nodes, ...static::linkUrls($part, $marks));
			}
		}

		return $nodes;
	}

	/**
	 * Splits bare URLs out of literal text into anchors, so JSON fields
	 * autolink the way kirbytext does on Markdown fields. Parsedown's own
	 * pattern, so both formats agree on what counts as a bare URL.
	 */
	private static function linkUrls(string $text, ?array $marks): array
	{
		$parts = preg_split(
			'/(\bhttps?+:[\/]{2}[^\s<]+\b\/*+)/ui',
			$text,
			-1,
			PREG_SPLIT_DELIM_CAPTURE
		);

		if ($parts === false || count($parts) === 1) {
			return [static::textNode($text, $marks)];
		}

		$nodes = [];
		foreach ($parts as $i => $part) {
			if ($part === '') {
				continue;
			}

			$nodes[] = $i % 2 === 1
				? static::tagNode('<a href="' . html($part) . '">' . html($part) . '</a>', $marks)
				: static::textNode($part, $marks);
		}

		return $nodes;
	}

	private static function textNode(string $text, ?array $marks): array
	{
		$node = ['type' => 'text', 'text' => $text];
		if ($marks !== null) {
			$node['marks'] = $marks;
		}
		return $node;
	}

	/**
	 * Build a kirbyTag node carrying rendered (or raw) HTML.
	 */
	private static function tagNode(string $content, ?array $marks): array
	{
		$node = [
			'type' => 'kirbyTag',
			'attrs' => ['content' => $content],
		];

		// Don't wrap block-level tag output (e.g. an image's <figure>) in an inline mark
		if (
			$marks !== null &&
			!preg_match('/<(figure|video|audio|iframe|table|ul|ol|blockquote|pre|div|hr|h[1-6])\b/i', $content)
		) {
			$node['marks'] = $marks;
		}

		return $node;
	}
}
