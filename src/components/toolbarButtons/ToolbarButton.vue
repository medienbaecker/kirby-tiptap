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
  data() {
    return {
      active: false,
      updateTimer: null
    }
  },
  computed: {
    isActive() {
      return this.active
    }
  },
  watch: {
    editor: {
      immediate: true,
      handler(editor) {
        if (!editor) return
        
        // Set up throttled update handler
        const updateActiveState = () => {
          if (!this.editor || !this.editor.isFocused) {
            this.active = false
            return
          }
          
          this.active = typeof this.activeCheck === 'function'
            ? this.activeCheck(this.editor)
            : this.editor.isActive(this.activeCheck)
        }
        
        // Initial state
        updateActiveState()
        
        // Listen to editor updates with throttling
        editor.on('selectionUpdate', () => {
          // Clear existing timer
          if (this.updateTimer) {
            clearTimeout(this.updateTimer)
          }
          
          // Throttle updates to max once per 50ms
          this.updateTimer = setTimeout(updateActiveState, 50)
        })
        
        editor.on('transaction', ({ transaction }) => {
          // Only update on selection changes or doc changes
          if (transaction.docChanged || transaction.selectionSet) {
            if (this.updateTimer) {
              clearTimeout(this.updateTimer)
            }
            this.updateTimer = setTimeout(updateActiveState, 50)
          }
        })
      }
    }
  },
  beforeDestroy() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
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