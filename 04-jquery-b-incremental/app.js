import {
  addCardState,
  cancelEditState,
  cardMatchesFilter,
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
  moveDestination,
  saveColumns
} from "../shared/seed.js";

const $ = window.jQuery;
const $root = $("#app");
let state = loadState();

function columnSelector(columnId) {
  return `.column[data-column-id='${columnId}']`;
}

function cardSelector(cardId) {
  return `.card[data-card-id="${$.escapeSelector(cardId)}"]`;
}

function cardsFor(columnId) {
  return $root.find(`${columnSelector(columnId)} .cards`);
}

function cardAttrs(columnId, cardId) {
  return { "data-column-id": columnId, "data-card-id": cardId };
}

function $button(label, attrs = {}) {
  return $("<button>", { type: "button", ...attrs }).text(label);
}

function isEditingCard(columnId, cardId) {
  return state.editing?.columnId === columnId && state.editing.cardId === cardId;
}

function isVisible(card) {
  return Boolean(card && cardMatchesFilter(card, state.filter));
}

function persist() {
  saveColumns(state.columns);
}

function cardById(columnId, cardId) {
  return state.columns[columnId].find((card) => card.id === cardId);
}

function emptyState() {
  return $("<div>", { class: "empty-state" }).text("No matching cards");
}

function cardContent(columnId, card) {
  const data = cardAttrs(columnId, card.id);

  if (isEditingCard(columnId, card.id)) {
    return $("<input>", {
      ...data,
      "data-action": "draft",
      "aria-label": "Edit card title"
    }).val(state.editing.draftTitle);
  }

  return $button(card.title, {
    ...data,
    class: "card-title card-title-button",
    "data-action": "start-edit"
  });
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

  return $("<article>", {
    class: "card",
    ...data
  }).append(cardContent(columnId, card), cardActions(columnId, card.id));
}

function syncCounts() {
  $root.find(".count-pill").text(`${totalCount(state.columns)} total`);
  COLUMN_ORDER.forEach((columnId) => {
    $root
      .find(`${columnSelector(columnId)} .column-count`)
      .text(`${state.columns[columnId].length} cards`);
  });
}

function updateCardControls($card, columnId) {
  $card.attr("data-column-id", columnId);
  $card.find("[data-column-id]").attr("data-column-id", columnId);
  $card.find("[data-direction='left']").prop("disabled", COLUMN_ORDER.indexOf(columnId) === 0);
  $card
    .find("[data-direction='right']")
    .prop("disabled", COLUMN_ORDER.indexOf(columnId) === COLUMN_ORDER.length - 1);
}

function syncEmptyState(columnId) {
  const $cards = cardsFor(columnId);
  const visibleCount = $cards.children(".card").length;
  $cards.children(".empty-state").remove();
  if (!visibleCount) {
    $cards.append(emptyState());
  }
}

function rerenderVisibleCards(columnId) {
  const cards = visibleCards(state, columnId);
  const cardNodes = cards.length ? cards.map((card) => cardNode(columnId, card)) : [emptyState()];
  cardsFor(columnId).empty().append(cardNodes);
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
          $("<form>", {
            class: "add-form",
            "data-action": "add",
            "data-column-id": columnId
          }).append(
            $("<input>", {
              name: "title",
              placeholder: `Add to ${COLUMN_TITLES[columnId]}`,
              autocomplete: "off"
            }),
            $("<button>", { type: "submit" }).text("Add")
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
  const nextState = addCardState(state, columnId, String(new FormData(form).get("title") ?? ""));
  form.reset();

  if (nextState === state) {
    return;
  }

  state = nextState;
  const card = state.columns[columnId].at(-1);
  if (isVisible(card)) {
    const $cards = cardsFor(columnId);
    $cards.children(".empty-state").remove();
    $cards.append(cardNode(columnId, card));
  }
  persist();
  syncCounts();
});

$root.on("click", "[data-action='delete']", (event) => {
  const { columnId, cardId } = event.currentTarget.dataset;
  state = deleteCardState(state, columnId, cardId);
  $root.find(cardSelector(cardId)).remove();
  persist();
  syncCounts();
  syncEmptyState(columnId);
});

$root.on("click", "[data-action='move']", (event) => {
  const { columnId, cardId, direction } = event.currentTarget.dataset;
  const nextState = moveCardState(state, columnId, cardId, direction);
  if (nextState === state) {
    return;
  }
  state = nextState;
  const targetColumnId =
    state.editing?.cardId === cardId
      ? state.editing.columnId
      : moveDestination(columnId, direction);
  if (!targetColumnId) {
    return;
  }
  const $card = $root.find(cardSelector(cardId)).detach();
  updateCardControls($card, targetColumnId);
  const card = cardById(targetColumnId, cardId);
  if (isVisible(card)) {
    cardsFor(targetColumnId).children(".empty-state").remove().end().append($card);
  }
  persist();
  syncCounts();
  syncEmptyState(columnId);
  syncEmptyState(targetColumnId);
});

$root.on("click", "[data-action='start-edit']", (event) => {
  const { columnId, cardId } = event.currentTarget.dataset;
  finishEdit(true);
  const nextState = startEditState(state, columnId, cardId);
  if (nextState === state) {
    return;
  }

  state = nextState;
  $(event.currentTarget).replaceWith(cardContent(columnId, cardById(columnId, cardId)));
  const input = $root
    .find(cardSelector(cardId))
    .find("input[data-action='draft']")
    .trigger("focus")
    .get(0);
  input?.select();
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
  if (!editing) {
    return;
  }
  const previousColumns = state.columns;
  state = commit ? commitEditState(state) : cancelEditState(state);
  const card = cardById(editing.columnId, editing.cardId);
  const $card = $root.find(cardSelector(editing.cardId));
  if (card) {
    if (!isVisible(card)) {
      $card.remove();
      syncEmptyState(editing.columnId);
    } else {
      $card.find("input[data-action='draft']").replaceWith(cardContent(editing.columnId, card));
    }
  } else {
    $card.remove();
    syncEmptyState(editing.columnId);
  }
  if (commit && state.columns !== previousColumns) {
    persist();
  }
  syncCounts();
}

$root.on("keydown", "[data-action='draft']", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    finishEdit(true);
  } else if (event.key === "Escape") {
    event.preventDefault();
    finishEdit(false);
  }
});

$root.on("focusout", "[data-action='draft']", () => finishEdit(true));

$root.on("click", "[data-action='reset']", () => {
  clearSavedBoard();
  state = resetState();
  renderShell();
});

renderShell();
