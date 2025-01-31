<template>
  <ToolbarButton icon="url" title="Link" :editor="editor" :command="handleLink" active-check="link" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';

export default {
  name: 'LinkButton',

  components: {
    ToolbarButton
  },

  props: {
    editor: {
      type: Object,
      required: true
    }
  },

  methods: {
    handleLink(editor) {
      const attrs = editor.getAttributes('link');
      const isEditing = Boolean(attrs.href);

      // Get selected text if any
      const selectedText = !editor.state.selection.empty
        ? editor.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to
        )
        : '';

      this.$panel.dialog.open({
        component: 'k-link-dialog',
        props: {
          fields: {
            href: {
              label: window.panel.$t("link"),
              type: "link",
              placeholder: window.panel.$t("url.placeholder"),
              icon: "url"
            },
            text: {
              label: window.panel.$t("link.text"),
              type: "text",
              value: selectedText
            }
          },
          value: {
            ...attrs,
            text: selectedText
          },
          submitButton: isEditing ? window.panel.$t("update") : window.panel.$t("insert")
        },
        on: {
          cancel: () => {
            this.$panel.dialog.close();
            editor.chain().focus().run();
          },
          submit: (values) => {
            this.$panel.dialog.close();

            if (!values.href?.length) {
              editor.chain().focus().unsetLink().run();
              return;
            }

            let kirbyTag = `(link: ${values.href}`;
            if (values.text) {
              kirbyTag += ` text: ${values.text}`;
            }
            kirbyTag += ')';

            editor.commands.insertContent(kirbyTag);
          }
        }
      });
    }
  }
}
</script>
