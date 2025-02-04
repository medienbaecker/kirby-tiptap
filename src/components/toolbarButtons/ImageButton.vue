<template>
  <ToolbarButton icon="image" title="Image" :editor="editor" :command="handleImage" active-check="false" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';
import { props } from '../props.js'

export default {
  components: {
    ToolbarButton
  },

  props: {
    editor: Object,
    ...props
  },

  methods: {

    handleImage() {
      const restoreSelection = this.restoreSelectionCallback();

      this.$panel.dialog.open({
        component: 'k-files-dialog',
        props: {
          multiple: false,
          types: ['image'],
          endpoint: `${this.endpoints.field}/files`,
          selected: []
        },
        on: {
          cancel: restoreSelection,
          submit: (files) => {
            this.$panel.dialog.close();
            restoreSelection(() => this.insertFile(files));
          }
        }
      });
    },

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

    insertFile(files) {
      if (!files?.length) return;

      const file = files[0];
      const kirbyTag = this.getKirbyTag(file);
      this.editor.commands.insertContent(kirbyTag);
    },

    getKirbyTag(file) {
      return `(image: ${file.filename})`;
    }
  }
}
</script>
