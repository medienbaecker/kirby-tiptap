<?php

namespace Medienbaecker\Tiptap;

use Kirby\Exception\Exception;
use Kirby\Uuid\Uuid;

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
			],
			[
				'pattern' => 'process-kirbytag',
				'method' => 'POST',
				'action' => function () {
					$kirbyTag = $this->requestBody('kirbyTag');

					// Get UUID configuration from Field helper
					$uuid = Field::getUuidConfig();

					// Process the KirbyTag to convert UUIDs if needed
					$processedText = Api::processKirbyTag($kirbyTag, $uuid);

					return ['text' => $processedText];
				}
			]
		];
	}

	/**
	 * Process KirbyTag, converting UUIDs based on configuration
	 * @param string $kirbyTag The original KirbyTag text
	 * @param array $uuid UUID configuration array
	 * @return string Processed KirbyTag text
	 */
	public static function processKirbyTag($kirbyTag, $uuid)
	{
		if (!$kirbyTag) {
			return $kirbyTag;
		}

		// Parse KirbyTag - extract type and parameters
		if (!preg_match('/^\(([^:]+):\s*([^)]+)\)$/', $kirbyTag, $matches)) {
			return $kirbyTag; // Not a KirbyTag, return as-is
		}

		$tagType = trim($matches[1]);
		$content = trim($matches[2]);

		// Handle link tags
		if ($tagType === 'link') {
			if (strpos($content, ' text:') !== false) {
				$parts = explode(' text:', $content, 2);
				$href = trim($parts[0]);
				$text = trim($parts[1]);
			} else {
				$href = $content;
				$text = null;
			}

			// Convert UUIDs if needed
			if (strpos($href, 'page://') === 0 && !$uuid['pages']) {
				$href = static::convertPageUuidToId($href);
			}
			
			if (strpos($href, 'file://') === 0 && !$uuid['files']) {
				$href = static::convertFileUuidToFilename($href);
			}

			return $text !== null ? "({$tagType}: {$href} text: {$text})" : "({$tagType}: {$href})";
		}

		// For file tags (image, file, video), check for file UUIDs
		if (in_array($tagType, ['image', 'file', 'video']) && strpos($content, 'file://') === 0) {
			if (!$uuid['files']) {
				$content = static::convertFileUuidToFilename($content);
			}

			return "({$tagType}: {$content})";
		}

		// Return unchanged if no UUID conversion needed
		return $kirbyTag;
	}

	/**
	 * Convert page UUID to id
	 * @param string $pageUuid The page UUID (e.g., "page://abc123")
	 * @return string The page id or original UUID if conversion fails
	 */
	private static function convertPageUuidToId($pageUuid)
	{
		try {
			$page = Uuid::for($pageUuid)?->model();
			return $page ? $page->id() : $pageUuid;
		} catch (Exception $e) {
			return $pageUuid;
		}
	}

	/**
	 * Convert file UUID to filename
	 * @param string $fileUuid The file UUID (e.g., "file://xyz789")
	 * @return string The filename or original UUID if conversion fails
	 */
	private static function convertFileUuidToFilename($fileUuid)
	{
		try {
			$file = Uuid::for($fileUuid)?->model();
			return $file ? $file->filename() : $fileUuid;
		} catch (Exception $e) {
			return $fileUuid;
		}
	}
}
