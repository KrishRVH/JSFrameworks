import { STORAGE_KEY } from "../../shared/seed.js";
import { implementations } from "./implementations.js";
import "./styles.css";

function harnessUrl(id) {
  const params = new URLSearchParams({
    implementation: id,
    kanbanInstance: id
  });
  return `/frame.html?${params.toString()}`;
}

function storageKey(id) {
  return `${STORAGE_KEY}:${id}`;
}

function reloadFrame(frame) {
  frame.contentWindow?.location.reload();
}

function reloadAll() {
  for (const frame of document.querySelectorAll("iframe")) {
    reloadFrame(frame);
  }
}

function resetAll() {
  for (const implementation of implementations) {
    localStorage.removeItem(storageKey(implementation.id));
  }
  reloadAll();
}

function renderPanel(implementation) {
  const article = document.createElement("article");
  article.className = "compare-panel";

  const header = document.createElement("header");
  header.className = "panel-header";

  const headingGroup = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = implementation.name;
  const detail = document.createElement("p");
  detail.textContent = implementation.detail;
  headingGroup.append(title, detail);

  const controls = document.createElement("div");
  controls.className = "panel-actions";

  const openLink = document.createElement("a");
  openLink.href = harnessUrl(implementation.id);
  openLink.target = "_blank";
  openLink.rel = "noreferrer";
  openLink.textContent = "Open";

  const reloadButton = document.createElement("button");
  reloadButton.type = "button";
  reloadButton.textContent = "Reload";

  controls.append(openLink, reloadButton);
  header.append(headingGroup, controls);

  const frame = document.createElement("iframe");
  frame.src = harnessUrl(implementation.id);
  frame.title = `${implementation.name} Tiny Kanban`;

  reloadButton.addEventListener("click", () => reloadFrame(frame));
  article.append(header, frame);
  return article;
}

document.querySelector("#compare-grid").append(...implementations.map(renderPanel));

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  if (target.dataset.action === "reload-all") {
    reloadAll();
  } else if (target.dataset.action === "reset-all") {
    resetAll();
  }
});
