<?php

declare(strict_types=1);

namespace Medienbaecker\Tiptap;

trait ParsedownTreeTrait
{
	private array $disabledConstructs = [];

	public function setDisabled(array $constructs): void
	{
		$this->disabledConstructs = $constructs;

		// An underscore in a tag's URL would otherwise pair into emphasis
		$this->InlineTypes['('] = ['Kirbytag'];
		$this->inlineMarkerList .= '(';

		$this->setUrlsLinked(false);
	}

	public function isDisabled(string $construct): bool
	{
		return isset($this->disabledConstructs[$construct]);
	}

	public function blocks(string $text): array
	{
		return $this->textElements($text);
	}

	public function call(string $function, mixed $argument): mixed
	{
		return $this->$function($argument);
	}

	protected function inlineKirbytag($Excerpt)
	{
		$ranges = MarkdownSerializer::findKirbyTagRanges($Excerpt['text']);
		if ($ranges === [] || $ranges[0][0] !== 0) {
			return null;
		}
		$raw = substr($Excerpt['text'], 0, $ranges[0][1]);
		return ['extent' => strlen($raw), 'element' => ['rawHtml' => $raw]];
	}

	private function asSource(array $Inline, array $Excerpt): array
	{
		return [
			'extent' => $Inline['extent'],
			'element' => [
				'rawHtml' => substr($Excerpt['text'], 0, $Inline['extent']),
				'_protect' => true,
			],
		];
	}

	protected function inlineEscapeSequence($Excerpt)
	{
		$Inline = parent::inlineEscapeSequence($Excerpt);
		if ($Inline !== null) {
			$Inline['element'] = ['text' => $Excerpt['text'][1]];
		}
		return $Inline;
	}

	protected function inlineImage($Excerpt)
	{
		$Inline = parent::inlineImage($Excerpt);
		return $Inline === null ? null : $this->asSource($Inline, $Excerpt);
	}

	protected function inlineUrlTag($Excerpt)
	{
		$Inline = parent::inlineUrlTag($Excerpt);
		return $Inline === null ? null : $this->asSource($Inline, $Excerpt);
	}

	protected function inlineCode($Excerpt)
	{
		$Inline = parent::inlineCode($Excerpt);
		if ($Inline === null) {
			return null;
		}
		if ($this->isDisabled('code') || preg_match('/`|^\s*$/', (string)($Inline['element']['text'] ?? '')) === 1) {
			return $this->asSource($Inline, $Excerpt);
		}
		return $Inline;
	}

	protected function inlineEmphasis($Excerpt)
	{
		$Inline = parent::inlineEmphasis($Excerpt);
		if ($Inline === null) {
			return null;
		}
		$mark = ($Inline['element']['name'] ?? '') === 'strong' ? 'bold' : 'italic';
		return $this->isDisabled($mark) ? $this->asSource($Inline, $Excerpt) : $Inline;
	}

	protected function inlineStrikethrough($Excerpt)
	{
		$Inline = parent::inlineStrikethrough($Excerpt);
		if ($Inline === null) {
			return null;
		}
		return $this->isDisabled('strike') ? $this->asSource($Inline, $Excerpt) : $Inline;
	}

	private function open($Block, $Line)
	{
		if (is_array($Block) === false) {
			return $Block;
		}
		$Block['_src'] = [$Line['body']];
		return $this->carry($Block);
	}

	private function add($Block, $Line)
	{
		if (is_array($Block) === false) {
			return $Block;
		}
		$Block['_src'][] = $Line['body'];
		return $this->carry($Block);
	}

	private function carry($Block)
	{
		if (is_array($Block) && isset($Block['element'], $Block['_src'])) {
			$Block['element']['_src'] = implode("\n", $Block['_src']);
		}
		return $Block;
	}

	protected function blockCode($Line, $Block = null) { return $this->open(parent::blockCode($Line, $Block), $Line); }
	protected function blockCodeContinue($Line, $Block) { return $this->add(parent::blockCodeContinue($Line, $Block), $Line); }
	protected function blockCodeComplete($Block) { return $this->carry(parent::blockCodeComplete($Block)); }
	protected function blockComment($Line) { return $this->open(parent::blockComment($Line), $Line); }
	protected function blockCommentContinue($Line, array $Block) { return $this->add(parent::blockCommentContinue($Line, $Block), $Line); }
	protected function blockFencedCode($Line) { return $this->open(parent::blockFencedCode($Line), $Line); }
	protected function blockFencedCodeContinue($Line, $Block) { return $this->add(parent::blockFencedCodeContinue($Line, $Block), $Line); }
	protected function blockFencedCodeComplete($Block) { return $this->carry(parent::blockFencedCodeComplete($Block)); }
	protected function blockHeader($Line) { return $this->open(parent::blockHeader($Line), $Line); }
	protected function blockList($Line, ?array $CurrentBlock = null) { return $this->open(parent::blockList($Line, $CurrentBlock), $Line); }
	protected function blockListContinue($Line, array $Block) { return $this->add(parent::blockListContinue($Line, $Block), $Line); }
	protected function blockListComplete(array $Block) { return $this->carry(parent::blockListComplete($Block)); }
	protected function blockQuote($Line) { return $this->open(parent::blockQuote($Line), $Line); }
	protected function blockQuoteContinue($Line, array $Block) { return $this->add(parent::blockQuoteContinue($Line, $Block), $Line); }
	protected function blockRule($Line) { return $this->open(parent::blockRule($Line), $Line); }
	protected function blockSetextHeader($Line, ?array $Block = null) { return $this->add(parent::blockSetextHeader($Line, $Block), $Line); }
	protected function blockMarkup($Line) { return $this->open(parent::blockMarkup($Line), $Line); }
	protected function blockMarkupContinue($Line, array $Block) { return $this->add(parent::blockMarkupContinue($Line, $Block), $Line); }
	protected function blockTableContinue($Line, array $Block) { return $this->add(parent::blockTableContinue($Line, $Block), $Line); }
	protected function paragraph($Line) { return $this->open(parent::paragraph($Line), $Line); }

	// Parsedown looks back at the preceding paragraph, which is the header row
	protected function blockTable($Line, ?array $Block = null)
	{
		$New = parent::blockTable($Line, $Block);
		if (is_array($New) === false) {
			return $New;
		}
		$New['_src'] = [...($Block['_src'] ?? []), $Line['body']];
		return $this->carry($New);
	}
}
