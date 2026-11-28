<?php

namespace Medienbaecker\Tiptap;

use Kirby\Blueprint\Blueprint;
use Kirby\Exception\InvalidArgumentException;
use Kirby\Form\Field\StringField;
use Kirby\Form\Form;
use Kirby\Form\Mixin;
use Kirby\Reflection\Attributes\Prop;

class TiptapField extends StringField
{
	use Mixin\Counter;
	use Mixin\Upload;

	#[Prop]
	protected array|bool|null $buttons = null;

	#[Prop]
	protected array|null $extensions = null;

	#[Prop]
	protected array|string|null $files = null;

	#[Prop]
	protected string|null $format = null;

	#[Prop]
	protected bool $inline = false;

	#[Prop]
	protected bool|null $kirbytags = null;

	#[Prop]
	protected array|null $links = null;

	#[Prop]
	protected bool $pretty = false;

	#[Prop]
	protected string $size = 'auto';

	protected bool|null $spellcheck = true;

	public function api(): array
	{
		return Api::endpoints();
	}

	public function buttons(): array
	{
		return Field::buttons($this->buttons);
	}

	/**
	 * In debug mode, explains tiptap fields that a tag dialog can't use
	 * as configured: its values are tag attributes, written as inline Markdown
	 */
	protected function checkTagDialogFields(array $fields, bool $tiptap): void
	{
		if ($this->kirby()->option('debug') !== true) {
			return;
		}

		foreach (Blueprint::fieldsProps($fields) as $name => $field) {
			if (($field['type'] ?? null) !== 'tiptap') {
				continue;
			}

			if ($tiptap === false) {
				throw new InvalidArgumentException(
					message: 'The link dialog can\'t use the tiptap field "' . $name . '": Kirby escapes link attributes, so its Markdown would show as text'
				);
			}

			$ignored = array_filter([
				'format' => ($field['format'] ?? 'markdown') !== 'markdown',
				'inline' => ($field['inline'] ?? true) !== true,
			]);

			if ($ignored !== []) {
				throw new InvalidArgumentException(
					message: 'The ' . implode(' and ', array_keys($ignored)) .
						(count($ignored) === 1 ? ' option has' : ' options have') .
						' no effect on the tiptap field "' . $name . '" in a dialog, which always writes inline Markdown'
				);
			}
		}
	}

	/**
	 * Resolves blueprint fields for a dialog the way Kirby's own dialogs do:
	 * shorthands, translated labels and options
	 */
	protected function dialogFields(array $fields): array
	{
		$form = new Form(
			fields: Blueprint::fieldsProps($fields),
			model:  $this->model()
		);

		return $form->fields()->toProps(defaults: true);
	}

	public function dialogs(): array
	{
		return [
			'files' => fn () => new FileDialogController($this)
		];
	}

	public function extensions(): array|null
	{
		return $this->extensions === null ? null : $this->withDialogFields($this->extensions);
	}

	public function fill(mixed $value): static
	{
		return parent::fill(
			Field::load($value, $this->format(), $this->buttons(), $this->kirby())
		);
	}

	public function files(): array
	{
		$files = $this->files ?? [];

		if (is_string($files) === true) {
			return ['query' => $files];
		}

		if (isset($files['fields']) === true && is_array($files['fields']) === true) {
			$this->checkTagDialogFields($files['fields'], tiptap: true);
			$files['fields'] = $this->dialogFields($files['fields']);
		}

		return $files;
	}

	public function format(): string
	{
		$format = $this->format ?? option('medienbaecker.tiptap.format', 'markdown');

		if (in_array($format, ['json', 'markdown'], true) === false) {
			throw new InvalidArgumentException(
				message: 'Invalid tiptap format "' . $format . '", expected "json" or "markdown"'
			);
		}

		return $format;
	}

	public function inline(): bool
	{
		return $this->inline;
	}

	public function kirbytags(): bool
	{
		return $this->kirbytags ?? option('medienbaecker.tiptap.kirbytags', false);
	}

	public function links(): array
	{
		$links = $this->links ?? [];

		if (isset($links['fields']) === true && is_array($links['fields']) === true) {
			$this->checkTagDialogFields($links['fields'], tiptap: false);
			$links['fields'] = $this->dialogFields($links['fields']);
		}

		return $links;
	}

	public function pretty(): bool
	{
		return $this->pretty;
	}

	public function props(): array
	{
		return [
			...parent::props(),
			'kirbytagAttributes' => Field::kirbytagAttributes($this->kirby()),
			'kirbytagItems'      => $this->kirbytags() ? null : (Field::modelItems(Field::modelTags($this->toFormValue()), $this->model()) ?: null),
			'uuid'               => Field::getUuidConfig()
		];
	}

	public function size(): string
	{
		return $this->size;
	}

	public function toStoredValue(): mixed
	{
		return Field::store(
			$this->toFormValue(),
			$this->format(),
			$this->inline(),
			$this->buttons(),
			$this->kirby()
		);
	}

	protected function validations(): array
	{
		return Validations::rules();
	}

	/**
	 * Resolves every `fields` map in extension options as dialog fields
	 */
	protected function withDialogFields(array $options): array
	{
		foreach ($options as $key => $value) {
			if (is_array($value) === true) {
				$options[$key] = $key === 'fields' && array_is_list($value) === false
					? $this->dialogFields($value)
					: $this->withDialogFields($value);
			}
		}

		return $options;
	}
}
