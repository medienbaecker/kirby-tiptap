<template>
  <k-field class="k-tiptap-field" data-theme="field" v-bind="$props" :counter="counterOptions">
    <k-input-element>
      <div :data-disabled="disabled" :data-size="size" class="k-input k-tiptap-input">
        <TiptapInput v-bind="$props" @input="handleInput" />
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
      plainText: ''
    }
  },
  methods: {
    handleInput(value) {
      this.plainText = value.text;
      this.$emit('input', value.json);
    }
  },
  computed: {
    counterValue() {
      return this.plainText;
    }
  },
  props,
  emits: ['input']
}
</script>
