<?php $lang = $attrs['language'] ?? null; ?>
<pre><code<?= $lang ? ' class="language-' . esc($lang) . '"' : '' ?>><?= $content ?></code></pre>
