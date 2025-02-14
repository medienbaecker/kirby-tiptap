<template>
  <k-button :icon="icon" :title="title" :ariaLabel="title" :class="['k-toolbar-button', 'tiptap-button']"
    :current="isActive" @mousedown.prevent @click="runCommand" />
</template>

<script>
export default {
  props: {
    icon: String,
    title: String,
    editor: Object,
    command: [String, Function],
    activeCheck: [String, Function]
  },
  computed: {
    isActive() {
      if (!this.editor || !this.editor.isFocused) return false;
      return typeof this.activeCheck === 'function'
        ? this.activeCheck(this.editor)
        : this.editor.isActive(this.activeCheck);
    }
  },
  methods: {
    runCommand() {
      if (typeof this.command === 'function') {
        this.command(this.editor);
      } else {
        this.editor.chain().focus()[this.command]().run();
      }
    }
  }
}
</script>

<style>
.tiptap-button {
  display: flex;
}

/* Makes sure nested buttons (like the first heading) are also rounded */
.tiptap-button:first-child {
  border-start-start-radius: var(--rounded);
  border-end-start-radius: var(--rounded)
}
</style>
