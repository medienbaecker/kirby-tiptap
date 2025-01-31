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

            // Turn permalinks into UUIDs
            const href = values.href
              .replace("/@/file/", "file://")
              .replace("/@/page/", "page://")

            let kirbyTag = this.getKirbyTag(href, values.text);
            editor.commands.insertContent(kirbyTag);
          }
        }
      });
    },

    getKirbyTag(href, text) {
      if (href.startsWith('mailto:')) {
        const email = href.replace('mailto:', '');
        return text
          ? `(email: ${email} text: ${text})`
          : `(email: ${email})`;
      }

      if (href.startsWith('tel:')) {
        const phone = href.replace('tel:', '');
        return text
          ? `(tel: ${phone} text: ${text})`
          : `(tel: ${phone})`;
      }

      // Default link handling
      return text
        ? `(link: ${href} text: ${text})`
        : `(link: ${href})`;
    }
  }
}
</script>
