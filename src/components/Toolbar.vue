<template>
  <nav class="k-toolbar" v-if="editor">
    <template v-for="button in buttons">
      <component v-if="button !== '|'" :is="buttonComponents[button]" :key="button" :editor="editor" />
      <hr v-else />
    </template>
  </nav>
</template>

<script>
const buttonComponents = {
  bold: () => import('./buttons/BoldButton.vue'),
  italic: () => import('./buttons/ItalicButton.vue'),
  strike: () => import('./buttons/StrikeButton.vue'),
  code: () => import('./buttons/CodeButton.vue'),
  link: () => import('./buttons/LinkButton.vue'),
  bulletList: () => import('./buttons/BulletListButton.vue'),
  orderedList: () => import('./buttons/OrderedListButton.vue')
};

export default {
  components: buttonComponents,
  props: {
    editor: { type: Object, required: true },
    label: { type: String, required: true },
    buttons: {
      type: Array,
      default: () => ['bold', 'italic', 'strike', 'code', '|', 'link', '|', 'bulletList', 'orderedList']
    }
  },
  computed: {
    buttonComponents() {
      return buttonComponents;
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

.k-button {
  transition-property: color, background;

  &[aria-current] {
    --button-color-background: var(--toolbar-current);
  }
}
</style>
