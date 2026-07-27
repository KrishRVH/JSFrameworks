import { isEditingCard } from "../../shared/actions.js";
import {
  clearSavedBoard,
  cloneColumns,
  createCard,
  createSeedState,
  loadState,
  moveDestination,
  normalizeTitle,
  saveColumns
} from "../../shared/seed.js";

export const board = $state(loadState());

let hydrated = false;
let skipNextSave = false;

// cloneColumns doubles as the dependency read: it visits every card, so the calling
// $effect subscribes to every durable board change and nothing else.
export function persistColumns() {
  const columns = cloneColumns(board.columns);
  if (!hydrated) {
    hydrated = true;
    return;
  }
  if (skipNextSave) {
    skipNextSave = false;
    return;
  }
  saveColumns(columns);
}

export const actions = {
  addCard(columnId, title) {
    const normalized = normalizeTitle(title);
    if (!normalized) {
      return;
    }
    board.columns[columnId].push(createCard(normalized));
  },
  deleteCard(columnId, cardId) {
    const cards = board.columns[columnId];
    const index = cards.findIndex((card) => card.id === cardId);
    if (index === -1) {
      return;
    }
    cards.splice(index, 1);
    if (isEditingCard(board, columnId, cardId)) {
      board.editing = null;
    }
  },
  moveCard(columnId, cardId, direction) {
    const destination = moveDestination(columnId, direction);
    if (!destination) {
      return;
    }
    const source = board.columns[columnId];
    const index = source.findIndex((item) => item.id === cardId);
    if (index === -1) {
      return;
    }
    const [card] = source.splice(index, 1);
    board.columns[destination].push(card);
    if (isEditingCard(board, columnId, cardId)) {
      board.editing.columnId = destination;
    }
  },
  startEdit(columnId, cardId) {
    const card = board.columns[columnId].find((item) => item.id === cardId);
    if (card) {
      board.editing = { columnId, cardId, draftTitle: card.title };
    }
  },
  commitEdit() {
    const { editing } = board;
    if (!editing) {
      return;
    }
    const title = normalizeTitle(editing.draftTitle);
    if (title) {
      const card = board.columns[editing.columnId].find((item) => item.id === editing.cardId);
      if (card && card.title !== title) {
        card.title = title;
      }
    }
    board.editing = null;
  },
  cancelEdit() {
    board.editing = null;
  },
  reset() {
    clearSavedBoard();
    skipNextSave = true;
    const seed = createSeedState();
    board.columns = seed.columns;
    board.filter = seed.filter;
    board.editing = seed.editing;
  }
};
