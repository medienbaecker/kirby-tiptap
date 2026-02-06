<?php $htmlAttrs = attr(array_filter($attrs ?? [])); ?>
<div data-callout<?= $htmlAttrs ? ' ' . $htmlAttrs : '' ?>>
	<?= $content ?>
</div>