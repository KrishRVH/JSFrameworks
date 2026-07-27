export const implementations = [
  {
    id: "vanilla-a",
    name: "Vanilla A",
    detail: "Naive re-render",
    title: "Tiny Kanban - Vanilla A",
    mount: "app",
    shell: true,
    entry: "01-vanilla-a-rerender/app.js",
    sharedStyles: true
  },
  {
    id: "vanilla-b",
    name: "Vanilla B",
    detail: "Keyed patch",
    title: "Tiny Kanban - Vanilla B",
    mount: "app",
    shell: true,
    entry: "02-vanilla-b-keyed-patch/app.js",
    sharedStyles: true
  },
  {
    id: "jquery-a",
    name: "jQuery A",
    detail: "Render loop",
    title: "Tiny Kanban - jQuery A",
    mount: "app",
    shell: true,
    entry: "03-jquery-a-render-loop/app.js",
    jquery: true,
    sharedStyles: true
  },
  {
    id: "jquery-b",
    name: "jQuery B",
    detail: "Incremental DOM updates",
    title: "Tiny Kanban - jQuery B",
    mount: "app",
    shell: true,
    entry: "04-jquery-b-incremental/app.js",
    jquery: true,
    sharedStyles: true
  },
  {
    id: "react",
    name: "React",
    detail: "Declarative components",
    title: "Tiny Kanban - React",
    mount: "root",
    entry: "05-react/src/main.jsx"
  },
  {
    id: "svelte",
    name: "Svelte",
    detail: "Runes reactivity",
    title: "Tiny Kanban - Svelte",
    mount: "app",
    entry: "06-svelte/src/main.js"
  },
  {
    id: "solid",
    name: "Solid",
    detail: "Fine-grained reactivity",
    title: "Tiny Kanban - Solid",
    mount: "root",
    entry: "07-solid/src/main.jsx"
  }
];
