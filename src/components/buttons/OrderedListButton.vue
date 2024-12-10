<template>
  <ToolbarButton icon="orderedList" title="Ordered List" :editor="editor" command="toggleOrderedList"
    active-check="orderedList" />
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
