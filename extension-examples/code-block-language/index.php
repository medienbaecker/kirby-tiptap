<?php

// Note: if kirby-tiptap loads after this plugin alphabetically
// and overwrites the snippet, move it to site/snippets/tiptap/codeBlock.php instead.

Kirby::plugin('my/code-block-language', [
	'snippets' => [
		'tiptap/codeBlock' => __DIR__ . '/snippets/codeBlock.php'
	]
]);
