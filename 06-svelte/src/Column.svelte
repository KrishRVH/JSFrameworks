<script>
import { visibleCards } from "../../shared/actions.js";
import { COLUMN_TITLES } from "../../shared/seed.js";
import { actions, board } from "./board.svelte.js";
import Card from "./Card.svelte";

let { columnId } = $props();
let cards = $derived(visibleCards(board, columnId));

function addCard(event) {
  event.preventDefault();
  const form = event.currentTarget;
  actions.addCard(columnId, String(new FormData(form).get("title") ?? ""));
  form.reset();
}
</script>

<section class="column">
  <header class="column-header">
    <h2 class="column-title">{COLUMN_TITLES[columnId]}</h2>
    <span class="column-count">{board.columns[columnId].length} cards</span>
  </header>

  <form class="add-form" onsubmit={addCard}>
    <input name="title" placeholder={`Add to ${COLUMN_TITLES[columnId]}`} autocomplete="off" />
    <button type="submit">Add</button>
  </form>

  <div class="cards">
    {#if cards.length}
      {#each cards as card (card.id)}
        <Card {columnId} {card} />
      {/each}
    {:else}
      <div class="empty-state">No matching cards</div>
    {/if}
  </div>
</section>
