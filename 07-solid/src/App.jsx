import { totalCount } from "../../shared/actions.js";
import { COLUMN_ORDER } from "../../shared/seed.js";
import { createBoard } from "./board.js";
import { Column } from "./Column.jsx";

export function App() {
  const { board, actions } = createBoard();

  return (
    <main class="app-shell">
      <header class="app-header">
        <div>
          <h1 class="app-title">Tiny Kanban</h1>
          <p class="app-subtitle">Solid: fine-grained reactivity</p>
        </div>
      </header>

      <section class="toolbar">
        <input
          aria-label="Filter cards"
          placeholder="Filter cards"
          value={board.filter}
          onInput={(event) => actions.setFilter(event.currentTarget.value)}
        />
        <span class="count-pill">{totalCount(board.columns)} total</span>
        <button type="button" onClick={actions.reset}>
          Reset
        </button>
      </section>

      <section class="board">
        {COLUMN_ORDER.map((columnId) => (
          <Column columnId={columnId} board={board} actions={actions} />
        ))}
      </section>
    </main>
  );
}
