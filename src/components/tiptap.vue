<template>
  <div>
    
    <k-field class="k-tiptap-field" data-theme="field" :label="label">
      <span class="k-input-element">
        <div data-theme="field" class="k-input">
          <div class="k-textarea-input-wrapper">
            <nav class="k-toolbar" v-if="editor">
              <div class="k-toolbar-wrapper">
                <div class="k-toolbar-buttons">
                  <button @click="editor.chain().focus().toggleBold().run()" tabindex="-1" title="Fetter Text" type="button" class="k-button k-toolbar-button"><span aria-label="Fetter Text" role="img" class="k-button-icon k-icon k-icon-bold"><svg viewBox="0 0 16 16"><use xlink:href="#icon-bold"></use></svg></span><!----></button>
                  <button @click="editor.chain().focus().toggleItalic().run()" tabindex="-1" title="Kursiver Text" type="button" class="k-button k-toolbar-button"><span aria-label="Kursiver Text" role="img" class="k-button-icon k-icon k-icon-italic"><svg viewBox="0 0 16 16"><use xlink:href="#icon-italic"></use></svg></span><!----></button>
                </div>
              </div>
            </nav>
            <editor-content :editor="editor" v-model="value"/>
          </div>
        </div>
      </span>
    </k-field>
    
    <!-- <code>
      {{ value }}
    </code> -->
    
  </div>
  
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'

export default {
  components: {
    EditorContent,
  },
  
  props: {
    label: String,
    value: String
  },

  data() {
    return {
      editor: null,
    }
  },

  mounted() {
    var field = this;
    this.editor = new Editor({
      content: this.value,
      onUpdate({ editor }) {
        const html = this.getHTML();
        field.$emit("input", html);
      },
      extensions: [
        StarterKit,
      ],
    });
  },

}
</script>