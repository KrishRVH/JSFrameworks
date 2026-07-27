import { For } from "solid-js";

import { visibleCards } from "../../shared/actions.js";
import { COLUMN_TITLES } from "../../shared/seed.js";
import { Card } from "./Card.jsx";

export function Column(props) {
  function addCard(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = new FormData(form).get("title") ?? "";
    props.actions.addCard(props.columnId, String(title));
    form.reset();
  }

  return (
    <section class="column">
      <header class="column-header">
        <h2 class="column-title">{COLUMN_TITLES[props.columnId]}</h2>
        <span class="column-count">{props.board.columns[props.columnId].length} cards</span>
      </header>

      <form class="add-form" onSubmit={addCard}>
        <input
          name="title"
          placeholder={`Add to ${COLUMN_TITLES[props.columnId]}`}
          autocomplete="off"
        />
        <button type="submit">Add</button>
      </form>

      <div class="cards">
        <For
          each={visibleCards(props.board, props.columnId)}
          fallback={<div class="empty-state">No matching cards</div>}
        >
          {(card) => (
            <Card
              columnId={props.columnId}
              card={card}
              board={props.board}
              actions={props.actions}
            />
          )}
        </For>
      </div>
    </section>
  );
}
