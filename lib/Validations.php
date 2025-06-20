<?php

namespace Medienbaecker\Tiptap;

use Kirby\Exception\InvalidArgumentException;
use Kirby\Toolkit\V;

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
				$value = convertTiptapToHtml(
					$value,
					$this->model()
				);

				if (
					$this->minlength &&
					V::minLength(strip_tags($value), $this->minlength) === false
				) {
					throw new InvalidArgumentException([
						'key' => 'validation.minlength',
						'data' => ['min' => $this->minlength]
					]);
				}
			},
			'maxlength'  => function ($value) {
				$value = convertTiptapToHtml(
					$value,
					$this->model()
				);

				if (
					$this->maxlength &&
					V::maxLength(strip_tags($value), $this->maxlength) === false
				) {
					throw new InvalidArgumentException([
						'key' => 'validation.maxlength',
						'data' => ['max' => $this->maxlength]
					]);
				}
			},
		];
	}
}
