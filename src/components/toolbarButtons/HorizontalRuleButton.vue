<template>
  <ToolbarButton icon="horizontal-rule" :title="$t('tiptap.toolbar.button.horizontalRule')" :editor="editor"
    command="setHorizontalRule" active-check="horizontalRule" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue'

export default {
  components: {
    ToolbarButton
  },
  props: {
    editor: {
      type: Object,
      required: true
    }
  }
}
</script>
