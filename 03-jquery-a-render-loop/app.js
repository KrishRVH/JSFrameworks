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

const $ = window.jQuery;
const $root = $("#app");
let state = loadState();

function cardAttrs(columnId, cardId) {
  return { "data-column-id": columnId, "data-card-id": cardId };
}

function $button(label, attrs = {}) {
  return $("<button>", { type: "button", ...attrs }).text(label);
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

function cardActions(columnId, cardId) {
  const columnIndex = COLUMN_ORDER.indexOf(columnId);
  const data = cardAttrs(columnId, cardId);

  return $("<div>", { class: "card-actions" }).append(
    $button("Left", {
      ...data,
      "data-action": "move",
      "data-direction": "left",
      disabled: columnIndex === 0
    }),
    $button("Right", {
      ...data,
      "data-action": "move",
      "data-direction": "right",
      disabled: columnIndex === COLUMN_ORDER.length - 1
    }),
    $button("Delete", { ...data, "data-action": "delete" })
  );
}

function cardNode(columnId, card) {
  const data = cardAttrs(columnId, card.id);
  const isEditing = state.editing?.columnId === columnId && state.editing?.cardId === card.id;
  const $content = isEditing
    ? $("<input>", {
        ...data,
        "data-action": "draft",
        "aria-label": "Edit card title"
      }).val(state.editing.draftTitle)
    : $("<button>", {
        ...data,
        type: "button",
        class: "card-title card-title-button",
        "data-action": "start-edit"
      }).text(card.title);

  return $("<article>", {
    class: "card",
    ...data
  }).append($content, cardActions(columnId, card.id));
}

function columnNode(columnId) {
  const cards = visibleCards(state, columnId);
  const cardNodes = cards.length
    ? cards.map((card) => cardNode(columnId, card))
    : [$("<div>", { class: "empty-state" }).text("No matching cards")];

  return $("<section>", { class: "column", "data-column-id": columnId }).append(
    $("<header>", { class: "column-header" }).append(
      $("<h2>", { class: "column-title" }).text(COLUMN_TITLES[columnId]),
      $("<span>", { class: "column-count" }).text(`${state.columns[columnId].length} cards`)
    ),
    $("<form>", { class: "add-form", "data-action": "add", "data-column-id": columnId }).append(
      $("<input>", {
        name: "title",
        placeholder: `Add to ${COLUMN_TITLES[columnId]}`,
        autocomplete: "off"
      }),
      $("<button>", { type: "submit", text: "Add" })
    ),
    $("<div>", { class: "cards" }).append(cardNodes)
  );
}

function renderShell() {
  $root.empty().append(
    $("<header>", { class: "app-header" }).append(
      $("<div>").append(
        $("<h1>", { class: "app-title" }).text("Tiny Kanban"),
        $("<p>", { class: "app-subtitle" }).text("jQuery A: render loop")
      )
    ),
    $("<section>", { class: "toolbar" }).append(
      $("<input>", {
        "data-action": "filter",
        placeholder: "Filter cards",
        "aria-label": "Filter cards"
      }).val(state.filter),
      $("<span>", { class: "count-pill" }).text(`${totalCount(state.columns)} total`),
      $("<button>", { type: "button", text: "Reset", "data-action": "reset" })
    ),
    $("<section>", { class: "board" })
  );
}

function focusEditingInput() {
  const input = $root.find("input[data-action='draft']").trigger("focus").get(0);
  input?.select();
}

function render() {
  if (!$root.find(".board").length) {
    renderShell();
  }
  $root.find("[data-action='filter']").val(state.filter);
  $root.find(".count-pill").text(`${totalCount(state.columns)} total`);
  $root.find(".board").empty().append(COLUMN_ORDER.map(columnNode));
}

$root.on("submit", "form[data-action='add']", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  durable(
    addCardState(state, form.dataset.columnId, String(new FormData(form).get("title") ?? ""))
  );
  form.reset();
});

$root.on("click", "[data-action]", (event) => {
  const { action, columnId, cardId, direction } = event.currentTarget.dataset;
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

$root.on("input", "[data-action='filter']", (event) => {
  transient(setFilterState(state, event.currentTarget.value));
});

$root.on("input", "[data-action='draft']", (event) => {
  transient(updateDraftState(state, event.currentTarget.value));
});

$root.on("keydown", "[data-action='draft']", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    durable(commitEditState(state));
  } else if (event.key === "Escape") {
    event.preventDefault();
    transient(cancelEditState(state));
  }
});

$root.on("focusout", "[data-action='draft']", () => durable(commitEditState(state)));

render();
