import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const benchRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const repoRoot = resolve(benchRoot, "..");

export const PORT = 4600;
export const STORAGE_KEY = "tiny-kanban:v1";

export const CPU_THROTTLE = 4;
export const TIMING_ITERATIONS = 9;
export const TIMING_CARDS = 1000;
export const CHURN_CARDS = 300;
export const MEMORY_CARDS_SMALL = 1000;
export const MEMORY_CARDS_LARGE = 5000;

// The three built rungs are benchmarked from production builds (dist/), never dev
// servers: dev transforms and StrictMode double-rendering would poison every number.
export const rungs = [
  {
    id: "vanilla-a",
    name: "Vanilla A",
    detail: "Naive re-render",
    path: "/01-vanilla-a-rerender/",
    jquery: false,
    built: false,
    sources: ["01-vanilla-a-rerender/app.js"],
    payload: ["01-vanilla-a-rerender/app.js", "shared/actions.js", "shared/seed.js"]
  },
  {
    id: "vanilla-b",
    name: "Vanilla B",
    detail: "Keyed patch",
    path: "/02-vanilla-b-keyed-patch/",
    jquery: false,
    built: false,
    sources: ["02-vanilla-b-keyed-patch/app.js"],
    payload: ["02-vanilla-b-keyed-patch/app.js", "shared/actions.js", "shared/seed.js"]
  },
  {
    id: "jquery-a",
    name: "jQuery A",
    detail: "Render loop",
    path: "/03-jquery-a-render-loop/",
    jquery: true,
    built: false,
    sources: ["03-jquery-a-render-loop/app.js"],
    payload: [
      "03-jquery-a-render-loop/app.js",
      "shared/actions.js",
      "shared/seed.js",
      "bench/vendor/jquery-4.0.0.min.js"
    ]
  },
  {
    id: "jquery-b",
    name: "jQuery B",
    detail: "Incremental DOM updates",
    path: "/04-jquery-b-incremental/",
    jquery: true,
    built: false,
    sources: ["04-jquery-b-incremental/app.js"],
    payload: [
      "04-jquery-b-incremental/app.js",
      "shared/actions.js",
      "shared/seed.js",
      "bench/vendor/jquery-4.0.0.min.js"
    ]
  },
  {
    id: "react",
    name: "React",
    detail: "Declarative components",
    path: "/dist/react/",
    jquery: false,
    built: true,
    package: "05-react",
    sources: ["05-react/src/App.jsx", "05-react/src/main.jsx"]
  },
  {
    id: "svelte",
    name: "Svelte",
    detail: "Runes reactivity",
    path: "/dist/svelte/",
    jquery: false,
    built: true,
    package: "06-svelte",
    sources: [
      "06-svelte/src/App.svelte",
      "06-svelte/src/Card.svelte",
      "06-svelte/src/Column.svelte",
      "06-svelte/src/board.svelte.js",
      "06-svelte/src/main.js"
    ]
  },
  {
    id: "solid",
    name: "Solid",
    detail: "Fine-grained reactivity",
    path: "/dist/solid/",
    jquery: false,
    built: true,
    package: "07-solid",
    sources: [
      "07-solid/src/App.jsx",
      "07-solid/src/Card.jsx",
      "07-solid/src/Column.jsx",
      "07-solid/src/board.js",
      "07-solid/src/main.jsx"
    ]
  }
];
