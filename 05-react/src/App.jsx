import { useEffect, useReducer, useRef } from "react";

import {
  addCardState,
  cancelEditState,
  commitEditState,
  deleteCardState,
  isEditingCard,
  moveCardState,
  resetState,
  setFilterState,
  startEditState,
  totalCount,
  updateDraftState,
  visibleCards
} from "../../shared/actions.js";
import {
  COLUMN_ORDER,
  COLUMN_TITLES,
  clearSavedBoard,
  loadState,
  saveColumns
} from "../../shared/seed.js";

function boardReducer(state, action) {
  switch (action.type) {
    case "cardAdded":
      return addCardState(state, action.columnId, action.title);
    case "cardDeleted":
      return deleteCardState(state, action.columnId, action.cardId);
    case "cardMoved":
      return moveCardState(state, action.columnId, action.cardId, action.direction);
    case "editStarted":
      return startEditState(state, action.columnId, action.cardId);
    case "draftChanged":
      return updateDraftState(state, action.title);
    case "editCommitted":
      return commitEditState(state);
    case "editCanceled":
      return cancelEditState(state);
    case "filterChanged":
      return setFilterState(state, action.filter);
    case "boardReset":
      return resetState();
    default:
      throw new Error(`Unknown board action: ${action.type}`);
  }
}

function useBoardState() {
  const [state, dispatch] = useReducer(boardReducer, undefined, loadState);
  const savedColumns = useRef(state.columns);
  const skipNextSave = useRef(false);

  useEffect(() => {
    if (state.columns === savedColumns.current) {
      return;
    }
    savedColumns.current = state.columns;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveColumns(state.columns);
  }, [state.columns]);

  function resetBoard() {
    clearSavedBoard();
    skipNextSave.current = true;
    dispatch({ type: "boardReset" });
  }

  return { state, dispatch, resetBoard };
}

export function App() {
  const { state, dispatch, resetBoard } = useBoardState();

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1 className="app-title">Tiny Kanban</h1>
          <p className="app-subtitle">React: idiomatic declarative UI</p>
        </div>
      </header>

      <section className="toolbar">
        <input
          aria-label="Filter cards"
          placeholder="Filter cards"
          value={state.filter}
          onChange={(event) => dispatch({ type: "filterChanged", filter: event.target.value })}
        />
        <span className="count-pill">{totalCount(state.columns)} total</span>
        <button type="button" onClick={resetBoard}>
          Reset
        </button>
      </section>

      <Board state={state} dispatch={dispatch} />
    </main>
  );
}

function Board({ state, dispatch }) {
  return (
    <section className="board">
      {COLUMN_ORDER.map((columnId) => (
        <Column key={columnId} columnId={columnId} state={state} dispatch={dispatch} />
      ))}
    </section>
  );
}

function Column({ columnId, state, dispatch }) {
  const cards = visibleCards(state, columnId);

  function addCard(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = new FormData(form).get("title") ?? "";
    dispatch({ type: "cardAdded", columnId, title: String(title) });
    form.reset();
  }

  return (
    <section className="column">
      <header className="column-header">
        <h2 className="column-title">{COLUMN_TITLES[columnId]}</h2>
        <span className="column-count">{state.columns[columnId].length} cards</span>
      </header>
      <form className="add-form" onSubmit={addCard}>
        <input name="title" placeholder={`Add to ${COLUMN_TITLES[columnId]}`} autoComplete="off" />
        <button type="submit">Add</button>
      </form>
      <div className="cards">
        {cards.length ? (
          cards.map((card) => (
            <Card key={card.id} columnId={columnId} card={card} state={state} dispatch={dispatch} />
          ))
        ) : (
          <div className="empty-state">No matching cards</div>
        )}
      </div>
    </section>
  );
}

function Card({ columnId, card, state, dispatch }) {
  const isEditing = isEditingCard(state, columnId, card.id);
  const columnIndex = COLUMN_ORDER.indexOf(columnId);

  return (
    <article className="card">
      {isEditing ? (
        <EditInput
          value={state.editing.draftTitle}
          onChange={(title) => dispatch({ type: "draftChanged", title })}
          onCommit={() => dispatch({ type: "editCommitted" })}
          onCancel={() => dispatch({ type: "editCanceled" })}
        />
      ) : (
        <button
          type="button"
          className="card-title card-title-button"
          onClick={() => dispatch({ type: "editStarted", columnId, cardId: card.id })}
        >
          {card.title}
        </button>
      )}
      <div className="card-actions">
        <button
          type="button"
          disabled={columnIndex === 0}
          onClick={() =>
            dispatch({ type: "cardMoved", columnId, cardId: card.id, direction: "left" })
          }
        >
          Left
        </button>
        <button
          type="button"
          disabled={columnIndex === COLUMN_ORDER.length - 1}
          onClick={() =>
            dispatch({ type: "cardMoved", columnId, cardId: card.id, direction: "right" })
          }
        >
          Right
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "cardDeleted", columnId, cardId: card.id })}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function EditInput({ value, onChange, onCommit, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <input
      ref={ref}
      aria-label="Edit card title"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={handleKeyDown}
    />
  );
}
