<?php

namespace Medienbaecker\Tiptap;

/**
 * Tiptap field configuration and props
 */
class Field
{
	/**
	 * Get field props configuration
	 */
	public static function props(): array
	{
		return [
			'size' => function ($size = 'auto') {
				return $size;
			},
			'spellcheck' => function ($spellcheck = true) {
				return $spellcheck;
			},
			'buttons' => function ($buttons = [
				['headings' => [1, 2, 3]],
				'|',
				'bold',
				'italic',
				'|',
				'link',
				'file',
				'|',
				'bulletList',
				'orderedList'
			]) {
				if ($buttons === false) return [];
				return $buttons;
			},
			'highlights' => function () {
				return option('medienbaecker.tiptap.highlights');
			},
			'customButtons' => function () {
				return option('medienbaecker.tiptap.buttons');
			},
			'kirbytags' => function () {
				return array_keys($this->kirby()->extensions('tags'));
			},
			'links' => function ($links = []) {
				return $links;
			},
			'uploads' => function ($uploads = false) {
				// Handle upload configuration similar to textarea field
				if ($uploads === false) {
					return false;
				}

				if ($uploads === true) {
					return ['accept' => '*'];
				}

				if (is_string($uploads)) {
					return ['template' => $uploads, 'accept' => '*'];
				}

				if (is_array($uploads)) {
					return array_merge(['accept' => '*'], $uploads);
				}

				return ['accept' => '*'];
			},
		];
	}
}
