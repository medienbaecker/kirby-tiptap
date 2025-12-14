<?php $htmlAttrs = attr(array_filter($attrs ?? [])); ?>
<p<?= $htmlAttrs ? ' ' . $htmlAttrs : '' ?>><?= $content ?></p>
