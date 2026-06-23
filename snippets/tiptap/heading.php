<?php $level = max(1, min(6, (int)($attrs['level'] ?? 1))); ?>
<h<?= $level ?>><?= $content ?></h<?= $level ?>>
