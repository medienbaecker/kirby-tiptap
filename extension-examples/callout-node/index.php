<?php

use Kirby\Cms\App as Kirby;

Kirby::plugin('my/callout-node', [
	'snippets' => [
		'tiptap/callout' => __DIR__ . '/snippets/callout.php'
	]
]);
