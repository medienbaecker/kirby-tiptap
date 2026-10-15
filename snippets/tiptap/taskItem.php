<?php
/** @var string $content */
/** @var array $attrs */
$checked = ($attrs['checked'] ?? false) ? ' checked' : '';
?>
<li data-type="taskItem"><input type="checkbox"<?= $checked ?>><div><?= $content ?></div></li>
