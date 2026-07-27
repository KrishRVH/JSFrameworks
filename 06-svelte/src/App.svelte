<script>
import { totalCount } from "../../shared/actions.js";
import { COLUMN_ORDER } from "../../shared/seed.js";
import { actions, board, persistColumns } from "./board.svelte.js";
import Column from "./Column.svelte";

let total = $derived(totalCount(board.columns));

$effect(persistColumns);
</script>

<main class="app-shell">
  <header class="app-header">
    <div>
      <h1 class="app-title">Tiny Kanban</h1>
      <p class="app-subtitle">Svelte 5: runes reactivity</p>
    </div>
  </header>

  <section class="toolbar">
    <input aria-label="Filter cards" placeholder="Filter cards" bind:value={board.filter} />
    <span class="count-pill">{total} total</span>
    <button type="button" onclick={actions.reset}>Reset</button>
  </section>

  <section class="board">
    {#each COLUMN_ORDER as columnId (columnId)}
      <Column {columnId} />
    {/each}
  </section>
</main>
