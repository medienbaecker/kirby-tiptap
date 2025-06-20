<?php

use Medienbaecker\Tiptap\HtmlConverter;

// Autoload classes
spl_autoload_register(function ($class) {
	$prefix = 'Medienbaecker\\Tiptap\\';
	$base_dir = __DIR__ . '/';

	$len = strlen($prefix);
	if (strncmp($prefix, $class, $len) !== 0) {
		return;
	}

	$relative_class = substr($class, $len);
	$file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

	if (file_exists($file)) {
		require $file;
	}
});

/**
 * Legacy function wrapper for Tiptap to HTML conversion
 * @param mixed $json Tiptap JSON content
 * @param object $parent Parent page/model for KirbyTag context
 * @param array $options Conversion options
 * @return string Generated HTML
 */
function convertTiptapToHtml($json, $parent, array $options = [])
{
	return HtmlConverter::convert($json, $parent, $options);
}
