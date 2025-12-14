<?php

namespace Medienbaecker\Tiptap;

/**
 * Transforms Tiptap's flat mark structure into a nested tree for snippet rendering.
 *
 * Input:  [{ type: "text", text: "hello", marks: [{type: "bold"}] }]
 * Output: [{ type: "bold", content: [{ type: "text", text: "hello" }] }]
 */
class MarkProcessor
{
	/**
	 * Process a single node, transforming its content array if present.
	 */
	public function processNode(array $node): array
	{
		if (isset($node['content']) && is_array($node['content'])) {
			$node['content'] = $this->processContentArray($node['content']);
		}
		return $node;
	}

	/**
	 * Transform a flat content array into a nested tree based on marks.
	 */
	private function processContentArray(array $content): array
	{
		$result = [];
		$openMarks = [];
		$nodesStack = [&$result];

		foreach ($content as $child) {
			// Block nodes close all inline marks
			if ($this->isBlockNode($child)) {
				$this->closeMarksToDepth(0, $openMarks, $nodesStack);
				$result[] = $this->processNode($child);
				continue;
			}

			$childMarks = $child['marks'] ?? [];
			$commonDepth = $this->getCommonMarkDepth($openMarks, $childMarks);

			// Close marks no longer active
			$this->closeMarksToDepth($commonDepth, $openMarks, $nodesStack);

			// Open new marks
			$this->openNewMarks($commonDepth, $childMarks, $openMarks, $nodesStack);

			// Add content to deepest level
			$this->addContent($child, $nodesStack);
		}

		// Close remaining marks
		$this->closeMarksToDepth(0, $openMarks, $nodesStack);

		return $result;
	}

	/**
	 * Check if node is a block element (not inline text/hardBreak/kirbyTag).
	 */
	private function isBlockNode(array $node): bool
	{
		return match ($node['type'] ?? '') {
			'text', 'hardBreak', 'kirbyTag' => false,
			default => true,
		};
	}

	/**
	 * Find how many marks are shared between open marks and child marks.
	 */
	private function getCommonMarkDepth(array $openMarks, array $childMarks): int
	{
		$depth = 0;
		while (
			isset($openMarks[$depth], $childMarks[$depth]) &&
			$openMarks[$depth] == $childMarks[$depth]
		) {
			$depth++;
		}
		return $depth;
	}

	/**
	 * Close marks down to target depth.
	 */
	private function closeMarksToDepth(int $depth, array &$openMarks, array &$nodesStack): void
	{
		while (count($openMarks) > $depth) {
			array_pop($openMarks);
			array_pop($nodesStack);
		}
	}

	/**
	 * Open new marks from commonDepth onwards.
	 */
	private function openNewMarks(int $commonDepth, array $childMarks, array &$openMarks, array &$nodesStack): void
	{
		for ($i = $commonDepth; $i < count($childMarks); $i++) {
			$mark = $childMarks[$i];
			$newNode = $mark;
			$newNode['content'] = [];

			$stackTop = &$nodesStack[array_key_last($nodesStack)];
			$stackTop[] = $newNode;

			$openMarks[] = $mark;
			$newKey = array_key_last($stackTop);
			$nodesStack[] = &$stackTop[$newKey]['content'];
		}
	}

	/**
	 * Add content node to the current position in the tree.
	 */
	private function addContent(array $child, array &$nodesStack): void
	{
		$stackTop = &$nodesStack[array_key_last($nodesStack)];

		if ($child['type'] === 'text') {
			// Merge consecutive text nodes
			$lastKey = array_key_last($stackTop);
			if ($lastKey !== null && ($stackTop[$lastKey]['type'] ?? '') === 'text') {
				$stackTop[$lastKey]['text'] .= $child['text'];
			} else {
				$stackTop[] = ['type' => 'text', 'text' => $child['text']];
			}
		} else {
			$node = $child;
			unset($node['marks']);
			$stackTop[] = $node;
		}
	}
}
