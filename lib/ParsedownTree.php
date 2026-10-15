<?php

declare(strict_types=1);

namespace Medienbaecker\Tiptap;

interface ParsedownTree
{
	public function blocks(string $text): array;
	public function call(string $function, mixed $argument): mixed;
	public function isDisabled(string $construct): bool;
	public function setDisabled(array $constructs): void;
	public function setBreaksEnabled($breaksEnabled);
	public function setSafeMode($safeMode);
}
