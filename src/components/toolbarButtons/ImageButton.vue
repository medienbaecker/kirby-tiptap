<template>
  <ToolbarButton icon="image" :title="$t('tiptap.toolbar.button.image')" :editor="editor" :command="handleImage"
    :active-check="isImageActive" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';
import { parseKirbyTag, generateKirbyTag, findParentWithClass } from '../../utils/kirbyTags';

export default {
  components: {
    ToolbarButton
  },

  props: {
    editor: {
      type: Object,
      required: true
    },
    endpoints: {
      type: Object,
      default: () => ({})
    }
  },

  methods: {
    /**
     * Handles clicking the image button
     * Opens file selection dialog for inserting/editing image tags
     */
    handleImage() {
      const { state, view } = this.editor;
      const { from, to, empty } = state.selection;

      // Check if we're editing an existing image tag
      let isEditing = false;
      let tagEl = null;
      let replaceRange = null;
      let initial = {};

      // Case 1: Cursor inside a tag
      if (empty) {
        const { node } = view.domAtPos(from);
        tagEl = findParentWithClass(node, 'kirbytag');
        isEditing = Boolean(tagEl) && tagEl.textContent.startsWith('(image:');
      }
      // Case 2: Selection
      else {
        // First check if the selection is a complete tag
        const selectedText = state.doc.textBetween(from, to).trim();
        if (selectedText.startsWith('(image:') && selectedText.endsWith(')')) {
          isEditing = true;
          replaceRange = { from, to };
          try {
            initial = parseKirbyTag(selectedText);
          } catch (e) {
            console.error("Error parsing tag:", e);
            isEditing = false;
          }
        }
        // If not a complete tag, check if selection intersects with a tag
        else {
          // Check if selection starts inside a tag
          const { node: startNode } = view.domAtPos(from);
          const startTagEl = findParentWithClass(startNode, 'kirbytag');
          if (startTagEl && startTagEl.textContent.startsWith('(image:')) {
            isEditing = true;
            tagEl = startTagEl;
          }

          // If not starting in a tag, check if it ends in one
          if (!isEditing) {
            const { node: endNode } = view.domAtPos(to);
            const endTagEl = findParentWithClass(endNode, 'kirbytag');
            if (endTagEl && endTagEl.textContent.startsWith('(image:')) {
              isEditing = true;
              tagEl = endTagEl;
            }
          }
        }
      }

      // If editing via cursor position or partial tag selection, get the tag range
      if (isEditing && tagEl && !replaceRange) {
        const start = view.posAtDOM(tagEl, 0);
        const end = view.posAtDOM(tagEl, tagEl.childNodes.length);
        replaceRange = { from: start, to: end };
        initial = parseKirbyTag(tagEl.textContent);
      }

      const restoreSelection = this.restoreSelectionCallback();

      // The file dialog expects the selected files in the value prop as an array of IDs
      this.$panel.dialog.open({
        component: 'k-files-dialog',
        props: {
          multiple: false,
          types: ['image'],
          endpoint: `${this.endpoints.field}/files`,
          // Pass the initial file ID as the value if we're editing
          value: initial.uuid ? [initial.uuid] : []
        },
        on: {
          cancel: restoreSelection,
          submit: (files) => {
            if (!files?.length) {
              this.$panel.notification.error(
                window.panel.$t('error.validation.required')
              );
              return;
            }

            this.$panel.dialog.close();

            restoreSelection(() => {
              if (files?.length) {
                const file = files[0];
                const kirbyTag = this.getKirbyTag(file, initial);

                if (isEditing && replaceRange) {
                  this.editor.chain().focus()
                    .deleteRange(replaceRange)
                    .insertContent(kirbyTag)
                    .run();
                } else {
                  this.editor.commands.insertContent(kirbyTag);
                }
              }
            });
          }
        }
      });
    },

    /**
     * Creates a callback to restore editor selection after operations
     * @returns {Function} Callback to restore the selection
     */
    restoreSelectionCallback() {
      const { from, to } = this.editor.state.selection;

      return (callback) => {
        setTimeout(() => {
          this.editor.commands.setTextSelection({ from, to });

          if (callback) {
            callback();
          }
        });
      };
    },

    /**
     * Creates a Kirby image tag with file information and any existing attributes
     * @param {Object} file - The file object from the dialog
     * @param {Object} existing - Existing tag attributes if editing
     * @returns {string} Formatted Kirbytag
     */
    getKirbyTag(file, existing = {}) {
      // Preserve attributes from the existing tag if editing
      const { _type, uuid, ...attrs } = existing;

      // Generate the tag with the file and existing attributes
      return generateKirbyTag('image', file.filename, attrs);
    },

    /**
     * Checks if the cursor is positioned within an image tag
     * @param {Object} editor - The Tiptap editor instance
     * @returns {boolean} Whether an image tag is active
     */
    isImageActive(editor) {
      if (!editor.isFocused) return false;

      const { from, to, empty } = editor.state.selection;

      // Case 1: Cursor inside a tag
      if (empty) {
        const { node } = editor.view.domAtPos(from);
        const tagEl = findParentWithClass(node, 'kirbytag');
        if (!tagEl) return false;

        return tagEl.textContent.startsWith('(image:');
      }
      // Case 2: Selection
      else {
        // First check if the exact selection might be a complete tag
        const selectedText = editor.state.doc.textBetween(from, to).trim();
        if (selectedText.startsWith('(image:') && selectedText.endsWith(')')) {
          return true;
        }

        // If not, check if any endpoint of the selection is inside an image tag
        const { node: startNode } = editor.view.domAtPos(from);
        const startTagEl = findParentWithClass(startNode, 'kirbytag');
        if (startTagEl && startTagEl.textContent.startsWith('(image:')) {
          return true;
        }

        const { node: endNode } = editor.view.domAtPos(to);
        const endTagEl = findParentWithClass(endNode, 'kirbytag');
        if (endTagEl && endTagEl.textContent.startsWith('(image:')) {
          return true;
        }

        return false;
      }
    }

  }
}
</script>