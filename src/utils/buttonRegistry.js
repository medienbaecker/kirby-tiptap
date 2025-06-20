/**
 * Button registry for extensible Tiptap toolbar system
 * Allows plugins to register custom buttons and extensions
 */

class ButtonRegistry {
	constructor() {
		this.buttons = new Map();
		this.extensions = new Map();
		this._initialized = false;
	}

	/**
	 * Register a toolbar button
	 * @param {string} name - Button name/identifier
	 * @param {Object} config - Button configuration
	 * @param {Function} config.component - Vue component (can be function returning import)
	 * @param {Function} config.extension - Tiptap extension (optional)
	 * @param {Object} config.meta - Additional metadata (icon, title, etc.)
	 */
	registerButton(name, config) {
		if (!name || !config.component) {
			throw new Error("Button registration requires name and component");
		}

		this.buttons.set(name, {
			component: config.component,
			extension: config.extension,
			meta: config.meta || {},
		});

		// Also register extension if provided
		if (config.extension) {
			this.extensions.set(name, config.extension);
		}
	}

	/**
	 * Register a Tiptap extension
	 * @param {string} name - Extension name
	 * @param {Function} extension - Tiptap extension class/function
	 */
	registerExtension(name, extension) {
		this.extensions.set(name, extension);
	}

	/**
	 * Get a registered button configuration
	 * @param {string} name - Button name
	 * @returns {Object|undefined} Button configuration
	 */
	getButton(name) {
		return this.buttons.get(name);
	}

	/**
	 * Get a registered extension
	 * @param {string} name - Extension name
	 * @returns {Function|undefined} Extension class/function
	 */
	getExtension(name) {
		return this.extensions.get(name);
	}

	/**
	 * Get all registered buttons
	 * @returns {Map} All button configurations
	 */
	getAllButtons() {
		return this.buttons;
	}

	/**
	 * Get all registered extensions
	 * @returns {Map} All extension configurations
	 */
	getAllExtensions() {
		return this.extensions;
	}

	/**
	 * Check if a button is registered
	 * @param {string} name - Button name
	 * @returns {boolean} Whether button is registered
	 */
	hasButton(name) {
		return this.buttons.has(name);
	}

	/**
	 * Check if an extension is registered
	 * @param {string} name - Extension name
	 * @returns {boolean} Whether extension is registered
	 */
	hasExtension(name) {
		return this.extensions.has(name);
	}

	/**
	 * Initialize the registry with core buttons
	 * Called automatically when needed
	 */
	initializeCoreButtons() {
		if (this._initialized) return;

		// Register core buttons
		this.registerButton("headings", {
			component: () =>
				import("../components/toolbarButtons/HeadingsButton.vue"),
			meta: { icon: "title", group: "text" },
		});

		this.registerButton("bold", {
			component: () => import("../components/toolbarButtons/BoldButton.vue"),
			meta: { icon: "bold", group: "text" },
		});

		this.registerButton("italic", {
			component: () => import("../components/toolbarButtons/ItalicButton.vue"),
			meta: { icon: "italic", group: "text" },
		});

		this.registerButton("strike", {
			component: () => import("../components/toolbarButtons/StrikeButton.vue"),
			meta: { icon: "strikethrough", group: "text" },
		});

		this.registerButton("code", {
			component: () => import("../components/toolbarButtons/CodeButton.vue"),
			meta: { icon: "code", group: "text" },
		});

		this.registerButton("codeBlock", {
			component: () =>
				import("../components/toolbarButtons/CodeBlockButton.vue"),
			meta: { icon: "code-block", group: "blocks" },
		});

		this.registerButton("link", {
			component: () => import("../components/toolbarButtons/LinkButton.vue"),
			meta: { icon: "url", group: "text" },
		});

		this.registerButton("file", {
			component: () => import("../components/toolbarButtons/FileButton.vue"),
			meta: { icon: "image", group: "blocks" },
		});

		// Keep 'image' as an alias for backward compatibility
		this.registerButton("image", {
			component: () => import("../components/toolbarButtons/FileButton.vue"),
			meta: { icon: "image", group: "blocks" },
		});

		this.registerButton("bulletList", {
			component: () =>
				import("../components/toolbarButtons/BulletListButton.vue"),
			meta: { icon: "list-bullet", group: "lists" },
		});

		this.registerButton("orderedList", {
			component: () =>
				import("../components/toolbarButtons/OrderedListButton.vue"),
			meta: { icon: "list-numbers", group: "lists" },
		});

		this.registerButton("horizontalRule", {
			component: () =>
				import("../components/toolbarButtons/HorizontalRuleButton.vue"),
			meta: { icon: "horizontal-rule", group: "blocks" },
		});

		this.registerButton("removeFormatting", {
			component: () =>
				import("../components/toolbarButtons/RemoveFormattingButton.vue"),
			meta: { icon: "remove-formatting", group: "text" },
		});

		this._initialized = true;
	}

	/**
	 * Register custom buttons from plugin options
	 * @param {Object} customButtons - Custom button configurations
	 */
	registerCustomButtons(customButtons) {
		if (!customButtons) return;

		Object.entries(customButtons).forEach(([name, config]) => {
			this.registerButton(name, {
				component: () =>
					import("../components/toolbarButtons/CustomButton.vue"),
				meta: {
					icon: config.icon || "style",
					group: "custom",
					buttonName: name,
					buttonConfig: config,
				},
			});
		});
	}

	/**
	 * Clear all registrations (useful for testing)
	 */
	clear() {
		this.buttons.clear();
		this.extensions.clear();
		this._initialized = false;
	}
}

// Create singleton instance with lazy initialization
let registryInstance = null;

/**
 * Get the button registry singleton instance
 * @param {boolean} reset - Whether to reset the instance (useful for testing)
 * @returns {ButtonRegistry} The registry instance
 */
export function getButtonRegistry(reset = false) {
	if (reset || !registryInstance) {
		registryInstance = new ButtonRegistry();
		registryInstance.initializeCoreButtons();
	}
	return registryInstance;
}

// Export the default instance for convenience
export const buttonRegistry = getButtonRegistry();
