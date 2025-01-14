<template>
  <k-button :icon="icon" :title="title" :ariaLabel="title" :class="['k-toolbar-button', 'k-markdown-button']"
    :current="isActive" @mousedown.prevent @click="runCommand" />
</template>

<script>
export default {
  props: {
    icon: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    editor: {
      type: Object,
      required: true
    },
    command: {
      type: String,
      required: true
    },
    activeCheck: {
      type: [String, Function],
      required: true
    }
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

<style></style>
