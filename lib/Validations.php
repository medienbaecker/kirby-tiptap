<?php

namespace Medienbaecker\Tiptap;

use Kirby\Exception\InvalidArgumentException;
use Kirby\Toolkit\Str;

/**
 * Tiptap field validations
 */
class Validations
{
	/**
	 * Get field validation rules
	 */
	public static function rules(): array
	{
		return [
			'minlength' => function ($value) {
				if (
					$this->minlength &&
					Validations::measure($value, $this->model()) < $this->minlength
				) {
					throw new InvalidArgumentException([
						'key' => 'validation.minlength',
						'data' => ['min' => $this->minlength]
					]);
				}
			},
			'maxlength'  => function ($value) {
				if (
					$this->maxlength &&
					Validations::measure($value, $this->model()) > $this->maxlength
				) {
					throw new InvalidArgumentException([
						'key' => 'validation.maxlength',
						'data' => ['max' => $this->maxlength]
					]);
				}
			},
		];
	}

	/**
	 * Plain-text length of rendered content as a reader sees it: strip tags and
	 * decode entities so '&' counts as one char, not the five of '&amp;'.
	 */
	public static function measure($value, $model): int
	{
		$html = convertTiptapToHtml($value, $model);
		return Str::length(trim(html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5)));
	}
}
