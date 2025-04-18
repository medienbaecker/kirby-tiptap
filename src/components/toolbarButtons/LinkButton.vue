<template>
  <ToolbarButton icon="url" title="Link" :editor="editor" :command="handleLink" active-check="false" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';

/**
 * Normalizes options objects to arrays for the link dialog
 */
function normalizeOptions(options) {
  if (Array.isArray(options)) return options;
  if (typeof options === "object" && options !== null) {
    return Object.entries(options).map(([value, text]) => ({
      value,
      text
    }));
  }
  return [];
}

export default {
  components: {
    ToolbarButton
  },

  props: {
    editor: {
      type: Object,
      required: true
    },
    links: {
      type: Object,
      default: () => ({})
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

    /**
     * Opens the link dialog and inserts a KirbyTag on submit
     */
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
          fields: this.linkFields,
          value: initialValues,
          submitButton: window.panel.$t("insert")
        },
        on: {
          cancel: () => {
            this.$panel.dialog.close();
            editor.chain().focus().run();
          },
          submit: (values) => {
            if (!values.href) {
              this.$panel.notification.error(window.panel.$t('error.validation.required'));
              return;
            }

            this.$panel.dialog.close();

            // Convert permalinks to UUIDs
            values.href = values.href
              .replace("/@/file/", "file://")
              .replace("/@/page/", "page://");

            let kirbyTag = this.getKirbyTag(values);
            editor.commands.insertContent(kirbyTag);
          }
        }
      });
    },

    /**
     * Converts dialog values to a KirbyTag string.
     */
    getKirbyTag(values) {
      const { href, text, ...rest } = values;
      let tag = '';
      if (href.startsWith('mailto:')) {
        const email = href.replace('mailto:', '');
        tag = text
          ? `(email: ${email} text: ${text})`
          : `(email: ${email})`;
      } else if (href.startsWith('tel:')) {
        const phone = href.replace('tel:', '');
        tag = text
          ? `(tel: ${phone} text: ${text})`
          : `(tel: ${phone})`;
      } else {
        tag = text
          ? `(link: ${href} text: ${text})`
          : `(link: ${href})`;
      }

      // Add all non-empty custom fields (arrays joined with space)
      const extraParams = Object.entries(rest)
        .filter(([key, value]) =>
          value !== '' && value !== false && value !== undefined && value !== null
        )
        .map(([key, value]) =>
          Array.isArray(value)
            ? `${key}: ${value.join(' ')}`
            : `${key}: ${value}`
        )
        .join(' ');

      if (extraParams) {
        tag = tag.replace(/\)$/, ` ${extraParams})`);
      }

      return tag;
    },
  },

  computed: {
    /**
     * Merges default and custom fields, normalizing options for custom fields.
     */
    linkFields() {

      // Set up href field with optional options (hah)
      const hrefField = {
        label: window.panel.$t("link"),
        required: true,
        type: "link"
      };
      if (this.links?.options && this.links.options.length > 0) {
        hrefField.options = this.links.options;
      }

      const defaults = {
        href: hrefField,
        text: {
          label: window.panel.$t("link.text"),
          type: "text"
        }
      };

      // Normalize options for all custom fields
      const customFields = Object.fromEntries(
        Object.entries(this.links?.fields || {}).map(([name, field]) => {
          let normalized = { ...field };
          if (field.options) {
            normalized.options = normalizeOptions(field.options);
          }
          return [name, normalized];
        })
      );

      return {
        ...defaults,
        ...customFields
      };
    }
  }
};
</script>
