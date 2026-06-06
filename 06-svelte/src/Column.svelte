<script>
import { addCardState, visibleCards } from "../../shared/actions.js";
import { COLUMN_TITLES } from "../../shared/seed.js";
import Card from "./Card.svelte";

let { columnId, board = $bindable() } = $props();
let cards = $derived(visibleCards(board, columnId));

function addCard(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const title = new FormData(form).get("title") ?? "";
  board = addCardState(board, columnId, String(title));
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
        <Card {columnId} {card} bind:board />
      {/each}
    {:else}
      <div class="empty-state">No matching cards</div>
    {/if}
  </div>
</section>
