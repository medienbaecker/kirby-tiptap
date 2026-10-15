<?php

use Kirby\Cms\App as Kirby;

// Custom nodes need a matching snippet, or tiptapText() can't render them
Kirby::plugin('my/two-columns', [
	'snippets' => [
		'tiptap/columns' => __DIR__ . '/snippets/columns.php',
		'tiptap/column' => __DIR__ . '/snippets/column.php',
	]
]);
