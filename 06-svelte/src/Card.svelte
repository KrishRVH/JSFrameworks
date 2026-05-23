<script>
import { tick } from "svelte";
import {
  cancelEditState,
  commitEditState,
  deleteCardState,
  moveCardState,
  startEditState,
  updateDraftState
} from "../../shared/actions.js";
import { COLUMN_ORDER } from "../../shared/seed.js";

let { columnId, card, board = $bindable() } = $props();
let inputElement = $state(null);
let columnIndex = $derived(COLUMN_ORDER.indexOf(columnId));
let isEditing = $derived(board.editing?.columnId === columnId && board.editing?.cardId === card.id);

$effect(() => {
  if (isEditing && inputElement) {
    tick().then(() => {
      inputElement?.focus();
      inputElement?.select();
    });
  }
});

function commitEdit() {
  board = commitEditState(board);
}

function cancelEdit() {
  board = cancelEditState(board);
}

function updateDraft(event) {
  board = updateDraftState(board, event.currentTarget.value);
}

function keyEdit(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    commitEdit();
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancelEdit();
  }
}
</script>

<article class="card">
  {#if isEditing}
    <input
      bind:this={inputElement}
      aria-label="Edit card title"
      value={board.editing.draftTitle}
      onblur={commitEdit}
      oninput={updateDraft}
      onkeydown={keyEdit}
    />
  {:else}
    <button
      type="button"
      class="card-title card-title-button"
      onclick={() => (board = startEditState(board, columnId, card.id))}
    >
      {card.title}
    </button>
  {/if}

  <div class="card-actions">
    <button
      type="button"
      disabled={columnIndex === 0}
      onclick={() => (board = moveCardState(board, columnId, card.id, "left"))}
    >
      Left
    </button>
    <button
      type="button"
      disabled={columnIndex === COLUMN_ORDER.length - 1}
      onclick={() => (board = moveCardState(board, columnId, card.id, "right"))}
    >
      Right
    </button>
    <button type="button" onclick={() => (board = deleteCardState(board, columnId, card.id))}>
      Delete
    </button>
  </div>
</article>
