const repoRoot = import.meta.env.VITE_REPO_ROOT;

const implementations = {
  "vanilla-a": {
    title: "Tiny Kanban - Vanilla A",
    mount: "app",
    entry: "01-vanilla-a-rerender/app.js",
    sharedStyles: true
  },
  "vanilla-b": {
    title: "Tiny Kanban - Vanilla B",
    mount: "app",
    entry: "02-vanilla-b-keyed-patch/app.js",
    sharedStyles: true
  },
  "jquery-a": {
    title: "Tiny Kanban - jQuery A",
    mount: "app",
    entry: "03-jquery-a-render-loop/app.js",
    jquery: true,
    sharedStyles: true
  },
  "jquery-b": {
    title: "Tiny Kanban - jQuery B",
    mount: "app",
    entry: "04-jquery-b-incremental/app.js",
    jquery: true,
    sharedStyles: true
  },
  react: {
    title: "Tiny Kanban - React",
    mount: "root",
    entry: "05-react/src/main.jsx"
  },
  svelte: {
    title: "Tiny Kanban - Svelte",
    mount: "app",
    entry: "06-svelte/src/main.js"
  }
};

function fsUrl(path) {
  return `/@fs/${repoRoot}/${path}`;
}

function implementationFromUrl() {
  return new URLSearchParams(globalThis.location.search).get("implementation") ?? "";
}

function showError(message) {
  const error = document.createElement("main");
  error.style.padding = "1rem";
  error.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
  error.textContent = message;
  document.body.replaceChildren(error);
}

function addSharedStyles() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = fsUrl("shared/styles.css");
  document.head.append(link);
}

function prepareMount(id) {
  const element =
    id === "app"
      ? Object.assign(document.createElement("main"), { id, className: "app-shell" })
      : Object.assign(document.createElement("div"), { id });
  document.body.replaceChildren(element);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  });
}

async function boot() {
  const implementation = implementations[implementationFromUrl()];
  if (!implementation) {
    showError("Unknown Tiny Kanban implementation.");
    return;
  }

  document.title = implementation.title;
  if (implementation.sharedStyles) {
    addSharedStyles();
  }
  prepareMount(implementation.mount);
  if (implementation.jquery) {
    await loadScript("https://code.jquery.com/jquery-4.0.0.min.js");
  }
  await import(/* @vite-ignore */ fsUrl(implementation.entry));
}

try {
  await boot();
} catch {
  showError("Unable to load this Tiny Kanban implementation.");
}
