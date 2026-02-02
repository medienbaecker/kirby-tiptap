<?php

namespace Medienbaecker\Tiptap;

use Kirby\Exception\Exception;
use Kirby\Text\KirbyTag;
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
			],
			[
				'pattern' => 'resolve-kirbytag',
				'method' => 'POST',
				'action' => function () {
					$reference = $this->requestBody('reference');
					$type = $this->requestBody('type');

					return Api::resolveKirbyTagReference($reference, $type, $this->field()->model());
				}
			],
			[
				'pattern' => 'check-kirbytags',
				'method' => 'POST',
				'action' => function () {
					$references = $this->requestBody('references') ?? [];
					$model = $this->field()->model();
					$results = [];

					foreach ($references as $ref) {
						$reference = $ref['reference'] ?? '';
						$type = $ref['type'] ?? '';

						try {
							Api::resolveKirbyTagReference($reference, $type, $model);
							$results[$reference] = true;
						} catch (\Throwable) {
							$results[$reference] = false;
						}
					}

					return ['results' => $results];
				}
			]
		];
	}

	/**
	 * Process KirbyTag, converting UUIDs based on configuration
	 * Uses Kirby's KirbyTag::parse() for proper attribute handling
	 */
	public static function processKirbyTag($kirbyTag, $uuid)
	{
		if (!$kirbyTag) {
			return $kirbyTag;
		}

		try {
			$tag = KirbyTag::parse($kirbyTag);
		} catch (\Throwable) {
			// Not a valid KirbyTag — return as-is
			return $kirbyTag;
		}

		// Only process link, image, file, video tags
		if (!in_array($tag->type, ['link', 'image', 'file', 'video'])) {
			return $kirbyTag;
		}

		$modified = false;

		// Convert main value if it's a UUID
		if (Uuid::is($tag->value, 'page') && !$uuid['pages']) {
			$tag->value = static::convertPageUuidToId($tag->value);
			$modified = true;
		}
		if (Uuid::is($tag->value, 'file') && !$uuid['files']) {
			$tag->value = static::convertFileUuidToFilename($tag->value);
			$modified = true;
		}

		// Check attributes for UUIDs too (e.g., 'link' attr in image tags)
		foreach ($tag->attrs as $key => $value) {
			if (Uuid::is($value, 'page') && !$uuid['pages']) {
				$tag->attrs[$key] = static::convertPageUuidToId($value);
				$modified = true;
			}
			if (Uuid::is($value, 'file') && !$uuid['files']) {
				$tag->attrs[$key] = static::convertFileUuidToFilename($value);
				$modified = true;
			}
		}

		if (!$modified) {
			return $kirbyTag;
		}

		return static::rebuildKirbyTag($tag);
	}

	/**
	 * Rebuild a KirbyTag string from parsed components
	 */
	private static function rebuildKirbyTag(KirbyTag $tag): string
	{
		$parts = [$tag->type . ': ' . $tag->value];
		foreach ($tag->attrs as $key => $value) {
			if ($value !== null && $value !== '') {
				$parts[] = $key . ': ' . $value;
			}
		}
		return '(' . implode(' ', $parts) . ')';
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
		} catch (Exception) {
			// UUID not resolvable — return original reference
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
		} catch (Exception) {
			// UUID not resolvable — return original reference
			return $fileUuid;
		}
	}

	/**
	 * Resolve a KirbyTag reference to a Panel URL
	 *
	 * @param string $reference The reference value (UUID, slug, filename, URL)
	 * @param string $type The KirbyTag type (link, image, file, video)
	 * @param mixed $model The parent model for context (resolving filenames)
	 * @return array{panelUrl?: string, url?: string, type: string}
	 */
	public static function resolveKirbyTagReference(string $reference, string $type, $model): array
	{
		// External URLs
		if (str_starts_with($reference, 'http://') || str_starts_with($reference, 'https://')) {
			return ['url' => $reference, 'type' => 'external'];
		}

		// Page UUID (page://xxx)
		if (Uuid::is($reference, 'page')) {
			try {
				$page = Uuid::for($reference)?->model();
				if ($page) {
					return ['panelUrl' => $page->panel()->path(), 'type' => 'page'];
				}
			} catch (\Throwable) {
				// Fall through to error
			}
			throw new Exception('Page not found');
		}

		// File UUID (file://xxx)
		if (Uuid::is($reference, 'file')) {
			try {
				$file = Uuid::for($reference)?->model();
				if ($file) {
					$parentPath = $file->parent()->panel()->path();
					return ['panelUrl' => $parentPath . '/files/' . $file->filename(), 'type' => 'file'];
				}
			} catch (\Throwable) {
				// Fall through to error
			}
			throw new Exception('File not found');
		}

		// File/image/video tags with a filename (has file extension)
		if (in_array($type, ['image', 'file', 'video']) && preg_match('/\.\w+$/', $reference)) {
			$file = $model->file($reference);
			if ($file) {
				$parentPath = $file->parent()->panel()->path();
				return ['panelUrl' => $parentPath . '/files/' . $file->filename(), 'type' => 'file'];
			}
			throw new Exception('File not found');
		}

		// Page slug/id (for link tags or anything that looks like a page reference)
		$page = kirby()->page($reference);
		if ($page) {
			return ['panelUrl' => $page->panel()->path(), 'type' => 'page'];
		}

		throw new Exception('Reference could not be resolved');
	}
}
