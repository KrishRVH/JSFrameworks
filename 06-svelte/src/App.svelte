<script>
import { resetState, totalCount } from "../../shared/actions.js";
import { COLUMN_ORDER, clearSavedBoard, loadState, saveColumns } from "../../shared/seed.js";
import Column from "./Column.svelte";

let state = $state(loadState());
let total = $derived(totalCount(state.columns));
let isMounted = false;
let skipNextSave = false;

$effect(() => {
  const columns = state.columns;
  if (!isMounted) {
    isMounted = true;
    return;
  }
  if (skipNextSave) {
    skipNextSave = false;
    return;
  }
  saveColumns(columns);
});

function reset() {
  clearSavedBoard();
  skipNextSave = true;
  state = resetState();
}
</script>

<main class="app-shell">
  <header class="app-header">
    <div>
      <h1 class="app-title">Tiny Kanban</h1>
      <p class="app-subtitle">Svelte 5: runes reactivity</p>
    </div>
  </header>

  <section class="toolbar">
    <input aria-label="Filter cards" placeholder="Filter cards" bind:value={state.filter} />
    <span class="count-pill">{total} total</span>
    <button type="button" onclick={reset}>Reset</button>
  </section>

  <section class="board">
    {#each COLUMN_ORDER as columnId (columnId)}
      <Column {columnId} bind:board={state} />
    {/each}
  </section>
</main>
