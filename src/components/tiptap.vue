<template>
  
  <k-field class="k-tiptap-field" data-theme="field" :label="label">
    <span class="k-input-element">
      <div data-theme="field" class="k-input k-textarea-input">
        <div class="k-textarea-input-wrapper">

          <nav class="k-toolbar" v-if="editor">
            <div class="k-toolbar-wrapper">
              <div class="k-toolbar-buttons">

                <k-button
                icon="bold"
                :tooltip="label"
                tabindex="-1"
                :class="['k-toolbar-button', 'k-markdown-button', {'is-active': editor.isActive('bold')}]"
                @mousedown.prevent
                @click="editor.chain().focus().toggleBold().run()" />

                <k-button
                icon="italic"
                :tooltip="label"
                tabindex="-1"
                :class="['k-toolbar-button', 'k-markdown-button', {'is-active': editor.isActive('italic')}]"
                @mousedown.prevent
                @click="editor.chain().focus().toggleItalic().run()" />

                <span class="k-toolbar-divider"></span>

                <k-button
                icon="list-bullet"
                :tooltip="label"
                tabindex="-1"
                :class="['k-toolbar-button', 'k-markdown-button', {'is-active': editor.isActive('bulletList')}]"
                @mousedown.prevent
                @click="editor.chain().focus().toggleBulletList().run()" />

                <k-button
                icon="list-numbers"
                :tooltip="label"
                tabindex="-1"
                :class="['k-toolbar-button', 'k-markdown-button', {'is-active': editor.isActive('orderedList')}]"
                @mousedown.prevent
                @click="editor.chain().focus().toggleOrderedList().run()" />

              </div>
            </div>
          </nav>

          <editor-content :editor="editor" v-model="value"/>

        </div>
      </div>
    </span>
  </k-field>
  
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