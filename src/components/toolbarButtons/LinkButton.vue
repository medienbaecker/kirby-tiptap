<template>
  <ToolbarButton icon="url" title="Link" :editor="editor" :command="handleLink" active-check="false" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';

export default {
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
    /**
     * Basic email validation using regex
     */
    isValidEmail(text) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(text);
    },

    /**
     * Validates URLs by attempting to construct a URL object
     */
    isValidUrl(text) {
      try {
        new URL(text);
        return text.startsWith('http://') || text.startsWith('https://');
      } catch {
        return false;
      }
    },

    /**
     * Determines initial dialog values based on selected text
     * - For emails: prefills mailto: link
     * - For URLs: prefills the URL
     * - For regular text: uses it as link text
     */
    getInitialValues(selectedText) {
      if (this.isValidEmail(selectedText)) {
        return {
          href: `mailto:${selectedText}`,
          text: ''
        };
      }

      if (this.isValidUrl(selectedText)) {
        return {
          href: selectedText,
          text: ''
        };
      }

      return {
        href: '',
        text: selectedText
      };
    },

    handleLink(editor) {
      // Get text from current selection, or empty string if nothing selected
      const selectedText = !editor.state.selection.empty
        ? editor.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to
        )
        : '';

      const initialValues = this.getInitialValues(selectedText);

      this.$panel.dialog.open({
        component: 'k-link-dialog',
        props: {
          fields: {
            href: {
              label: window.panel.$t("link"),
              type: "link",
              placeholder: window.panel.$t("url.placeholder")
            },
            text: {
              label: window.panel.$t("link.text"),
              type: "text",
            }
          },
          value: initialValues,
          submitButton: window.panel.$t("insert")
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

            // Convert permalinks to UUIDs
            const href = values.href
              .replace("/@/file/", "file://")
              .replace("/@/page/", "page://")

            let kirbyTag = this.getKirbyTag(href, values.text);
            editor.commands.insertContent(kirbyTag);
          }
        }
      });
    },

    /**
     * Converts links to Kirbytags based on link type
     */
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

      return text
        ? `(link: ${href} text: ${text})`
        : `(link: ${href})`;
    }
  }
}
</script>
