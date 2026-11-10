<?php

namespace Medienbaecker\Tiptap;

use Kirby\Cms\App;
use Kirby\Exception\InvalidArgumentException;
use Kirby\Text\KirbyTag;
use Kirby\Toolkit\Str;
use Throwable;

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
					Validations::measure($value, $this->buttons()) < $this->minlength
				) {
					throw new InvalidArgumentException(
						key: 'validation.minlength',
						data: ['min' => $this->minlength]
					);
				}
			},
			'maxlength'  => function ($value) {
				if (
					$this->maxlength &&
					Validations::measure($value, $this->buttons()) > $this->maxlength
				) {
					throw new InvalidArgumentException(
						key: 'validation.maxlength',
						data: ['max' => $this->maxlength]
					);
				}
			},
		];
	}

	/**
	 * Length of the text a reader sees, counted like the field's counter:
	 * one character per block and line break, KirbyTags as their visible text
	 */
	public static function measure(mixed $value, array $buttons): int
	{
		$doc = is_string($value) ? json_decode($value, true) : $value;

		if (($doc['type'] ?? null) !== 'doc') {
			$doc = MarkdownParser::parse((string)$value, $buttons, Field::markdownOptions(App::instance()));
		}

		$blocks = [];
		static::collectText($doc, $blocks);

		return Str::length(trim(implode("\n", $blocks)));
	}

	private static function collectText(array $node, array &$blocks): void
	{
		$content = $node['content'] ?? [];
		$inline  = false;

		foreach ($content as $child) {
			if (in_array($child['type'] ?? '', ['text', 'hardBreak'], true) || isset($child['marks'])) {
				$inline = true;
				break;
			}
		}

		if ($inline === false) {
			foreach ($content as $child) {
				static::collectText($child, $blocks);
			}
			return;
		}

		$text = '';
		foreach ($content as $child) {
			$text .= match ($child['type'] ?? '') {
				'text'      => $child['text'] ?? '',
				'hardBreak' => "\n",
				default     => '',
			};
		}

		$visible = static::visibleText($text);

		if ($visible !== '') {
			$blocks[] = $visible;
		}
	}

	private static function visibleText(string $text): string
	{
		return preg_replace_callback('!(?=[^\]])(?=\([a-z0-9_-]+:)(\((?:[^()]+|(?1))*+\))!is', function ($match) {
			try {
				$tag = KirbyTag::parse($match[0]);
			} catch (Throwable) {
				return '';
			}

			if (($tag->attrs['text'] ?? '') !== '') {
				return $tag->attrs['text'];
			}

			return in_array($tag->type, ['link', 'email', 'tel'], true) ? (string)$tag->value : '';
		}, $text);
	}
}
