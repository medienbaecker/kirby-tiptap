<template>
  <ToolbarButton icon="italic" title="Italic" :editor="editor" command="toggleItalic" active-check="italic" />
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
