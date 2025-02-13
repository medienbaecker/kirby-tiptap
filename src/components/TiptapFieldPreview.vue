<template>
  <div :class="['k-tiptap-field-preview', $options.class, $attrs.class]" :style="$attrs.style">
    {{ column.before }}
    <k-text :html="html" />
    {{ column.after }}
  </div>
</template>

<script>
import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

import FieldPreview from "@/mixins/forms/fieldPreview.js";

export default {
  mixins: [FieldPreview],
  props: {
    value: String
  },
  computed: {
    html() {
      const json = JSON.parse(this.value);

      return generateHTML(json, [
        StarterKit
      ]);
    }
  }
};
</script>

<style>
.k-tiptap-field-preview {
  padding: 0.375rem var(--table-cell-padding);
}
</style>
