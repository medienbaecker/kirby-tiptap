<?php
/** @var string $content */
/** @var array $attrs */
$lang = $attrs['language'] ?? null;
?>
<pre><code<?= $lang ? ' class="language-' . esc($lang) . '"' : '' ?>><?= $content ?></code></pre>
