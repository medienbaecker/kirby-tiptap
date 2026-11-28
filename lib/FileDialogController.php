<?php

namespace Medienbaecker\Tiptap;

use Kirby\Panel\Controller\Dialog\FilePickerDialogController;

/**
 * Kirby's file picker with the dialog fields of a file tag below the files
 */
class FileDialogController extends FilePickerDialogController
{
	protected array $fields;

	public function __construct(TiptapField $field)
	{
		$files        = $field->files();
		$this->fields = $files['fields'] ?? [];

		parent::__construct(...[
			'limit'    => 20,
			...array_intersect_key($files, array_flip(['hasSearch', 'image', 'info', 'layout', 'limit', 'query', 'size', 'text'])),
			'max'      => 1,
			'model'    => $field->model(),
			'multiple' => false,
		]);
	}

	public function props(): array
	{
		$editing = $this->request->get('editing') === 'true';
		$field   = $this->request->get('field');
		$props   = parent::props();
		$id      = $props['value'][0] ?? null;
		$file    = $id ? $this->find($id) : null;

		return [
			...$props,
			'component'    => 'tiptap-file-dialog',
			'fields'       => $this->fields,
			'file'         => $file ? $this->item($file) : null,
			'payload'      => ['editing' => $editing, 'field' => $field],
			'submitButton' => $this->i18n($editing ? 'change' : 'insert'),
			'tags'         => Field::kirbytagAttributes($this->kirby),
		];
	}
}
