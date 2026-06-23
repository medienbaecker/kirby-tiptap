<?php

declare(strict_types=1);

namespace Medienbaecker\Tiptap;

use Kirby\CLI\CLI;
use Kirby\Text\Markdown;
use Tiptap\Editor;

class TextareaConverter
{
	private CLI $cli;
	private array $config;
	private int $processed = 0;
	private int $errors = 0;

	public function __construct(CLI $cli)
	{
		$this->cli = $cli;
		$this->config = [
			'pageFilter' => $cli->arg('page'),
			'dryRun' => $cli->arg('dry-run'),
		];
	}

	public function run(): void
	{
		$this->showRunMode();

		$pages = $this->getPages();
		$this->convertPages($pages);
		$this->showSummary();
	}

	private function showRunMode(): void
	{
		if ($this->config['dryRun']) {
			$this->cli->bold()->blue()->out('DRY RUN MODE - no files will be updated');
		} else {
			$this->cli->bold()->yellow()->out('Files will be updated with converted content');
		}
		$this->cli->out('');
	}

	private function getPages()
	{
		if ($this->config['pageFilter']) {
			$startPage = page($this->config['pageFilter']);
			if (!$startPage) {
				throw new \Exception('Page not found: ' . $this->config['pageFilter']);
			}
			$this->cli->info('Processing from page: ' . $startPage->title() . ' (' . $startPage->id() . ')');
			return $startPage->index(true)->prepend($startPage);
		}

		return site()->index(true);
	}

	private function convertPages($pages): void
	{
		// Convert every language on multilang sites; [null] = default language only.
		$languages = kirby()->multilang() ? kirby()->languages() : [null];

		foreach ($pages as $page) {
			$this->cli->out('📁 /' . $page->id());

			try {
				$blueprint = $page->blueprint();
				$fields = $this->getTextareaFields($blueprint);

				if (empty($fields)) {
					$this->cli->dim()->out('  No textarea fields found');
					continue;
				}

				$pageChanged = false;

				foreach ($languages as $language) {
					$code = $language?->code();
					$updates = [];

					foreach ($fields as $fieldName) {
						$result = $this->convertField($page, $fieldName, $code);
						if ($result) {
							$updates[$fieldName] = $result['json'];
							$label = $code ? $fieldName . ' (' . $code . ')' : $fieldName;
							$this->cli->green()->out('  ✓ ' . $label . ': converted ' . $result['length'] . ' characters');
						}
					}

					if (!empty($updates)) {
						if (!$this->config['dryRun']) {
							kirby()->impersonate('kirby', function () use ($page, $updates, $code) {
								$page->update($updates, $code);
							});
						}
						$pageChanged = true;
					}
				}

				if ($pageChanged) {
					$this->processed++;
				} else {
					$this->cli->dim()->out('  No changes needed');
				}
			} catch (\Exception $e) {
				$this->cli->red()->out('  Error: ' . $e->getMessage());
				$this->errors++;
			}

			$this->cli->out('');
		}
	}

	private function getTextareaFields($blueprint): array
	{
		$textareaFields = [];
		$fields = $blueprint->fields();

		foreach ($fields as $fieldName => $field) {
			if ($field['type'] === 'textarea' || $field['type'] === 'markdown') {
				$textareaFields[] = $fieldName;
			}
		}

		return $textareaFields;
	}

	private function convertField($page, string $fieldName, ?string $languageCode = null): ?array
	{
		$content = $page->content($languageCode)->get($fieldName);

		if ($content->isEmpty()) {
			return null;
		}

		$textContent = $content->value();

		// Skip content that's already Tiptap JSON
		$decoded = json_decode($textContent, true);
		if (is_array($decoded) && ($decoded['type'] ?? null) === 'doc') {
			return null;
		}

		try {
			$markdown = new Markdown();
			$html = $markdown->parse($textContent);

			$editor = new Editor();
			$editor->setContent($html);
			$document = $editor->getDocument();
			$json = json_encode($document);

			return [
				'json' => $json,
				'length' => strlen($textContent)
			];
		} catch (\Exception $e) {
			throw new \Exception("Failed to convert field '{$fieldName}': " . $e->getMessage());
		}
	}

	private function showSummary(): void
	{
		$this->cli->out('');
		$pageText = $this->processed === 1 ? 'page' : 'pages';

		if ($this->config['dryRun']) {
			$this->cli->bold()->blue()->out('Dry run complete: ' . $this->processed . ' ' . $pageText . ' would be updated');
		} else {
			$this->cli->bold()->green()->out('Successfully converted ' . $this->processed . ' ' . $pageText);
		}

		if ($this->errors > 0) {
			$this->cli->bold()->red()->out($this->errors . ' pages failed');
		}
	}
}
