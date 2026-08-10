<?php

namespace Medienbaecker\Tiptap;

use DOMDocument;
use DOMElement;
use DOMXPath;

/**
 * Mirrors transformLinksToKirbyTags() in src/utils/pasteTransform.ts: the Link
 * mark is not in the schema, so anchors must be tags before the editor parses
 */
class HtmlLinkConverter
{
	public static function convert(string $html, ?int &$converted = null): string
	{
		$converted = 0;

		// Same pattern as containsAnchor() in src/utils/pasteTransform.ts.
		// Deliberately does not look for href: [^>]* stops at a > inside an
		// attribute value, which would skip the anchor and drop its link
		if (preg_match('/<a[\s>]/i', $html) !== 1) {
			return $html;
		}

		$dom = new DOMDocument();
		$previous = libxml_use_internal_errors(true);
		// loadHTML assumes ISO-8859-1, so non-ASCII has to reach it as entities.
		// Without the implied html/body wrapper libxml discards top-level text
		$dom->loadHTML(
			mb_encode_numericentity($html, [0x80, 0x10FFFF, 0, 0x1FFFFF], 'UTF-8'),
			LIBXML_HTML_NODEFDTD
		);
		libxml_clear_errors();
		libxml_use_internal_errors($previous);

		$anchors = iterator_to_array((new DOMXPath($dom))->query('//a[@href]'));

		foreach ($anchors as $anchor) {
			$tag = static::tagFor($anchor);
			if ($tag !== null) {
				$anchor->parentNode->replaceChild(
					$dom->createTextNode($tag),
					$anchor
				);
				$converted++;
			}
		}

		return static::innerHtml($dom, $html);
	}

	private static function tagFor(DOMElement $anchor): ?string
	{
		$href = MarkdownSerializer::normalizeHref($anchor->getAttribute('href'));

		if ($href === '' || $href === '#' || preg_match('/^(javascript|data):/i', $href)) {
			return null;
		}

		// Matches the character set JS \s collapses, so both sides agree
		$text = trim(preg_replace(
			'/[\s\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]+/u',
			' ',
			$anchor->textContent
		));

		// An anchor the Markdown parser generated from a bare URL. A tag would
		// change the rendered text, because Html::link shortens URLs
		if ($text === $href && preg_match('/^https?:\/\//i', $href) === 1) {
			return null;
		}

		return MarkdownSerializer::linkTag($href, $text);
	}

	private static function innerHtml(DOMDocument $dom, string $original): string
	{
		// Returning '' here would let the caller overwrite the field with an
		// empty document
		$body = $dom->getElementsByTagName('body')->item(0);
		if ($body === null) {
			return $original;
		}

		$html = '';
		foreach ($body->childNodes as $child) {
			$html .= $dom->saveHTML($child);
		}
		return $html;
	}
}
