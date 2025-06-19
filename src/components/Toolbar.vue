<template>
  <nav class="k-toolbar tiptap-toolbar" v-if="editor">
    <template v-for="button in normalizedButtons">
      <component v-if="!isSeperator(button)" :is="buttonComponents[getComponentName(button)]" :key="getKey(button)"
        :editor="editor" :levels="getLevels(button)" :links="links" :endpoints="endpoints" />
      <hr v-else />
    </template>
  </nav>
</template>

<script>
import { props } from './props.js'
import { buttonRegistry } from '../utils/buttonRegistry.js'

// Component cache to avoid recreating async components
const componentCache = new Map()

export default {
  props: {
    editor: Object,
    ...props
  },

  computed: {
    // Dynamically load button components from registry with caching
    buttonComponents() {
      const components = {}
      
      // Get all buttons from registry
      for (const [name, config] of buttonRegistry.getAllButtons()) {
        // Use cached component or create new one
        if (!componentCache.has(name)) {
          try {
            // Vue 2 compatible async component definition with error handling
            componentCache.set(name, () => {
              return config.component().catch(error => {
                console.error(`Failed to load button component: ${name}`, error)
                // Return fallback component
                return {
                  name: `${name}ButtonError`,
                  render(h) {
                    return h('k-button', {
                      props: {
                        icon: 'alert',
                        title: `Error loading ${name} button`,
                        disabled: true
                      },
                      class: 'tiptap-button-error'
                    })
                  }
                }
              })
            })
          } catch (error) {
            console.warn(`Failed to setup button component: ${name}`, error)
            // Immediate fallback for synchronous errors
            componentCache.set(name, {
              name: `${name}ButtonFallback`,
              render: h => h('div', { class: 'tiptap-button-fallback' }, 'Button Error')
            })
          }
        }
        components[name] = componentCache.get(name)
      }
      
      return components
    },

    // Normalize buttons to include metadata
    normalizedButtons() {
      return this.buttons.map(button => ({
        type: typeof button === 'object' && button.headings ? 'headings' : button,
        levels: (typeof button === 'object' && button.headings) ? button.headings : null
      }))
    }
  },

  methods: {
    isSeperator(button) {
      return button.type === '|'
    },

    getComponentName(button) {
      return button.type
    },

    getKey(button) {
      return button.type + (button.levels ? `-${button.levels.join('-')}` : '')
    },

    getLevels(button) {
      return button.levels
    }
  }
}
</script>

<style>
.tiptap-toolbar {

  /* Default styles */
  border-bottom: 1px solid var(--toolbar-border);
  border-end-start-radius: 0;
  border-end-end-radius: 0;

  /* Improving on k-toolbar: */

  /* Grow toolbar height with scrollbar */
  height: auto;
  scrollbar-width: thin;

  /* More subtle hover for better combination with blue (active) */
  --toolbar-hover: light-dark(var(--color-gray-100), var(--color-gray-800));
}

/* Turning buttons grey when not focused */
:where(.k-tiptap-input):not(:focus-within) {
  --toolbar-text: var(--color-gray-400);
}

/* Turning toolbar sticky when focused */
:where(.k-tiptap-input):focus-within .tiptap-toolbar {
  position: sticky;
  top: var(--header-sticky-offset);
  inset-inline: 0;
  z-index: 1;
  box-shadow: rgba(0, 0, 0, 0.05) 0 2px 5px;
}
</style>
