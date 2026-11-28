<?php

namespace Medienbaecker\Tiptap;

use Kirby\Blueprint\Blueprint;
use Kirby\Exception\InvalidArgumentException;
use Kirby\Form\Field\StringField;
use Kirby\Form\Form;
use Kirby\Form\Mixin;
use Kirby\Panel\Collector\FilesCollector;
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
	 * Resolves blueprint fields for a dialog the way Kirby's own dialogs do:
	 * shorthands, translated labels and options
	 */
	protected function dialogFields(array $fields, bool $writesTag = false): array
	{
		$fields = Blueprint::fieldsProps($fields);

		if ($writesTag === true) {
			foreach ($fields as $name => $field) {
				$ignored = array_filter([
					'format' => ($field['format'] ?? 'markdown') !== 'markdown',
					'inline' => ($field['inline'] ?? true) !== true,
				]);

				if (($field['type'] ?? null) === 'tiptap' && $ignored !== [] && $this->kirby()->option('debug') === true) {
					throw new InvalidArgumentException(
						message: 'The ' . implode(' and ', array_keys($ignored)) .
							(count($ignored) === 1 ? ' option has' : ' options have') .
							' no effect on the tiptap field "' . $name . '" in a dialog, which always writes inline Markdown'
					);
				}
			}
		}

		$form = new Form(
			fields: $fields,
			model:  $this->model()
		);

		return $form->fields()->toProps(defaults: true);
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
			$files['fields'] = $this->dialogFields($files['fields'], writesTag: true);
		}

		return $files;
	}

	public function filepicker(array $params = []): array
	{
		$collector = new FilesCollector(
			limit:  $params['limit']  ?? 20,
			page:   $params['page']   ?? 1,
			parent: $this->model(),
			query:  $params['query']  ?? null,
			search: $params['search'] ?? null
		);

		$files = $collector->models(paginated: true);

		return [
			'data' => $files->values(fn ($file) => $file->panel()->pickerData([
				'image'  => $params['image']  ?? [],
				'info'   => $params['info']   ?? false,
				'layout' => $params['layout'] ?? 'list',
				'model'  => $this->model(),
				'text'   => $params['text']   ?? '{{ file.filename }}'
			])),
			'pagination' => $collector->pagination()->toArray()
		];
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
			$links['fields'] = $this->dialogFields($links['fields'], writesTag: true);
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
