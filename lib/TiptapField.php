<?php

namespace Medienbaecker\Tiptap;

use Kirby\Blueprint\Blueprint;
use Kirby\Exception\InvalidArgumentException;
use Kirby\Form\Field\InputField;
use Kirby\Form\Mixin;
use Kirby\Panel\Collector\FilesCollector;

class TiptapField extends InputField
{
	use Mixin\Maxlength;
	use Mixin\Minlength;
	use Mixin\Spellcheck;
	use Mixin\Upload;

	protected array|bool|null $buttons;
	protected mixed $files;
	protected string|null $format;
	protected bool|null $inline;
	protected mixed $links;
	protected bool|null $pretty;
	protected string|null $size;
	protected string $value = '';

	public function __construct(
		bool|null $autofocus = null,
		array|bool|null $buttons = null,
		mixed $default = null,
		bool|null $disabled = null,
		mixed $files = null,
		string|null $format = null,
		array|string|null $help = null,
		bool|null $inline = null,
		array|string|null $label = null,
		mixed $links = null,
		int|null $maxlength = null,
		int|null $minlength = null,
		string|null $name = null,
		bool|null $pretty = null,
		bool|null $required = null,
		string|null $size = null,
		bool|null $spellcheck = null,
		bool|null $translate = null,
		mixed $uploads = null,
		array|null $when = null,
		string|null $width = null
	) {
		parent::__construct(
			autofocus: $autofocus,
			default: $default,
			disabled: $disabled,
			help: $help,
			label: $label,
			name: $name,
			required: $required,
			translate: $translate,
			when: $when,
			width: $width
		);

		$this->buttons    = $buttons;
		$this->files      = $files;
		$this->format     = $format;
		$this->inline     = $inline;
		$this->links      = $links;
		$this->maxlength  = $maxlength;
		$this->minlength  = $minlength;
		$this->pretty     = $pretty;
		$this->size       = $size;
		$this->spellcheck = $spellcheck;
		$this->uploads    = $uploads;
	}

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
		$files = $this->files;

		if (is_string($files) === true) {
			return ['query' => $files];
		}

		if (is_array($files) === false) {
			$files = [];
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
		return $this->inline ?? false;
	}

	public function kirbytags(): array
	{
		return Field::kirbytags($this->kirby());
	}

	public function links(): array
	{
		$links = is_array($this->links) === true ? $this->links : [];

		if (isset($links['fields']) === true && is_array($links['fields']) === true) {
			$links['fields'] = Blueprint::fieldsProps($links['fields']);
		}

		return $links;
	}

	public function pretty(): bool
	{
		$pretty = $this->pretty ?? false;

		// Markdown storage never pretty-prints; surface the
		// misconfiguration instead of silently ignoring it
		if ($pretty === true && $this->format() === 'markdown') {
			throw new InvalidArgumentException(
				message: 'The pretty option has no effect with format: markdown'
			);
		}

		return $pretty;
	}

	public function props(): array
	{
		return [
			...parent::props(),
			'buttons'    => $this->buttons(),
			'files'      => $this->files(),
			'format'     => $this->format(),
			'inline'     => $this->inline(),
			'kirbytags'  => $this->kirbytags(),
			'links'      => $this->links(),
			'maxlength'  => $this->maxlength(),
			'minlength'  => $this->minlength(),
			'pretty'     => $this->pretty(),
			'size'       => $this->size(),
			'spellcheck' => $this->spellcheck(),
			'uploads'    => $this->uploads(),
			'uuid'       => $this->uuid()
		];
	}

	public function size(): string
	{
		return $this->size ?? 'auto';
	}

	public function spellcheck(): bool
	{
		return $this->spellcheck ?? true;
	}

	public function toStoredValue(): mixed
	{
		return Field::store(
			$this->toFormValue(),
			$this->format(),
			$this->inline() === true,
			$this->kirby()
		);
	}

	public function uuid(): array
	{
		return Field::getUuidConfig();
	}

	protected function validations(): array
	{
		return Validations::rules();
	}
}
