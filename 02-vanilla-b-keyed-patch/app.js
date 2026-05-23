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

function setCardDataset(node, columnId, cardId) {
  node.dataset.columnId = columnId;
  node.dataset.cardId = cardId;
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

function syncCardAction(button, { label, action, direction, columnId, cardId, disabled = false }) {
  button.type = "button";
  button.textContent = label;
  button.disabled = disabled;
  Object.assign(button.dataset, { action, columnId, cardId });
  if (direction) {
    button.dataset.direction = direction;
  } else {
    delete button.dataset.direction;
  }
  return button;
}

function actionButton(existingButton, config) {
  return syncCardAction(existingButton ?? document.createElement("button"), config);
}

function cardContent(columnId, card, existingContent) {
  const isEditing = state.editing?.columnId === columnId && state.editing?.cardId === card.id;
  if (isEditing) {
    const input = existingContent?.matches("input[data-action='draft']")
      ? existingContent
      : document.createElement("input");
    input.dataset.action = "draft";
    setCardDataset(input, columnId, card.id);
    input.setAttribute("aria-label", "Edit card title");
    if (input.value !== state.editing.draftTitle) {
      input.value = state.editing.draftTitle;
    }
    return input;
  }
  const button = existingContent?.matches("button[data-action='start-edit']")
    ? existingContent
    : document.createElement("button");
  button.type = "button";
  button.className = "card-title card-title-button";
  button.textContent = card.title;
  button.dataset.action = "start-edit";
  setCardDataset(button, columnId, card.id);
  return button;
}

function renderCardActions(node, columnId, cardId) {
  const columnIndex = COLUMN_ORDER.indexOf(columnId);
  const actions = node.querySelector(".card-actions") ?? el("div", { className: "card-actions" });
  actions.replaceChildren(
    actionButton(actions.querySelector("[data-direction='left']"), {
      label: "Left",
      action: "move",
      direction: "left",
      columnId,
      cardId,
      disabled: columnIndex === 0
    }),
    actionButton(actions.querySelector("[data-direction='right']"), {
      label: "Right",
      action: "move",
      direction: "right",
      columnId,
      cardId,
      disabled: columnIndex === COLUMN_ORDER.length - 1
    }),
    actionButton(actions.querySelector("[data-action='delete']"), {
      label: "Delete",
      action: "delete",
      columnId,
      cardId
    })
  );
  if (!actions.parentElement) {
    node.append(actions);
  }
  return actions;
}

function renderCard(columnId, card, existingCard = null) {
  const node =
    existingCard ??
    el("article", {
      className: "card",
      "data-card-id": card.id,
      "data-column-id": columnId
    });
  setCardDataset(node, columnId, card.id);
  const actions = renderCardActions(node, columnId, card.id);
  const currentContent = node.firstElementChild === actions ? null : node.firstElementChild;
  const nextContent = cardContent(columnId, card, currentContent);
  if (currentContent === nextContent) {
    return node;
  }
  if (currentContent) {
    currentContent.replaceWith(nextContent);
  } else {
    node.insertBefore(nextContent, actions);
  }
  return node;
}

function renderColumn(columnId, existing = null, oldCards = new Map()) {
  const column =
    existing ??
    el("section", { className: "column", "data-column-id": columnId }, [
      el("header", { className: "column-header" }),
      el("form", { className: "add-form", "data-action": "add", "data-column-id": columnId }),
      el("div", { className: "cards" })
    ]);
  column.querySelector(".column-header").replaceChildren(
    el("h2", { className: "column-title", text: COLUMN_TITLES[columnId] }),
    el("span", {
      className: "column-count",
      text: `${state.columns[columnId].length} cards`
    })
  );
  const form = column.querySelector(".add-form");
  if (!form.childElementCount) {
    form.replaceChildren(
      el("input", {
        name: "title",
        placeholder: `Add to ${COLUMN_TITLES[columnId]}`,
        autocomplete: "off"
      }),
      el("button", { type: "submit", text: "Add" })
    );
  }
  const cardsRoot = column.querySelector(".cards");
  const cards = visibleCards(state, columnId);
  cardsRoot.replaceChildren(
    ...(cards.length
      ? cards.map((card) => renderCard(columnId, card, oldCards.get(card.id)))
      : [el("div", { className: "empty-state", text: "No matching cards" })])
  );
  return column;
}

function renderShell() {
  root.replaceChildren(
    el("header", { className: "app-header" }, [
      el("div", {}, [
        el("h1", { className: "app-title", text: "Tiny Kanban" }),
        el("p", { className: "app-subtitle", text: "Vanilla B: keyed patch" })
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
    el("section", { className: "board" })
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
  const oldColumns = new Map(
    [...board.querySelectorAll(".column")].map((column) => [column.dataset.columnId, column])
  );
  const oldCards = new Map(
    [...board.querySelectorAll(".card")].map((cardNode) => [cardNode.dataset.cardId, cardNode])
  );
  filter.value = state.filter;
  root.querySelector(".count-pill").textContent = `${totalCount(state.columns)} total`;
  board.replaceChildren(
    ...COLUMN_ORDER.map((columnId) => renderColumn(columnId, oldColumns.get(columnId), oldCards))
  );
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
