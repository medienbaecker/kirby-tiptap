<?php $htmlAttrs = attr(array_filter($attrs ?? [])); ?>
<blockquote<?= $htmlAttrs ? ' ' . $htmlAttrs : '' ?>>
<?= $content ?>
</blockquote>
