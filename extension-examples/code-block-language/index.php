<?php

use Kirby\Cms\App as Kirby;

Kirby::plugin('my/code-block-language', [
	'snippets' => [
		'tiptap/codeBlock' => __DIR__ . '/snippets/codeBlock.php'
	]
]);
