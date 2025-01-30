<template>
  <k-field class="k-tiptap-field" data-theme="field" v-bind="$props">
    <k-input-element>
      <div :data-disabled="disabled" :data-size="size" class="k-input k-tiptap-input">
        <TiptapInput v-bind="$props" />
      </div>
    </k-input-element>
  </k-field>
</template>

<script>
import TiptapInput from './TiptapInput.vue'
import { props } from './props.js'

export default {
  components: { TiptapInput },
  props
}
</script>

<style></style>