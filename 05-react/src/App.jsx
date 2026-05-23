import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  COLUMN_ORDER,
  COLUMN_TITLES,
  clearSavedBoard,
  loadState,
  saveColumns
} from "../../shared/seed.js";

function useBoardState() {
  const [state, setState] = useState(loadState);
  const isMounted = useRef(false);
  const skipNextSave = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveColumns(state.columns);
  }, [state.columns]);

  const actions = useMemo(
    () => ({
      addCard(columnId, title) {
        setState((current) => addCardState(current, columnId, title));
      },
      deleteCard(columnId, cardId) {
        setState((current) => deleteCardState(current, columnId, cardId));
      },
      moveCard(columnId, cardId, direction) {
        setState((current) => moveCardState(current, columnId, cardId, direction));
      },
      startEdit(columnId, cardId) {
        setState((current) => startEditState(current, columnId, cardId));
      },
      updateDraft(title) {
        setState((current) => updateDraftState(current, title));
      },
      commitEdit() {
        setState(commitEditState);
      },
      cancelEdit() {
        setState(cancelEditState);
      },
      setFilter(filter) {
        setState((current) => setFilterState(current, filter));
      },
      reset() {
        clearSavedBoard();
        skipNextSave.current = true;
        setState(resetState());
      }
    }),
    []
  );

  return { state, actions };
}

export function App() {
  const { state, actions } = useBoardState();

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
          onChange={(event) => actions.setFilter(event.target.value)}
        />
        <span className="count-pill">{totalCount(state.columns)} total</span>
        <button type="button" onClick={actions.reset}>
          Reset
        </button>
      </section>

      <Board state={state} actions={actions} />
    </main>
  );
}

function Board({ state, actions }) {
  return (
    <section className="board">
      {COLUMN_ORDER.map((columnId) => (
        <Column key={columnId} columnId={columnId} state={state} actions={actions} />
      ))}
    </section>
  );
}

function Column({ columnId, state, actions }) {
  const cards = visibleCards(state, columnId);

  function addCard(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = new FormData(form).get("title") ?? "";
    actions.addCard(columnId, String(title));
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
            <Card key={card.id} columnId={columnId} card={card} state={state} actions={actions} />
          ))
        ) : (
          <div className="empty-state">No matching cards</div>
        )}
      </div>
    </section>
  );
}

function Card({ columnId, card, state, actions }) {
  const isEditing = state.editing?.columnId === columnId && state.editing?.cardId === card.id;
  const columnIndex = COLUMN_ORDER.indexOf(columnId);

  return (
    <article className="card">
      {isEditing ? (
        <EditInput
          value={state.editing.draftTitle}
          onChange={actions.updateDraft}
          onCommit={actions.commitEdit}
          onCancel={actions.cancelEdit}
        />
      ) : (
        <button
          type="button"
          className="card-title card-title-button"
          onClick={() => actions.startEdit(columnId, card.id)}
        >
          {card.title}
        </button>
      )}
      <div className="card-actions">
        <button
          type="button"
          disabled={columnIndex === 0}
          onClick={() => actions.moveCard(columnId, card.id, "left")}
        >
          Left
        </button>
        <button
          type="button"
          disabled={columnIndex === COLUMN_ORDER.length - 1}
          onClick={() => actions.moveCard(columnId, card.id, "right")}
        >
          Right
        </button>
        <button type="button" onClick={() => actions.deleteCard(columnId, card.id)}>
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
