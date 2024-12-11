<template>
  <ToolbarButton icon="bold" title="Bold" :editor="editor" command="toggleBold" active-check="bold" />
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
