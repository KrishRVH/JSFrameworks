import { useEffect, useRef, useState } from "react";
import {
  COLUMN_ORDER,
  COLUMN_TITLES,
  clearSavedBoard,
  loadState,
  saveColumns
} from "../../shared/seed.js";
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
} from "../../shared/actions.js";

export function App() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    saveColumns(state.columns);
  }, [state.columns]);

  function reset() {
    clearSavedBoard();
    setState(resetState());
  }

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
          onChange={(event) => setState((current) => setFilterState(current, event.target.value))}
        />
        <span className="count-pill">{totalCount(state.columns)} total</span>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </section>

      <Board state={state} setState={setState} />
    </main>
  );
}

function Board({ state, setState }) {
  return (
    <section className="board">
      {COLUMN_ORDER.map((columnId) => (
        <Column key={columnId} columnId={columnId} state={state} setState={setState} />
      ))}
    </section>
  );
}

function Column({ columnId, state, setState }) {
  const cards = visibleCards(state, columnId);

  function addCard(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = new FormData(form).get("title") ?? "";
    setState((current) => addCardState(current, columnId, String(title)));
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
            <Card key={card.id} columnId={columnId} card={card} state={state} setState={setState} />
          ))
        ) : (
          <div className="empty-state">No matching cards</div>
        )}
      </div>
    </section>
  );
}

function Card({ columnId, card, state, setState }) {
  const isEditing =
    state.editing?.columnId === columnId && state.editing?.cardId === card.id;
  const columnIndex = COLUMN_ORDER.indexOf(columnId);

  return (
    <article className="card">
      {isEditing ? (
        <EditInput
          value={state.editing.draftTitle}
          onChange={(title) => setState((current) => updateDraftState(current, title))}
          onCommit={() => setState(commitEditState)}
          onCancel={() => setState(cancelEditState)}
        />
      ) : (
        <button
          type="button"
          className="card-title card-title-button"
          onClick={() => setState((current) => startEditState(current, columnId, card.id))}
        >
          {card.title}
        </button>
      )}
      <div className="card-actions">
        <button
          type="button"
          disabled={columnIndex === 0}
          onClick={() => setState((current) => moveCardState(current, columnId, card.id, "left"))}
        >
          Left
        </button>
        <button
          type="button"
          disabled={columnIndex === COLUMN_ORDER.length - 1}
          onClick={() => setState((current) => moveCardState(current, columnId, card.id, "right"))}
        >
          Right
        </button>
        <button
          type="button"
          onClick={() => setState((current) => deleteCardState(current, columnId, card.id))}
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

  return (
    <input
      ref={ref}
      aria-label="Edit card title"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    />
  );
}
