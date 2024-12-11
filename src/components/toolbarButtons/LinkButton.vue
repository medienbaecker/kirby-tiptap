<template>
  <ToolbarButton icon="url" title="Link" :editor="editor" :command="openLinkDialog" active-check="link" />
</template>

<script>
import LinkDialog from "@/components/Dialogs/LinkDialog.vue";
import ToolbarButton from './ToolbarButton.vue';

export default {
  components: {
    ToolbarButton
  },
  props: {
    editor: {
      type: Object,
      required: true
    }
  },
  methods: {
    openLinkDialog(editor) {
      this.$panel.dialog.open({
        component: LinkDialog,
        on: {
          cancel: () => editor.focus(),
          submit: (values) => {
            console.log('submit');
            this.$panel.dialog.close();
            editor
              .chain()
              .focus()
              .extendMarkRange('link')
              .setLink(values)
              .run()
          }
        }
      });
    }
  }
}
</script>

<style></style>
