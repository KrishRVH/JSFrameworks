import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDirectory, "..");
const harnessModules = resolve(currentDirectory, "node_modules");

// JSX partition: @vitejs/plugin-react configures Vite's oxc JSX transform globally; its
// include/exclude only scope React Fast Refresh. 07-solid JSX still compiles correctly
// because vite-plugin-solid runs with enforce "pre" and consumes it before the oxc pass.
export default defineConfig({
  plugins: [
    react({ include: [/05-react/], exclude: [/07-solid/] }),
    svelte(),
    solid({ include: [/07-solid/] })
  ],
  // The harness serves rung sources via /@fs/<absolute path>, so it is dev-only by design
  // and has no build script; the injected repo root never ships anywhere.
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
