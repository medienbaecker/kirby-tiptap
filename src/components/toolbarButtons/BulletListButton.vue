<template>
  <ToolbarButton icon="list-bullet" title="Bullet List" :editor="editor" command="toggleBulletList"
    active-check="bulletList" />
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
