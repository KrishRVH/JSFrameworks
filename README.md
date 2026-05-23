# JSFrameworks

This repo is a learning lab for comparing JavaScript UI approaches by building the same small app several ways.

The app is **Tiny Kanban**: a minimal Trello-like board with Todo, Doing, and Done columns. Each implementation must match the same behavior contract in [SPEC.md](./SPEC.md) while using the idioms of its own approach. The point is not to translate identical code six times; it is to see where each style puts state, rendering, identity, events, and side effects.

## Implementations

1. `01-vanilla-a-rerender/` - Vanilla JavaScript with a simple full render loop.
2. `02-vanilla-b-keyed-patch/` - Vanilla JavaScript with keyed DOM reuse for identity and focus.
3. `03-jquery-a-render-loop/` - jQuery used to shorten DOM creation while keeping a render loop.
4. `04-jquery-b-incremental/` - jQuery with direct incremental DOM patches.
5. `05-react/` - React 19 app built with Vite.
6. `06-svelte/` - Svelte 5 app using runes, built with Vite.

Shared assets and framework-neutral state helpers live in `shared/`.

## What Stays The Same

Every implementation follows the same app-visible state shape:

```js
{
  columns: {
    todo: [{ id, title }],
    doing: [{ id, title }],
    done: [{ id, title }]
  },
  filter: "",
  editing: null // or { columnId, cardId, draftTitle }
}
```

The shared behavior contract is:

- Add, delete, move, and inline-edit cards.
- Filter cards by title, case-insensitively.
- Persist only durable board data: `columns`.
- Reset clears storage and restores seed data.
- Treat card titles as plain text, never HTML.
- Empty adds do nothing.
- Empty edit commits cancel editing and preserve the original title.

## Tooling

Current pinned references:

- jQuery `4.0.0`
- React / React DOM `19.2.6`
- Svelte `5.55.9`
- Vite `8.0.14`
- Biome `2.4.15`

Use **Bun** for package management and scripts. There is a root package only for shared Biome tooling; it is not a workspace. Install dependencies inside each Vite app directory.

```sh
bun install
cd 05-react && bun install
cd ../06-svelte && bun install
```

## Running The Apps

Static implementations:

```sh
python3 -m http.server
```

Then open one of:

- `http://127.0.0.1:8000/01-vanilla-a-rerender/`
- `http://127.0.0.1:8000/02-vanilla-b-keyed-patch/`
- `http://127.0.0.1:8000/03-jquery-a-render-loop/`
- `http://127.0.0.1:8000/04-jquery-b-incremental/`

React:

```sh
cd 05-react
bun run dev
```

Svelte:

```sh
cd 06-svelte
bun run dev
```

## Quality Checks

Central Biome commands run from the repo root:

```sh
bun run check
bun run lint
bun run format
```

Build both Vite apps from the root:

```sh
bun run build
```

There is no automated test suite. Validate behavior manually against [SPEC.md](./SPEC.md), especially add, delete, move, edit commit/cancel, filter, reset, persistence, and empty-title behavior.

## Learning Focus

Use the implementations to compare:

- Where truth lives: state object, DOM, component state, or compiler-tracked state.
- What updates the UI: full render, manual patches, reconciliation, or fine-grained reactivity.
- How identity bugs are prevented: `data-card-id`, React `key`, or Svelte keyed `{#each}`.
- Where side effects belong: ad hoc handlers, `useEffect`, or `$effect`.
- What each approach costs in discipline, boilerplate, or framework concepts.

Keep visible behavior aligned across rungs. UI-specific code belongs in the numbered implementation folders; shared state transitions belong in `shared/actions.js` and seed/persistence helpers in `shared/seed.js`.
