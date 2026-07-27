import { implementations } from "./implementations.js";

const repoRoot = import.meta.env.VITE_REPO_ROOT;

const JQUERY_SRC = "https://code.jquery.com/jquery-4.0.0.min.js";
// biome-ignore lint/security/noSecrets: public subresource-integrity hash, not a secret
const JQUERY_INTEGRITY = "sha384-fgGyf7Mo7DURSOMnOy7ed+dkq5Job205Gnzu6QIg0BOHKaqt4D76Dt8VlDCzcMHV";

function fsUrl(path) {
  return `/@fs/${repoRoot}/${path}`;
}

function implementationFromUrl() {
  const id = new URLSearchParams(globalThis.location.search).get("implementation") ?? "";
  return implementations.find((implementation) => implementation.id === id);
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

function prepareMount({ mount, shell }) {
  const element = shell
    ? Object.assign(document.createElement("main"), { id: mount, className: "app-shell" })
    : Object.assign(document.createElement("div"), { id: mount });
  document.body.replaceChildren(element);
}

function loadScript(src, integrity) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.integrity = integrity;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  });
}

async function boot() {
  const implementation = implementationFromUrl();
  if (!implementation) {
    showError("Unknown Tiny Kanban implementation.");
    return;
  }

  document.title = implementation.title;
  if (implementation.sharedStyles) {
    addSharedStyles();
  }
  prepareMount(implementation);
  if (implementation.jquery) {
    await loadScript(JQUERY_SRC, JQUERY_INTEGRITY);
  }
  await import(/* @vite-ignore */ fsUrl(implementation.entry));
}

try {
  await boot();
} catch (error) {
  console.error(error);
  showError("Unable to load this Tiny Kanban implementation.");
}
