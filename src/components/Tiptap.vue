<template>
  <k-field class="k-tiptap-field" data-theme="field" :name="name" type="tiptap" v-bind="$props"
    :counter="counterOptions">
    <k-input-element>
      <div :data-disabled="disabled" :data-size="size" :data-inline="inline" class="k-input k-tiptap-input">
        <TiptapInput v-bind="$props" @input="handleInput" @editor="editor = $event" />
      </div>
    </k-input-element>
  </k-field>
</template>

<script>
import TiptapInput from './TiptapInput.vue'
import { props } from './props.js'
import counter from "@/mixins/forms/counter.js";

export default {
  mixins: [counter],
  components: { TiptapInput },
  data() {
    return {
      editor: null
    }
  },

  computed: {
    counterValue() {
      return this.editor?.getText() || '';
    }
  },

  methods: {
    handleInput(value) {
      this.$emit('input', value.json);
    }
  },
  props,
  emits: ['input']
}
</script>
