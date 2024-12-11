<template>
  <nav class="k-toolbar" v-if="editor">
    <template v-for="button in normalizedButtons">
      <component v-if="!isSeperator(button)" :is="buttonComponents[getComponentName(button)]" :key="getKey(button)"
        :editor="editor" :levels="getLevels(button)" />
      <hr v-else />
    </template>
  </nav>
</template>

<script>
const buttonComponents = {
  headings: () => import('./toolbarButtons/HeadingsButton.vue'),
  bold: () => import('./toolbarButtons/BoldButton.vue'),
  italic: () => import('./toolbarButtons/ItalicButton.vue'),
  strike: () => import('./toolbarButtons/StrikeButton.vue'),
  code: () => import('./toolbarButtons/CodeButton.vue'),
  link: () => import('./toolbarButtons/LinkButton.vue'),
  bulletList: () => import('./toolbarButtons/BulletListButton.vue'),
  orderedList: () => import('./toolbarButtons/OrderedListButton.vue')
};

export default {
  components: buttonComponents,
  props: {
    editor: {
      type: Object,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    buttons: {
      type: Array,
      required: true
    }
  },
  computed: {
    buttonComponents() {
      return buttonComponents;
    },
    normalizedButtons() {
      return this.buttons.map(button => {
        // Handle nested headings config
        if (typeof button === 'object' && button.headings) {
          return {
            type: 'headings',
            levels: button.headings
          };
        }
        // Handle regular buttons
        return {
          type: button,
          levels: null
        };
      });
    }
  },
  methods: {
    isSeperator(button) {
      return button.type === '|';
    },
    getComponentName(button) {
      return button.type;
    },
    getKey(button) {
      return button.type + (button.levels ? `-${button.levels.join('-')}` : '');
    },
    getLevels(button) {
      return button.levels;
    }
  }
}
</script>

<style>
.k-toolbar {
  margin-bottom: 0;
  border-bottom: 1px solid var(--toolbar-border);
  border-end-start-radius: 0;
  border-end-end-radius: 0;
}

.k-heading-buttons {
  display: inline-flex;
}
</style>
