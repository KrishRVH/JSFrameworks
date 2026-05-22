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

function persist() {
  saveColumns(state.columns);
}

function cardById(columnId, cardId) {
  return state.columns[columnId].find((card) => card.id === cardId);
}

function cardNode(columnId, card) {
  return $("<article>", {
    class: "card",
    "data-card-id": card.id,
    "data-column-id": columnId
  }).append(
    $("<button>", {
      type: "button",
      class: "card-title card-title-button",
      "data-action": "start-edit",
      "data-column-id": columnId,
      "data-card-id": card.id
    }).text(card.title),
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

function syncCounts() {
  $(".count-pill").text(`${totalCount(state.columns)} total`);
  COLUMN_ORDER.forEach((columnId) => {
    $(`.column[data-column-id='${columnId}'] .column-count`).text(
      `${state.columns[columnId].length} cards`
    );
  });
}

function updateCardControls($card, columnId) {
  $card.attr("data-column-id", columnId);
  $card.find("[data-column-id]").attr("data-column-id", columnId);
  $card
    .find("[data-direction='left']")
    .prop("disabled", COLUMN_ORDER.indexOf(columnId) === 0);
  $card
    .find("[data-direction='right']")
    .prop("disabled", COLUMN_ORDER.indexOf(columnId) === COLUMN_ORDER.length - 1);
}

function syncEmptyState(columnId) {
  const $cards = $(`.column[data-column-id='${columnId}'] .cards`);
  const visibleCount = $cards.children(".card").length;
  $cards.children(".empty-state").remove();
  if (!visibleCount) {
    $cards.append($("<div>", { class: "empty-state" }).text("No matching cards"));
  }
}

function rerenderVisibleCards(columnId) {
  const $cards = $(`.column[data-column-id='${columnId}'] .cards`).empty();
  const cards = visibleCards(state, columnId);
  if (cards.length) {
    cards.forEach((card) => $cards.append(cardNode(columnId, card)));
  } else {
    $cards.append($("<div>", { class: "empty-state" }).text("No matching cards"));
  }
}

function renderShell() {
  $root.empty().append(
    $("<header>", { class: "app-header" }).append(
      $("<div>").append(
        $("<h1>", { class: "app-title" }).text("Tiny Kanban"),
        $("<p>", { class: "app-subtitle" }).text("jQuery B: incremental DOM updates")
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
    $("<section>", { class: "board" }).append(
      COLUMN_ORDER.map((columnId) =>
        $("<section>", { class: "column", "data-column-id": columnId }).append(
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
          $("<div>", { class: "cards" })
        )
      )
    )
  );
  COLUMN_ORDER.forEach(rerenderVisibleCards);
}

$root.on("submit", "form[data-action='add']", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const columnId = form.dataset.columnId;
  const before = state.columns[columnId].length;
  state = addCardState(state, columnId, String(new FormData(form).get("title") ?? ""));
  if (state.columns[columnId].length === before) return;
  const card = state.columns[columnId].at(-1);
  const filter = state.filter.trim().toLowerCase();
  if (!filter || card.title.toLowerCase().includes(filter)) {
    const $cards = $(`.column[data-column-id='${columnId}'] .cards`);
    $cards.children(".empty-state").remove();
    $cards.append(cardNode(columnId, card));
  }
  form.reset();
  persist();
  syncCounts();
});

$root.on("click", "[data-action='delete']", (event) => {
  const { columnId, cardId } = event.currentTarget.dataset;
  state = deleteCardState(state, columnId, cardId);
  $(`.card[data-card-id='${cardId}']`).remove();
  persist();
  syncCounts();
  syncEmptyState(columnId);
});

$root.on("click", "[data-action='move']", (event) => {
  const { columnId, cardId, direction } = event.currentTarget.dataset;
  state = moveCardState(state, columnId, cardId, direction);
  const targetColumnId = state.editing?.cardId === cardId ? state.editing.columnId : (
    direction === "left"
      ? COLUMN_ORDER[COLUMN_ORDER.indexOf(columnId) - 1]
      : COLUMN_ORDER[COLUMN_ORDER.indexOf(columnId) + 1]
  );
  if (!targetColumnId) return;
  const $card = $(`.card[data-card-id='${cardId}']`).detach();
  updateCardControls($card, targetColumnId);
  const card = cardById(targetColumnId, cardId);
  const filter = state.filter.trim().toLowerCase();
  if (!filter || card.title.toLowerCase().includes(filter)) {
    $(`.column[data-column-id='${targetColumnId}'] .cards`).children(".empty-state").remove().end().append($card);
  }
  persist();
  syncCounts();
  syncEmptyState(columnId);
  syncEmptyState(targetColumnId);
});

$root.on("click", "[data-action='start-edit']", (event) => {
  const { columnId, cardId } = event.currentTarget.dataset;
  finishEdit(true);
  state = startEditState(state, columnId, cardId);
  const $title = $(event.currentTarget);
  $title.replaceWith(
    $("<input>", {
      "data-action": "draft",
      "data-column-id": columnId,
      "data-card-id": cardId,
      "aria-label": "Edit card title"
    }).val(state.editing.draftTitle)
  );
  $(`input[data-card-id='${cardId}']`).trigger("focus");
});

$root.on("input", "[data-action='draft']", (event) => {
  state = updateDraftState(state, event.currentTarget.value);
});

$root.on("input", "[data-action='filter']", (event) => {
  state = setFilterState(state, event.currentTarget.value);
  COLUMN_ORDER.forEach(rerenderVisibleCards);
});

function finishEdit(commit) {
  const editing = state.editing;
  if (!editing) return;
  state = commit ? commitEditState(state) : cancelEditState(state);
  const card = cardById(editing.columnId, editing.cardId);
  const $card = $(`.card[data-card-id='${editing.cardId}']`);
  if (card) {
    const filter = state.filter.trim().toLowerCase();
    if (filter && !card.title.toLowerCase().includes(filter)) {
      $card.remove();
      syncEmptyState(editing.columnId);
    } else {
      $card.find("input[data-action='draft']").replaceWith(
        $("<button>", {
          type: "button",
          class: "card-title card-title-button",
          "data-action": "start-edit",
          "data-column-id": editing.columnId,
          "data-card-id": editing.cardId
        }).text(card.title)
      );
    }
  } else {
    $card.remove();
    syncEmptyState(editing.columnId);
  }
  if (commit) persist();
  syncCounts();
}

$root.on("keydown", "[data-action='draft']", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    finishEdit(true);
  }
  if (event.key === "Escape") {
    event.preventDefault();
    finishEdit(false);
  }
});

$root.on("focusout", "[data-action='draft']", () => finishEdit(true));

$root.on("click", "[data-action='reset']", () => {
  clearSavedBoard();
  state = resetState();
  persist();
  renderShell();
});

renderShell();
