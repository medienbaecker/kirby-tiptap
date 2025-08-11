import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "kirbyup/config";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

// With this alias we can import Kirby components
export default defineConfig({
	alias: {
		"@/": `${resolve(currentDir, "../kirby/panel/src")}/`,
	},
	vite: {
		server: {
			cors: true,
		},
		build: {
			target: ["chrome107", "edge107", "firefox104", "safari16"],
		},
	},
});
