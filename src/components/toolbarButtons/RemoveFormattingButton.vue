<template>
  <ToolbarButton icon="clear" :title="$t('toolbar.button.clear')" :editor="editor" :command="removeFormatting"
    active-check="false" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue'

export default {
  components: { ToolbarButton },
  props: {
    editor: { type: Object, required: true }
  },
  methods: {
    removeFormatting(editor) {
      // Remove all marks and convert selection to paragraph
      editor.chain().focus().clearNodes().unsetAllMarks().run()
    }
  }
}
</script>
