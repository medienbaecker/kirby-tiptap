<template>
  <div class="tiptap-headings">
    <ToolbarButton v-for="level in levels" :key="level" :icon="`h${level}`" :title="`Heading ${level}`" :editor="editor"
      :command="() => toggleHeading(level)" :active-check="() => editor.isActive('heading', { level })" />
  </div>
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
    },
    levels: {
      type: Array,
      required: true
    }
  },
  methods: {
    toggleHeading(level) {
      this.editor.chain().focus().toggleHeading({ level }).run()
    }
  }
}
</script>

<style>
.tiptap-headings {
  display: flex;
}
</style>