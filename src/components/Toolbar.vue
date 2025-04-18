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

const buttonComponents = {
  headings: () => import('./toolbarButtons/HeadingsButton.vue'),
  bold: () => import('./toolbarButtons/BoldButton.vue'),
  italic: () => import('./toolbarButtons/ItalicButton.vue'),
  strike: () => import('./toolbarButtons/StrikeButton.vue'),
  code: () => import('./toolbarButtons/CodeButton.vue'),
  codeBlock: () => import('./toolbarButtons/CodeBlockButton.vue'),
  link: () => import('./toolbarButtons/LinkButton.vue'),
  image: () => import('./toolbarButtons/ImageButton.vue'),
  bulletList: () => import('./toolbarButtons/BulletListButton.vue'),
  orderedList: () => import('./toolbarButtons/OrderedListButton.vue'),
  removeFormatting: () => import('./toolbarButtons/RemoveFormattingButton.vue')
};

export default {
  components: buttonComponents,
  props: {
    editor: Object,
    ...props
  },
  computed: {
    buttonComponents() {
      return buttonComponents;
    },
    normalizedButtons() {
      return this.buttons.map(button => ({
        type: typeof button === 'object' && button.headings ? 'headings' : button,
        levels: (typeof button === 'object' && button.headings) ? button.headings : null
      }));
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
