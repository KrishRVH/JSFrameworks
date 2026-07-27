<script>
import { isEditingCard } from "../../shared/actions.js";
import { COLUMN_ORDER } from "../../shared/seed.js";
import { actions, board } from "./board.svelte.js";

let { columnId, card } = $props();
let columnIndex = $derived(COLUMN_ORDER.indexOf(columnId));
let isEditing = $derived(isEditingCard(board, columnId, card.id));

function autofocus(node) {
  node.focus();
  node.select();
}

function handleEditKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    actions.commitEdit();
  } else if (event.key === "Escape") {
    event.preventDefault();
    actions.cancelEdit();
  }
}
</script>

<article class="card">
  {#if isEditing}
    <input
      {@attach autofocus}
      bind:value={board.editing.draftTitle}
      aria-label="Edit card title"
      onblur={actions.commitEdit}
      onkeydown={handleEditKeydown}
    />
  {:else}
    <button
      type="button"
      class="card-title card-title-button"
      onclick={() => actions.startEdit(columnId, card.id)}
    >
      {card.title}
    </button>
  {/if}

  <div class="card-actions">
    <button
      type="button"
      disabled={columnIndex === 0}
      onclick={() => actions.moveCard(columnId, card.id, "left")}
    >
      Left
    </button>
    <button
      type="button"
      disabled={columnIndex === COLUMN_ORDER.length - 1}
      onclick={() => actions.moveCard(columnId, card.id, "right")}
    >
      Right
    </button>
    <button type="button" onclick={() => actions.deleteCard(columnId, card.id)}>
      Delete
    </button>
  </div>
</article>
