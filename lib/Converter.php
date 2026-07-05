<?php

declare(strict_types=1);

namespace Medienbaecker\Tiptap;

use Kirby\CLI\CLI;
use Kirby\Cms\Fieldsets;
use Kirby\Data\Data;
use Kirby\Text\Markdown;
use Tiptap\Editor;

/**
 * CLI converter: converges stored tiptap content to the blueprint's
 * format across top-level fields, structure rows and blocks.
 */
class Converter
{
	private CLI $cli;
	private array $config;
	private array $kirbytags;
	private int $processed = 0;
	private int $errors = 0;
	private int $toJson = 0;
	private int $toMarkdown = 0;
	private int $skipped = 0;

	public function __construct(CLI $cli)
	{
		$this->cli = $cli;
		$this->config = [
			'pageFilter' => $cli->arg('page'),
			'dryRun' => $cli->arg('dry-run'),
		];
		$this->kirbytags = Field::kirbytags(kirby());
	}

	public function run(): void
	{
		$this->showRunMode();

		foreach ($this->models() as $model) {
			$this->convertModel($model);
		}

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

	private function models(): \Generator
	{
		if ($this->config['pageFilter']) {
			$startPage = page($this->config['pageFilter']);
			if (!$startPage) {
				throw new \Exception('Page not found: ' . $this->config['pageFilter']);
			}
			$this->cli->info('Processing from page: ' . $startPage->title() . ' (' . $startPage->id() . ')');
			$pages = $startPage->index(true)->prepend($startPage);
		} else {
			$site = site();
			yield $site;
			yield from $site->files();
			foreach (kirby()->users() as $user) {
				yield $user;
				yield from $user->files();
			}
			$pages = $site->index(true);
		}

		foreach ($pages as $page) {
			yield $page;
			yield from $page->files();
		}
	}

	private function label($model): string
	{
		return match (true) {
			$model instanceof \Kirby\Cms\Site => '🌐 site',
			$model instanceof \Kirby\Cms\File => '📄 ' . $model->id(),
			$model instanceof \Kirby\Cms\User => '👤 ' . ($model->email() ?: $model->id()),
			default => '📁 /' . $model->id(),
		};
	}

	private function convertModel($model): void
	{
		try {
			$entries = $this->tiptapEntries($model->blueprint()->fields());
		} catch (\Throwable $e) {
			$this->cli->red()->out($this->label($model) . ' Error: ' . $e->getMessage());
			$this->errors++;
			return;
		}

		if ($entries === []) {
			return;
		}

		$this->cli->out($this->label($model));

		try {
			if ($model->version('changes')->exists('*')) {
				// A draft published later would overwrite the migration
				$this->cli->yellow()->out('  ! unsaved Panel changes, skipped');
				$this->skipped++;
				$this->cli->out('');
				return;
			}

			$languages = kirby()->multilang() ? kirby()->languages() : [null];
			$modelChanged = false;

			foreach ($languages as $language) {
				$code = $language?->code();

				// Untranslated models fall back to default-language content;
				// converting would materialize a translation that never existed
				if ($code !== null && $model->translation($code)->exists() === false) {
					continue;
				}

				$updates = [];

				foreach ($entries as $entry) {
					$this->collectUpdates($model, $entry, $code, $updates);
				}

				if ($updates !== []) {
					if (!$this->config['dryRun']) {
						kirby()->impersonate('kirby', function () use ($model, $updates, $code) {
							$model->update($updates, $code);
						});
					}
					$modelChanged = true;
				}
			}

			if ($modelChanged) {
				$this->processed++;
			} else {
				$this->cli->dim()->out('  No changes needed');
			}
		} catch (\Throwable $e) {
			$this->cli->red()->out('  Error: ' . $e->getMessage());
			$this->errors++;
		}

		$this->cli->out('');
	}

	private function collectUpdates($model, array $entry, ?string $code, array &$updates): void
	{
		$fieldName = $entry['field'];
		$value = $model->content($code)->get($fieldName)->value();

		if ($value === null || trim($value) === '') {
			return;
		}

		switch ($entry['kind']) {
			case 'legacy':
			case 'top-json':
				$result = $this->textToJson($value, $fieldName);
				if ($result !== null) {
					$updates[$fieldName] = $result;
					$this->toJson++;
					$this->cli->green()->out(
						'  ✓ ' . $this->fieldLabel($fieldName, $code) . ': converted ' . strlen($value) . ' characters'
					);
				}
				break;

			case 'top-markdown':
				$label = $this->fieldLabel($fieldName, $code);
				$decoded = json_decode($value, true);
				if (is_array($decoded) === false || ($decoded['type'] ?? null) !== 'doc') {
					$this->cli->dim()->out('  - ' . $label . ': already markdown');
					break;
				}
				$result = $this->docToMarkdown($decoded, $value, $model, $entry['inline']);
				if (isset($result['markdown'])) {
					$updates[$fieldName] = $result['markdown'];
					$this->toMarkdown++;
					$this->reportConversion($label, $result);
				} else {
					$this->skipped++;
					$this->cli->yellow()->out('  ! ' . $label . ': skipped (' . $result['reason'] . ')');
				}
				break;

			case 'structure':
				$this->collectStructure($model, $entry, $code, $value, $updates);
				break;

			case 'blocks':
				$this->collectBlocks($model, $entry, $code, $value, $updates);
				break;
		}
	}

	private function collectStructure($model, array $entry, ?string $code, string $value, array &$updates): void
	{
		$rows = Data::decode($value, 'yaml');
		if (is_array($rows) === false) {
			return;
		}

		$single = $entry['single'];
		$list = $single ? [$rows] : $rows;
		$changed = false;

		foreach ($list as $index => $row) {
			if (is_array($row) === false) {
				continue;
			}
			foreach ($entry['subfields'] as $key => $options) {
				$stored = $row[$key] ?? null;
				if (is_string($stored) === false || trim($stored) === '') {
					continue;
				}
				$decoded = json_decode($stored, true);
				if (is_array($decoded) === false || ($decoded['type'] ?? null) !== 'doc') {
					continue;
				}
				$path = $single
					? $entry['field'] . '.' . $key
					: $entry['field'] . '[' . $index . '].' . $key;
				$label = $this->fieldLabel($path, $code);
				$result = $this->docToMarkdown($decoded, $stored, $model, $options['inline']);
				if (isset($result['markdown'])) {
					$list[$index][$key] = $result['markdown'];
					$changed = true;
					$this->toMarkdown++;
					$this->reportConversion($label, $result);
				} else {
					$this->skipped++;
					$this->cli->yellow()->out('  ! ' . $label . ': skipped (' . $result['reason'] . ')');
				}
			}
		}

		if ($changed) {
			// Pass arrays: Kirby's field stores re-encode YAML themselves
			$updates[$entry['field']] = $single ? $list[0] : $list;
		}
	}

	private function collectBlocks($model, array $entry, ?string $code, string $value, array &$updates): void
	{
		$decoded = json_decode($value, true);
		if (is_array($decoded) === false) {
			return;
		}

		$changed = false;

		if ($entry['layout']) {
			foreach ($decoded as $r => $row) {
				foreach ($row['columns'] ?? [] as $c => $column) {
					foreach ($column['blocks'] ?? [] as $b => $block) {
						if (is_array($block) === false) {
							continue;
						}
						$path = $entry['field'] . '[' . $r . '][' . $c . '][' . $b . ']';
						$this->convertBlock(
							$decoded[$r]['columns'][$c]['blocks'][$b],
							$entry['map'],
							$path,
							$code,
							$model,
							$changed
						);
					}
				}
			}
		} else {
			foreach ($decoded as $b => $block) {
				if (is_array($block) === false) {
					continue;
				}
				$path = $entry['field'] . '[' . $b . ']';
				$this->convertBlock($decoded[$b], $entry['map'], $path, $code, $model, $changed);
			}
		}

		if ($changed) {
			// Pass arrays: the blocks store re-encodes with Kirby's JSON flags
			$updates[$entry['field']] = $decoded;
		}
	}

	private function convertBlock(array &$block, array $map, string $path, ?string $code, $model, bool &$changed): void
	{
		$fields = $map[$block['type'] ?? ''] ?? null;
		if ($fields === null) {
			return;
		}

		foreach ($fields as $key => $options) {
			$stored = $block['content'][$key] ?? null;
			if (is_string($stored) === false || trim($stored) === '') {
				continue;
			}
			$decoded = json_decode($stored, true);
			if (is_array($decoded) === false || ($decoded['type'] ?? null) !== 'doc') {
				continue;
			}
			$label = $this->fieldLabel($path . '.' . $key, $code);
			$result = $this->docToMarkdown($decoded, $stored, $model, $options['inline']);
			if (isset($result['markdown'])) {
				$block['content'][$key] = $result['markdown'];
				$changed = true;
				$this->toMarkdown++;
				$this->reportConversion($label, $result);
			} else {
				$this->skipped++;
				$this->cli->yellow()->out('  ! ' . $label . ': skipped (' . $result['reason'] . ')');
			}
		}
	}

	private function fieldLabel(string $path, ?string $code): string
	{
		return $code ? $path . ' (' . $code . ')' : $path;
	}

	private function textToJson(string $text, string $fieldName): ?string
	{
		// Skip content that's already Tiptap JSON
		$decoded = json_decode($text, true);
		if (is_array($decoded) && ($decoded['type'] ?? null) === 'doc') {
			return null;
		}

		try {
			$markdown = new Markdown();
			$html = $markdown->parse($text);

			$editor = new Editor();
			$editor->setContent($html);
			$document = $editor->getDocument();

			return json_encode($document);
		} catch (\Exception $e) {
			throw new \Exception("Failed to convert field '{$fieldName}': " . $e->getMessage());
		}
	}

	/**
	 * The render comparison is a migration report, not a gate: the
	 * field save handler converts on every write anyway
	 */
	private function docToMarkdown(array $doc, string $original, $model, bool $inline): array
	{
		$unsupported = MarkdownSerializer::findUnsupportedNodes($doc);
		if ($unsupported !== []) {
			return ['reason' => implode(', ', $unsupported)];
		}

		try {
			$markdown = MarkdownSerializer::serialize($doc, $this->kirbytags, $inline);

			$before = static::normalizeHtml(HtmlConverter::convert($original, $model, ['inline' => $inline]));
			$after = static::normalizeHtml(HtmlConverter::convert($markdown, $model, ['inline' => $inline]));

			return ['markdown' => $markdown, 'differs' => $before !== $after];
		} catch (\Throwable $e) {
			return ['reason' => $e->getMessage()];
		}
	}

	private function reportConversion(string $label, array $result): void
	{
		if ($result['differs'] ?? false) {
			$this->cli->yellow()->out('  ✓ ' . $label . ': converted to markdown (renders differently)');
		} else {
			$this->cli->green()->out('  ✓ ' . $label . ': converted to markdown');
		}
	}

	// Absorbs systemic renderer differences; structural ones still mismatch
	private static function normalizeHtml(string $html): string
	{
		$html = preg_replace('/<(br|hr)\s*\/>/i', '<$1>', $html);
		$html = preg_replace('/\s*class="language-[^"]*"/', '', $html);
		// The snippet renderer entity-encodes non-ASCII, Parsedown does not
		$html = html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');
		// Smartypants only reaches the markdown side
		$html = str_replace(
			['’', '‘', '“', '”', '„', '–', '—', '…'],
			["'", "'", '"', '"', '"', '-', '-', '...'],
			$html
		);
		$html = preg_replace('/\s+/u', ' ', trim($html));
		return preg_replace('/>\s</', '><', $html);
	}

	private function tiptapEntries(array $fields): array
	{
		$entries = [];

		foreach ($fields as $name => $field) {
			$type = $field['type'] ?? null;

			if ($type === 'textarea' || $type === 'markdown') {
				$entries[] = ['kind' => 'legacy', 'field' => $name];
				continue;
			}

			if ($type === 'tiptap') {
				$entries[] = [
					'kind' => $this->resolveFormat($field) === 'markdown' ? 'top-markdown' : 'top-json',
					'field' => $name,
					'inline' => ($field['inline'] ?? false) === true,
				];
				continue;
			}

			if (($type === 'structure' || $type === 'object') && isset($field['fields'])) {
				$subfields = [];
				foreach ($field['fields'] as $subName => $subField) {
					if (
						($subField['type'] ?? null) === 'tiptap' &&
						$this->resolveFormat($subField) === 'markdown'
					) {
						$subfields[$subName] = ['inline' => ($subField['inline'] ?? false) === true];
					}
				}
				if ($subfields !== []) {
					$entries[] = [
						'kind' => 'structure',
						'field' => $name,
						'single' => $type === 'object',
						'subfields' => $subfields,
					];
				}
				continue;
			}

			if ($type === 'blocks' || $type === 'layout') {
				$map = $this->blockFieldMap($field['fieldsets'] ?? null);
				if ($map !== []) {
					$entries[] = [
						'kind' => 'blocks',
						'field' => $name,
						'layout' => $type === 'layout',
						'map' => $map,
					];
				}
			}
		}

		return $entries;
	}

	/**
	 * Fieldsets::factory resolves every authored fieldset shape
	 * (string names, groups, extends)
	 */
	private function blockFieldMap(?array $fieldsets): array
	{
		try {
			$normalized = Fieldsets::factory($fieldsets);
		} catch (\Throwable) {
			return [];
		}

		$map = [];
		foreach ($normalized as $fieldset) {
			$fields = [];
			foreach ($fieldset->fields() as $key => $field) {
				if (
					($field['type'] ?? null) === 'tiptap' &&
					$this->resolveFormat($field) === 'markdown'
				) {
					$fields[$key] = ['inline' => ($field['inline'] ?? false) === true];
				}
			}
			if ($fields !== []) {
				$map[$fieldset->type()] = $fields;
			}
		}
		return $map;
	}

	private function resolveFormat(array $field): string
	{
		$format = $field['format'] ?? option('medienbaecker.tiptap.format', 'json');
		return $format === 'markdown' ? 'markdown' : 'json';
	}

	private function showSummary(): void
	{
		$this->cli->out('');
		$modelText = $this->processed === 1 ? 'model' : 'models';

		if ($this->config['dryRun']) {
			$this->cli->bold()->blue()->out('Dry run complete: ' . $this->processed . ' ' . $modelText . ' would be updated');
		} else {
			$this->cli->bold()->green()->out('Successfully converted ' . $this->processed . ' ' . $modelText);
		}

		$details = [];
		if ($this->toJson > 0) {
			$details[] = $this->toJson . ' field' . ($this->toJson === 1 ? '' : 's') . ' to JSON';
		}
		if ($this->toMarkdown > 0) {
			$details[] = $this->toMarkdown . ' field' . ($this->toMarkdown === 1 ? '' : 's') . ' to markdown';
		}
		if ($details !== []) {
			$this->cli->out(implode(', ', $details));
		}
		if ($this->skipped > 0) {
			$this->cli->yellow()->out($this->skipped . ' skipped');
		}
		if ($this->errors > 0) {
			$this->cli->bold()->red()->out($this->errors . ' models failed');
		}
	}
}
