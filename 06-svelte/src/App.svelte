<script>
  import {
    COLUMN_ORDER,
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
    updateDraftState
  } from "../../shared/actions.js";
  import Column from "./Column.svelte";

  let state = $state(loadState());
  let total = $derived(totalCount(state.columns));

  $effect(() => {
    saveColumns(state.columns);
  });

  function reset() {
    clearSavedBoard();
    state = resetState();
  }

  const actions = {
    addCard(columnId, title) {
      state = addCardState(state, columnId, title);
    },
    deleteCard(columnId, cardId) {
      state = deleteCardState(state, columnId, cardId);
    },
    moveCard(columnId, cardId, direction) {
      state = moveCardState(state, columnId, cardId, direction);
    },
    startEdit(columnId, cardId) {
      state = startEditState(state, columnId, cardId);
    },
    updateDraft(title) {
      state = updateDraftState(state, title);
    },
    commitEdit() {
      state = commitEditState(state);
    },
    cancelEdit() {
      state = cancelEditState(state);
    },
    setFilter(text) {
      state = setFilterState(state, text);
    }
  };
</script>

<main class="app-shell">
  <header class="app-header">
    <div>
      <h1 class="app-title">Tiny Kanban</h1>
      <p class="app-subtitle">Svelte 5: runes reactivity</p>
    </div>
  </header>

  <section class="toolbar">
    <input
      aria-label="Filter cards"
      placeholder="Filter cards"
      value={state.filter}
      oninput={(event) => actions.setFilter(event.currentTarget.value)}
    />
    <span class="count-pill">{total} total</span>
    <button type="button" onclick={reset}>Reset</button>
  </section>

  <section class="board">
    {#each COLUMN_ORDER as columnId (columnId)}
      <Column {columnId} appState={state} {actions} />
    {/each}
  </section>
</main>
