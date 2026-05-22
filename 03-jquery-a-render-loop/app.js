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

const $ = window.jQuery;
const $root = $("#app");
let state = loadState();

function durable(nextState) {
  state = nextState;
  saveColumns(state.columns);
  render();
}

function transient(nextState) {
  state = nextState;
  render();
}

function cardNode(columnId, card) {
  const isEditing =
    state.editing?.columnId === columnId && state.editing?.cardId === card.id;
  const $content = isEditing
    ? $("<input>", {
        "data-action": "draft",
        "data-column-id": columnId,
        "data-card-id": card.id,
        "aria-label": "Edit card title"
      }).val(state.editing.draftTitle)
    : $("<button>", {
        type: "button",
        class: "card-title card-title-button",
        "data-action": "start-edit",
        "data-column-id": columnId,
        "data-card-id": card.id
      }).text(card.title);

  return $("<article>", {
    class: "card",
    "data-card-id": card.id,
    "data-column-id": columnId
  }).append(
    $content,
    $("<div>", { class: "card-actions" }).append(
      $("<button>", {
        type: "button",
        text: "Left",
        "data-action": "move",
        "data-direction": "left",
        "data-column-id": columnId,
        "data-card-id": card.id,
        disabled: COLUMN_ORDER.indexOf(columnId) === 0
      }),
      $("<button>", {
        type: "button",
        text: "Right",
        "data-action": "move",
        "data-direction": "right",
        "data-column-id": columnId,
        "data-card-id": card.id,
        disabled: COLUMN_ORDER.indexOf(columnId) === COLUMN_ORDER.length - 1
      }),
      $("<button>", {
        type: "button",
        text: "Delete",
        "data-action": "delete",
        "data-column-id": columnId,
        "data-card-id": card.id
      })
    )
  );
}

function columnNode(columnId) {
  const cards = visibleCards(state, columnId);
  const $cards = $("<div>", { class: "cards" });
  if (cards.length) {
    cards.forEach((card) => $cards.append(cardNode(columnId, card)));
  } else {
    $cards.append($("<div>", { class: "empty-state" }).text("No matching cards"));
  }
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
    $cards
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
  $root.find("input[data-action='draft']").trigger("focus");
}

function render() {
  if (!$root.find(".board").length) renderShell();
  $root.find("[data-action='filter']").val(state.filter);
  $root.find(".count-pill").text(`${totalCount(state.columns)} total`);
  $root.find(".board").empty().append(COLUMN_ORDER.map(columnNode));
}

$root.on("submit", "form[data-action='add']", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  durable(addCardState(state, form.dataset.columnId, String(new FormData(form).get("title") ?? "")));
  form.reset();
});

$root.on("click", "[data-action]", (event) => {
  const { action, columnId, cardId, direction } = event.currentTarget.dataset;
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
  }
  if (event.key === "Escape") {
    event.preventDefault();
    transient(cancelEditState(state));
  }
});

$root.on("focusout", "[data-action='draft']", () => durable(commitEditState(state)));

render();
