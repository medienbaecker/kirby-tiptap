<template>
  <ToolbarButton icon="strikethrough" :title="$t('toolbar.button.strike')" :editor="editor" command="toggleStrike"
    active-check="strike" />
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
