import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "kirbyup/config";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

// With this alias we can import Kirby components
export default defineConfig({
	alias: {
		"@/": `${resolve(currentDir, "../kirby6/panel/src")}/`,
	},
	vite: {
		server: {
			cors: true,
		},
		build: {
			target: ["chrome107", "edge107", "firefox104", "safari16"],
			rollupOptions: {
				output: {
					// Kirby only serves the concatenated media/plugins/index.js,
					// so code-split chunks would 404
					codeSplitting: false,
				},
			},
		},
	},
});
