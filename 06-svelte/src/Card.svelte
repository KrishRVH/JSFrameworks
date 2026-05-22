<script>
  import { tick } from "svelte";
  import { COLUMN_ORDER } from "../../shared/seed.js";

  let { columnId, card, appState, actions } = $props();
  let inputElement = $state(null);
  let columnIndex = $derived(COLUMN_ORDER.indexOf(columnId));
  let isEditing = $derived(
    appState.editing?.columnId === columnId && appState.editing?.cardId === card.id
  );

  $effect(() => {
    if (isEditing && inputElement) {
      tick().then(() => {
        inputElement?.focus();
        inputElement?.select();
      });
    }
  });

  function keyEdit(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      actions.commitEdit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      actions.cancelEdit();
    }
  }
</script>

<article class="card">
  {#if isEditing}
    <input
      bind:this={inputElement}
      aria-label="Edit card title"
      value={appState.editing.draftTitle}
      oninput={(event) => actions.updateDraft(event.currentTarget.value)}
      onblur={() => actions.commitEdit()}
      onkeydown={keyEdit}
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
