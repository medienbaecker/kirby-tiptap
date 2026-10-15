<?php

namespace Medienbaecker\Tiptap;

use Kirby\Blueprint\Blueprint;
use Kirby\Exception\InvalidArgumentException;
use Kirby\Form\Field\StringField;
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
	protected array|string|null $files = null;

	#[Prop]
	protected string|null $format = null;

	#[Prop]
	protected bool $inline = false;

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
		if ($this->buttons === false) {
			return [];
		}

		if (is_array($this->buttons) === true) {
			return $this->buttons;
		}

		return [
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
		];
	}

	public function files(): array
	{
		$files = $this->files ?? [];

		if (is_string($files) === true) {
			return ['query' => $files];
		}

		if (isset($files['fields']) === true && is_array($files['fields']) === true) {
			$files['fields'] = Blueprint::fieldsProps($files['fields']);
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
		$format = $this->format ?? option('medienbaecker.tiptap.format', 'json');

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

	public function links(): array
	{
		$links = $this->links ?? [];

		if (isset($links['fields']) === true && is_array($links['fields']) === true) {
			$links['fields'] = Blueprint::fieldsProps($links['fields']);
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
			'kirbytags' => Field::kirbytags($this->kirby()),
			'uuid'      => Field::getUuidConfig()
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
			$this->kirby()
		);
	}

	protected function validations(): array
	{
		return Validations::rules();
	}
}
