// `kirbyup.config.js`
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
import { defineConfig } from "kirbyup/config"

const currentDir = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  alias: {
    "@/": `${resolve(currentDir, "../kirby/panel/src")}/`,
  },
})
