import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDirectory, "..");
const harnessModules = resolve(currentDirectory, "node_modules");

export default defineConfig({
  plugins: [react(), svelte()],
  define: {
    "import.meta.env.VITE_REPO_ROOT": JSON.stringify(repoRoot)
  },
  server: {
    fs: {
      allow: [repoRoot]
    }
  },
  resolve: {
    alias: [
      {
        find: /^react(\/.*)?$/,
        replacement: `${resolve(harnessModules, "react")}$1`
      },
      {
        find: /^react-dom(\/.*)?$/,
        replacement: `${resolve(harnessModules, "react-dom")}$1`
      }
    ]
  }
});
