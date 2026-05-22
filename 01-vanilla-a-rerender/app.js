import {
  COLUMN_ORDER,
  COLUMN_TITLES,
  clearSavedBoard,
  loadState,
  saveColumns
} from "../shared/seed.js";
import {
  addCardState,
  cancelEditState,
  commitEditState,
  deleteCardState,
  moveCardState,
  resetState,
  setFilterState,
  startEditState,
  totalCount,
  updateDraftState,
  visibleCards
} from "../shared/actions.js";

const root = document.querySelector("#app");
let state = loadState();

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "disabled") node.disabled = value;
    else if (key === "value") node.value = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function durable(nextState) {
  state = nextState;
  saveColumns(state.columns);
  render();
}

function transient(nextState) {
  state = nextState;
  render();
}

function renderCard(columnId, card) {
  const isEditing =
    state.editing?.columnId === columnId && state.editing?.cardId === card.id;
  const content = isEditing
    ? el("input", {
        "data-action": "draft",
        "data-column-id": columnId,
        "data-card-id": card.id,
        value: state.editing.draftTitle,
        "aria-label": "Edit card title"
      })
    : el("button", {
        type: "button",
        className: "card-title card-title-button",
        text: card.title,
        "data-action": "start-edit",
        "data-column-id": columnId,
        "data-card-id": card.id
      });

  return el(
    "article",
    { className: "card", "data-card-id": card.id, "data-column-id": columnId },
    [
      content,
      el("div", { className: "card-actions" }, [
        el("button", {
          type: "button",
          text: "Left",
          "data-action": "move",
          "data-direction": "left",
          "data-column-id": columnId,
          "data-card-id": card.id,
          disabled: COLUMN_ORDER.indexOf(columnId) === 0
        }),
        el("button", {
          type: "button",
          text: "Right",
          "data-action": "move",
          "data-direction": "right",
          "data-column-id": columnId,
          "data-card-id": card.id,
          disabled: COLUMN_ORDER.indexOf(columnId) === COLUMN_ORDER.length - 1
        }),
        el("button", {
          type: "button",
          text: "Delete",
          "data-action": "delete",
          "data-column-id": columnId,
          "data-card-id": card.id
        })
      ])
    ]
  );
}

function renderColumn(columnId) {
  const cards = visibleCards(state, columnId);
  const cardNodes = cards.length
    ? cards.map((card) => renderCard(columnId, card))
    : [el("div", { className: "empty-state", text: "No matching cards" })];

  return el("section", { className: "column", "data-column-id": columnId }, [
    el("header", { className: "column-header" }, [
      el("h2", { className: "column-title", text: COLUMN_TITLES[columnId] }),
      el("span", {
        className: "column-count",
        text: `${state.columns[columnId].length} cards`
      })
    ]),
    el("form", { className: "add-form", "data-action": "add", "data-column-id": columnId }, [
      el("input", {
        name: "title",
        placeholder: `Add to ${COLUMN_TITLES[columnId]}`,
        autocomplete: "off"
      }),
      el("button", { type: "submit", text: "Add" })
    ]),
    el("div", { className: "cards" }, cardNodes)
  ]);
}

function renderShell() {
  root.replaceChildren(
    el("header", { className: "app-header" }, [
      el("div", {}, [
        el("h1", { className: "app-title", text: "Tiny Kanban" }),
        el("p", { className: "app-subtitle", text: "Vanilla A: naive re-render" })
      ])
    ]),
    el("section", { className: "toolbar" }, [
      el("input", {
        "data-action": "filter",
        placeholder: "Filter cards",
        value: state.filter,
        "aria-label": "Filter cards"
      }),
      el("span", { className: "count-pill", text: `${totalCount(state.columns)} total` }),
      el("button", { type: "button", text: "Reset", "data-action": "reset" })
    ]),
    el("section", { className: "board" }),
    el("p", {
      className: "notes",
      text: "Phase A rebuilds card lists. Editing intentionally loses focus as part of the lesson."
    })
  );
}

function focusEditingInput() {
  root.querySelector("input[data-action='draft']")?.focus();
}

function render() {
  if (!root.querySelector(".board")) renderShell();
  root.querySelector("[data-action='filter']").value = state.filter;
  root.querySelector(".count-pill").textContent = `${totalCount(state.columns)} total`;
  root.querySelector(".board").replaceChildren(...COLUMN_ORDER.map(renderColumn));
}

root.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-action='add']");
  if (!form) return;
  event.preventDefault();
  const title = new FormData(form).get("title") ?? "";
  durable(addCardState(state, form.dataset.columnId, String(title)));
  form.reset();
});

root.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, columnId, cardId, direction } = target.dataset;
  if (action === "delete") durable(deleteCardState(state, columnId, cardId));
  if (action === "move") durable(moveCardState(state, columnId, cardId, direction));
  if (action === "start-edit") {
    transient(startEditState(state, columnId, cardId));
    focusEditingInput();
  }
  if (action === "reset") {
    clearSavedBoard();
    durable(resetState());
  }
});

root.addEventListener("input", (event) => {
  const action = event.target.dataset.action;
  if (action === "filter") transient(setFilterState(state, event.target.value));
  if (action === "draft") transient(updateDraftState(state, event.target.value));
});

root.addEventListener("keydown", (event) => {
  if (event.target.dataset.action !== "draft") return;
  if (event.key === "Enter") {
    event.preventDefault();
    durable(commitEditState(state));
  }
  if (event.key === "Escape") {
    event.preventDefault();
    transient(cancelEditState(state));
  }
});

root.addEventListener("focusout", (event) => {
  if (event.target.dataset.action === "draft") durable(commitEditState(state));
});

render();
