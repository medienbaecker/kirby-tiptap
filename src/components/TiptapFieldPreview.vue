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

      // Handle inline mode
      if (json.inline === true) {
        const newContent = [];

        json.content.forEach((node, index) => {
          if (node.type === 'paragraph') {
            // Add line break between paragraphs
            if (index > 0) {
              newContent.push({ type: 'hardBreak' });
            }
            // Add all content from the paragraph
            node.content.forEach(content => {
              newContent.push(content);
            });
          } else {
            newContent.push(node);
          }
        });

        // Create new JSON structure with single paragraph
        const inlineJson = {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: newContent
          }]
        };

        return generateHTML(inlineJson, [StarterKit]);
      }

      // Regular non-inline mode
      return generateHTML(json, [StarterKit]);
    }
  }
};
</script>

<style>
.k-tiptap-field-preview {
  padding: 0.375rem var(--table-cell-padding);
}
</style>
