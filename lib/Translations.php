<?php

namespace Medienbaecker\Tiptap;

/**
 * Tiptap field translations
 */
class Translations
{
	/**
	 * Get translation definitions
	 */
	public static function definitions(): array
	{
		return [
			'en' => [
				'tiptap.toolbar.button.horizontalRule' => 'Horizontal Rule',
				'tiptap.toolbar.button.codeBlock' => 'Code Block',
				'tiptap.toolbar.button.twoColumn' => 'Two Columns',
				'tiptap.toolbar.button.blockquote' => 'Blockquote',
			],
			'de' => [
				'tiptap.toolbar.button.horizontalRule' => 'Trennlinie',
				'tiptap.toolbar.button.codeBlock' => 'Codeblock',
				'tiptap.toolbar.button.twoColumn' => 'Zwei Spalten',
				'tiptap.toolbar.button.blockquote' => 'Zitat',
			]
		];
	}
}
