import { batch, createEffect, on } from "solid-js";
import { createStore, produce } from "solid-js/store";

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

export function createBoard() {
  const [board, setBoard] = createStore(loadState());
  let skipNextSave = false;

  // cloneColumns doubles as the dependency read: it visits every card, so this
  // one deferred effect subscribes to every durable board change and nothing else.
  createEffect(
    on(
      () => cloneColumns(board.columns),
      (columns) => {
        if (skipNextSave) {
          skipNextSave = false;
          return;
        }
        saveColumns(columns);
      },
      { defer: true }
    )
  );

  const actions = {
    addCard(columnId, title) {
      const normalized = normalizeTitle(title);
      if (!normalized) {
        return;
      }
      setBoard("columns", columnId, (cards) => [...cards, createCard(normalized)]);
    },
    deleteCard(columnId, cardId) {
      setBoard(
        produce((draft) => {
          const cards = draft.columns[columnId];
          const index = cards.findIndex((card) => card.id === cardId);
          if (index === -1) {
            return;
          }
          cards.splice(index, 1);
          if (isEditingCard(draft, columnId, cardId)) {
            draft.editing = null;
          }
        })
      );
    },
    moveCard(columnId, cardId, direction) {
      const destination = moveDestination(columnId, direction);
      if (!destination) {
        return;
      }
      setBoard(
        produce((draft) => {
          const source = draft.columns[columnId];
          const index = source.findIndex((item) => item.id === cardId);
          if (index === -1) {
            return;
          }
          const [card] = source.splice(index, 1);
          draft.columns[destination].push(card);
          if (isEditingCard(draft, columnId, cardId)) {
            draft.editing.columnId = destination;
          }
        })
      );
    },
    startEdit(columnId, cardId) {
      const card = board.columns[columnId].find((item) => item.id === cardId);
      if (card) {
        setBoard("editing", { columnId, cardId, draftTitle: card.title });
      }
    },
    updateDraft(title) {
      if (board.editing) {
        setBoard("editing", "draftTitle", title);
      }
    },
    commitEdit() {
      const { editing } = board;
      if (!editing) {
        return;
      }
      const title = normalizeTitle(editing.draftTitle);
      batch(() => {
        if (title) {
          setBoard(
            "columns",
            editing.columnId,
            (card) => card.id === editing.cardId,
            "title",
            title
          );
        }
        setBoard("editing", null);
      });
    },
    cancelEdit() {
      setBoard("editing", null);
    },
    setFilter(filter) {
      setBoard("filter", filter);
    },
    reset() {
      clearSavedBoard();
      skipNextSave = true;
      setBoard(createSeedState());
    }
  };

  return { board, actions };
}
