<template>
  <ToolbarButton icon="code-block" title="Code Block" :editor="editor" command="toggleCodeBlock"
    active-check="codeBlock" />
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

<style></style>
