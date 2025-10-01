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
		foreach ($pages as $page) {
			$this->cli->out('📁 /' . $page->id());

			try {
				$blueprint = $page->blueprint();
				$fields = $this->getTextareaFields($blueprint);

				if (empty($fields)) {
					$this->cli->dim()->out('  No textarea fields found');
					continue;
				}

				$hasChanges = false;
				$updates = [];

				foreach ($fields as $fieldName) {
					$result = $this->convertField($page, $fieldName);
					if ($result) {
						$hasChanges = true;
						$updates[$fieldName] = $result['json'];
						$this->cli->green()->out('  ✓ ' . $fieldName . ': converted ' . $result['length'] . ' characters');
					}
				}

				if ($hasChanges && !$this->config['dryRun']) {
					kirby()->impersonate('kirby', function () use ($page, $updates) {
						$page->update($updates);
					});
					$this->processed++;
				} elseif ($hasChanges) {
					$this->processed++;
				}

				if (!$hasChanges) {
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

	private function convertField($page, string $fieldName): ?array
	{
		$content = $page->content()->get($fieldName);

		if ($content->isEmpty()) {
			return null;
		}

		$textContent = $content->value();

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
