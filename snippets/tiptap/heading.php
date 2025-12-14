<?php
$level = $attrs['level'] ?? 1;
$htmlAttrs = attr(array_filter(array_diff_key($attrs ?? [], ['level' => true])));
?>
<h<?= $level ?><?= $htmlAttrs ? ' ' . $htmlAttrs : '' ?>><?= $content ?></h<?= $level ?>>
