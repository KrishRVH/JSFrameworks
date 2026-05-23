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
import {
  COLUMN_ORDER,
  COLUMN_TITLES,
  clearSavedBoard,
  loadState,
  saveColumns
} from "../shared/seed.js";

const root = document.querySelector("#app");
let state = loadState();

function closest(target, selector) {
  return target instanceof Element ? target.closest(selector) : null;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "className") {
      node.className = value;
    } else if (key === "text") {
      node.textContent = value;
    } else if (key === "disabled") {
      node.disabled = value;
    } else if (key === "value") {
      node.value = value;
    } else {
      node.setAttribute(key, value);
    }
  }
  for (const child of children) {
    node.append(child);
  }
  return node;
}

function cardAttrs(columnId, cardId) {
  return { "data-column-id": columnId, "data-card-id": cardId };
}

function button(label, attrs = {}) {
  return el("button", { type: "button", text: label, ...attrs });
}

function setState(nextState, persist = false) {
  if (nextState === state) {
    return;
  }
  const columnsChanged = nextState.columns !== state.columns;
  state = nextState;
  if (persist && columnsChanged) {
    saveColumns(state.columns);
  }
  render();
}

function durable(nextState) {
  setState(nextState, true);
}

function transient(nextState) {
  setState(nextState);
}

function renderCardActions(columnId, cardId) {
  const columnIndex = COLUMN_ORDER.indexOf(columnId);
  const data = cardAttrs(columnId, cardId);

  return el("div", { className: "card-actions" }, [
    button("Left", {
      ...data,
      "data-action": "move",
      "data-direction": "left",
      disabled: columnIndex === 0
    }),
    button("Right", {
      ...data,
      "data-action": "move",
      "data-direction": "right",
      disabled: columnIndex === COLUMN_ORDER.length - 1
    }),
    button("Delete", { ...data, "data-action": "delete" })
  ]);
}

function renderCard(columnId, card) {
  const data = cardAttrs(columnId, card.id);
  const isEditing = state.editing?.columnId === columnId && state.editing?.cardId === card.id;
  const content = isEditing
    ? el("input", {
        ...data,
        "data-action": "draft",
        value: state.editing.draftTitle,
        "aria-label": "Edit card title"
      })
    : el("button", {
        ...data,
        type: "button",
        className: "card-title card-title-button",
        text: card.title,
        "data-action": "start-edit"
      });

  return el("article", { className: "card", ...data }, [
    content,
    renderCardActions(columnId, card.id)
  ]);
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
  const input = root.querySelector("input[data-action='draft']");
  input?.focus();
  input?.select();
}

function render() {
  if (!root.querySelector(".board")) {
    renderShell();
  }
  const board = root.querySelector(".board");
  const filter = root.querySelector("[data-action='filter']");
  filter.value = state.filter;
  root.querySelector(".count-pill").textContent = `${totalCount(state.columns)} total`;
  board.replaceChildren(...COLUMN_ORDER.map(renderColumn));
}

root.addEventListener("submit", (event) => {
  const form = closest(event.target, "form[data-action='add']");
  if (!form) {
    return;
  }
  event.preventDefault();
  const title = new FormData(form).get("title") ?? "";
  durable(addCardState(state, form.dataset.columnId, String(title)));
  form.reset();
});

root.addEventListener("click", (event) => {
  const target = closest(event.target, "[data-action]");
  if (!target) {
    return;
  }
  const { action, columnId, cardId, direction } = target.dataset;
  switch (action) {
    case "delete":
      durable(deleteCardState(state, columnId, cardId));
      break;
    case "move":
      durable(moveCardState(state, columnId, cardId, direction));
      break;
    case "start-edit":
      transient(startEditState(state, columnId, cardId));
      focusEditingInput();
      break;
    case "reset":
      clearSavedBoard();
      transient(resetState());
      break;
  }
});

root.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  switch (target.dataset.action) {
    case "filter":
      transient(setFilterState(state, target.value));
      break;
    case "draft":
      transient(updateDraftState(state, target.value));
      break;
  }
});

root.addEventListener("keydown", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.dataset.action !== "draft") {
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    durable(commitEditState(state));
  } else if (event.key === "Escape") {
    event.preventDefault();
    transient(cancelEditState(state));
  }
});

root.addEventListener("focusout", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.dataset.action === "draft") {
    durable(commitEditState(state));
  }
});

render();
