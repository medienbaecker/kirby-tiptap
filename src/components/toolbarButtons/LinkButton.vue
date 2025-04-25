<template>
  <ToolbarButton icon="url" title="Link" :editor="editor" :command="handleLink" :active-check="isLinkActive" />
</template>

<script>
import ToolbarButton from './ToolbarButton.vue';

/**
 * Normalizes options objects to arrays for the link dialog
 * @param {Object|Array} options - Field options to normalize
 * @returns {Array} Normalized array of {value, text} objects
 */
const normalizeOptions = options => {
  if (Array.isArray(options)) return options;
  if (options && typeof options === 'object') {
    return Object.entries(options).map(([value, text]) => ({ value, text }));
  }
  return [];
};

/**
 * Parse a Kirby‐tag string like "(link: https://… text: Foo bar: baz)"
 * into an object { href, text, bar: 'baz' }
 */
const parseKirbyTag = (tagString, fields) => {
  // Get the tag type and prepare result object
  const typeMatch = tagString.match(/^\((\w+):/);
  const type = typeMatch ? typeMatch[1] : 'link';
  const result = {};

  // Extract attributes using a more reliable method
  const attributes = {};
  const attrPattern = /\s*(\w+):\s*([^)]*?)(?=\s+\w+:|$|\))/g;
  let match;

  // Clone the string for safe manipulation
  let workingString = tagString.slice(1, -1); // Remove outer parentheses

  // Find all attributes
  while ((match = attrPattern.exec(workingString)) !== null) {
    attributes[match[1]] = match[2].trim();
  }

  // Set the href based on tag type
  if (type === 'link') result.href = attributes.link || '';
  else if (type === 'email') result.href = `mailto:${attributes.email || ''}`;
  else if (type === 'tel') result.href = `tel:${attributes.tel || ''}`;

  // Add text property
  result.text = attributes.text || '';

  // Add all other properties (skip the ones we've already handled)
  Object.entries(attributes).forEach(([k, v]) => {
    if (['link', 'email', 'tel', 'text'].includes(k)) return;
    result[k] = v;
  });

  return result;
};

export default {
  components: { ToolbarButton },

  props: {
    editor: { type: Object, required: true },
    links: { type: Object, default: () => ({}) }
  },

  methods: {
    /**
     * Validates input and determines its type (email, URL, phone, or plain text)
     */
    validateInput(text) {
      // Email validation
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        return { type: 'email', href: `mailto:${text}` };
      }

      // Phone validation
      const phoneRegex = /^[\d\+\-\s\(\)]+$/;
      if (phoneRegex.test(text) && text.replace(/[^\d]/g, '').length >= 5) {
        return { type: 'tel', href: `tel:${text.trim()}` };
      }

      // URL validation
      try {
        new URL(text);
        if (text.startsWith('http://') || text.startsWith('https://')) {
          return { type: 'url', href: text };
        }
      } catch { }

      // Plain text (not recognized as any special type)
      return { type: 'text', text };
    },

    /**
     * Converts field values into a formatted Kirby tag string
     */
    generateTag(values) {
      const { href, text, ...attrs } = values;
      let tag;

      // Create tag based on link type
      if (href.startsWith('mailto:')) {
        const email = href.replace('mailto:', '');
        tag = `(email: ${email}${text ? ` text: ${text}` : ''})`;
      } else if (href.startsWith('tel:')) {
        const phone = href.replace('tel:', '');
        tag = `(tel: ${phone}${text ? ` text: ${text}` : ''})`;
      } else {
        tag = `(link: ${href}${text ? ` text: ${text}` : ''})`;
      }

      // Add extra attributes, filtering out empty values
      const extras = Object.entries(attrs)
        .filter(([, v]) => {
          if (v === '' || v === false || v == null) return false;
          if (Array.isArray(v) && v.length === 0) return false;
          return true;
        })
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
        .join(' ');

      return extras ? tag.replace(/\)$/, ` ${extras})`) : tag;
    },

    /**
     * Traverses up the DOM tree to find an element with the specified class
     */
    findParentWithClass(node, className) {
      let cur = node.nodeType === 3 ? node.parentNode : node;
      while (cur) {
        if (cur.classList?.contains(className)) return cur;
        cur = cur.parentNode;
      }
      return null;
    },

    /**
     * Handles the link button click - opens dialog for creating or editing links
     */
    handleLink(editor) {
      const { state, view } = editor;
      const { from, to, empty } = state.selection;

      // 1. Detect if we're editing an existing tag
      const { node } = view.domAtPos(from);
      const tagEl = this.findParentWithClass(node, 'kirbytag');
      const isEditing = Boolean(tagEl);

      let initial = {};
      let replaceRange = null;

      // 2. Get initial field values
      if (isEditing) {
        const start = view.posAtDOM(tagEl, 0);
        const end = view.posAtDOM(tagEl, tagEl.childNodes.length);
        replaceRange = { from: start, to: end };
        initial = parseKirbyTag(tagEl.textContent, this.linkFields);
      } else {
        const selText = !empty ? state.doc.textBetween(from, to) : '';
        const { type, href, text } = this.validateInput(selText);
        initial = type === 'text' ? { href: '', text: selText } : { href, text: '' };
      }

      // 3. Process field values based on field types
      Object.entries(this.linkFields).forEach(([name, field]) => {
        if (!initial[name]) return;

        // Handle array field types
        if (['checkboxes', 'multiselect', 'tags'].includes(field.type)) {
          if (!Array.isArray(initial[name])) {
            initial[name] = typeof initial[name] === 'string'
              ? initial[name].split(/\s+/)
              : [];
          }
        }

        // Handle toggle/boolean fields
        if (field.type === 'toggle' && typeof initial[name] === 'string') {
          initial[name] = initial[name].toLowerCase() === 'true';
        }
      });

      // 4. Open the dialog
      this.$panel.dialog.open({
        component: 'k-link-dialog',
        props: {
          fields: this.linkFields,
          value: initial,
          submitButton: window.panel.$t('insert')
        },
        on: {
          cancel: () => {
            this.$panel.dialog.close();
            editor.chain().focus().run();
          },
          submit: (values) => {
            if (!values.href) {
              this.$panel.notification.error(
                window.panel.$t('error.validation.required')
              );
              return;
            }

            this.$panel.dialog.close();

            // Convert permalinks to UUIDs
            values.href = values.href
              .replace("/@/file/", "file://")
              .replace("/@/page/", "page://");

            const kirbyTag = this.generateTag(values);
            const chain = editor.chain().focus();

            // Insert or update the tag
            if (isEditing && replaceRange) {
              chain.deleteRange(replaceRange).insertContent(kirbyTag).run();
            } else {
              chain.insertContent(kirbyTag).run();
            }
          }
        }
      });
    },

    /**
     * Checks if the cursor is positioned within a link tag
     */
    isLinkActive(editor) {
      if (!editor.isFocused) return false;
      const tag = this.findParentWithClass(
        editor.view.domAtPos(editor.state.selection.from).node,
        'kirbytag'
      );
      if (!tag) return false;

      const txt = tag.textContent;
      return (
        txt.startsWith('(link:') ||
        txt.startsWith('(email:') ||
        txt.startsWith('(tel:')
      );
    }
  },

  computed: {
    /**
     * Builds the field configuration for the link dialog
     */
    linkFields() {
      // Configure the href field with options if provided
      const hrefField = {
        label: window.panel.$t('link'),
        required: true,
        type: 'link'
      };

      if (this.links.options?.length) {
        hrefField.options = this.links.options;
      }

      // Default fields (href and text)
      const defaults = {
        href: hrefField,
        text: { label: window.panel.$t('link.text'), type: 'text' }
      };

      // Process custom fields, normalizing their options
      const custom = Object.fromEntries(
        Object.entries(this.links.fields || {}).map(([name, field]) => {
          const f = { ...field };
          if (field.options) {
            f.options = normalizeOptions(field.options);
          }
          return [name, f];
        })
      );

      return { ...defaults, ...custom };
    }
  }
};
</script>
