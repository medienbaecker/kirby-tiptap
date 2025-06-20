<?php

namespace Medienbaecker\Tiptap;

use Kirby\Exception\Exception;

/**
 * Tiptap field API endpoints
 */
class Api
{
	/**
	 * Get API endpoint definitions
	 */
	public static function endpoints(): array
	{
		return [
			[
				'pattern' => 'files',
				'action' => function () {
					return $this->field()->filepicker([
						'query' => 'page.files',
						'page'   => $this->requestQuery('page'),
						'search' => $this->requestQuery('search')
					]);
				}
			],
			[
				'pattern' => 'upload',
				'method' => 'POST',
				'action' => function () {
					$field   = $this->field();
					$uploads = $field->uploads();

					if ($uploads === false) {
						throw new Exception('Uploads are disabled for this field');
					}

					$model = $field->model();
					$parent = $model;

					// Handle custom parent if specified
					if (!empty($uploads['parent'])) {
						$parent = $model->query($uploads['parent']);
						if (!$parent) {
							throw new Exception('Upload parent not found');
						}
					}

					// Get the uploaded file
					$upload = $_FILES['file'] ?? null;
					if (!$upload || $upload['error'] !== UPLOAD_ERR_OK) {
						throw new Exception('No file uploaded or upload error');
					}

					// Create the file
					$file = $parent->createFile([
						'source' => $upload['tmp_name'],
						'filename' => $upload['name'],
						'template' => $uploads['template'] ?? null,
					]);

					$absolute = $model->is($parent) === false;

					// Return in the expected format with both filename and uuid
					return [
						'data' => [[
							'filename' => $file->filename(),
							'uuid' => $file->uuid(),
							'mime' => $file->mime(),
							'dragText' => $file->panel()->dragText('auto', $absolute),
						]]
					];
				}
			]
		];
	}
}
