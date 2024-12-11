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
      // Get current link attributes
      const attrs = editor.getAttributes('link');
      const isEditing = Boolean(attrs.href);

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
            target: {
              label: window.panel.$t("open.newWindow"),
              type: "toggle",
              text: [window.panel.$t("no"), window.panel.$t("yes")]
            }
          },
          value: attrs,
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

            if (editor.state.selection.empty) {
              // Insert both content and mark in one command
              editor.commands.insertContent({
                type: 'text',
                text: values.text || values.href,
                marks: [{
                  type: 'link',
                  attrs: values
                }]
              });
            } else {
              editor.chain().focus().setLink(values).run();
            }
          }
        }
      });
    }
  }
}
</script>
