import { Show, onMount } from "solid-js";

import { isEditingCard } from "../../shared/actions.js";
import { COLUMN_ORDER } from "../../shared/seed.js";

export function Card(props) {
  const columnIndex = () => COLUMN_ORDER.indexOf(props.columnId);
  const isEditing = () => isEditingCard(props.board, props.columnId, props.card.id);

  return (
    <article class="card">
      <Show
        when={isEditing()}
        fallback={
          <button
            type="button"
            class="card-title card-title-button"
            onClick={() => props.actions.startEdit(props.columnId, props.card.id)}
          >
            {props.card.title}
          </button>
        }
      >
        <EditInput
          value={props.board.editing.draftTitle}
          onInput={props.actions.updateDraft}
          onCommit={props.actions.commitEdit}
          onCancel={props.actions.cancelEdit}
        />
      </Show>

      <div class="card-actions">
        <button
          type="button"
          disabled={columnIndex() === 0}
          onClick={() => props.actions.moveCard(props.columnId, props.card.id, "left")}
        >
          Left
        </button>
        <button
          type="button"
          disabled={columnIndex() === COLUMN_ORDER.length - 1}
          onClick={() => props.actions.moveCard(props.columnId, props.card.id, "right")}
        >
          Right
        </button>
        <button
          type="button"
          onClick={() => props.actions.deleteCard(props.columnId, props.card.id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function EditInput(props) {
  let element;

  onMount(() => {
    element.focus();
    element.select();
  });

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      props.onCommit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      props.onCancel();
    }
  }

  return (
    <input
      ref={element}
      aria-label="Edit card title"
      value={props.value}
      onInput={(event) => props.onInput(event.currentTarget.value)}
      onBlur={() => props.onCommit()}
      onKeyDown={handleKeyDown}
    />
  );
}
