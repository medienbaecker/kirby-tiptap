<?php

use Medienbaecker\Tiptap\HtmlConverter;

/**
 * Convert Tiptap JSON to HTML
 * @param mixed $json Tiptap JSON content
 * @param object $parent Parent page/model for KirbyTag context
 * @param array $options Conversion options
 * @return string Generated HTML
 */
function convertTiptapToHtml($json, $parent, array $options = [])
{
	return HtmlConverter::convert($json, $parent, $options);
}
