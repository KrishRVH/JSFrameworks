# Tiny Kanban Spec

Tiny Kanban is one app implemented as seven comparable artifacts:

1. Vanilla JS, Phase A: naive re-render
2. Vanilla JS, Phase B: keyed patch
3. jQuery, Approach A: render loop
4. jQuery, Approach B: incremental DOM updates
5. React
6. Svelte 5 with runes
7. SolidJS

The goal is not to translate the same code seven times. The goal is to force each
rung to be idiomatic, so the comparison shows why people reach for each approach.

All rungs must follow the same behavioral spec and app-visible state shape. Only
the implementation style changes.

`00-compare-all/` is the Implementation Comparison Harness. It is a lightweight viewer for the
seven artifacts, not an eighth rung.

## Tooling And Version Pins

Keep these pins consistent across the rungs so the comparison is fair:

- Node: `26.3.0`
- npm: `11.16.0`
- jQuery: `4.0.0`
- React / React DOM: `19.2.8`
- Svelte: `5.56.8`
- Solid (`solid-js`): `1.9.14`
- Vite: `8.1.5`
- Biome: `2.5.5`

Vite's own minimum Node requirement is lower than this repo's runtime pin, but
this reference implementation intentionally targets the latest Node current
release. Use npm for package management, npm scripts for project commands, and
npx only for one-off tools that are not already installed as package scripts.

Svelte runes primitives used in this exercise:

- `$state`, including module-level rune state in a `.svelte.js` file
- `$derived`
- `$effect`
- `$props`
- `{@attach ...}` for element-scoped DOM work

Solid primitives used in this exercise:

- `createStore`, with path setters, filter-function paths, `produce`, and `batch`
- `createEffect` with `on(..., { defer: true })`
- `<For>` and `<Show>`
- `onMount` with a `ref`

## Repository Structure

```text
JSFrameworks/
  00-compare-all/
    package-lock.json
    package.json
    src/
  SPEC.md
  README.md
  .node-version
  .npmrc
  package-lock.json
  package.json
  shared/
    actions.js
    seed.js
    styles.css
  01-vanilla-a-rerender/
    index.html
    app.js
    NOTES.md
  02-vanilla-b-keyed-patch/
    index.html
    app.js
    NOTES.md
  03-jquery-a-render-loop/
    index.html
    app.js
    NOTES.md
  04-jquery-b-incremental/
    index.html
    app.js
    NOTES.md
  05-react/
    package-lock.json
    package.json
    src/
  06-svelte/
    package-lock.json
    package.json
    src/
  07-solid/
    package-lock.json
    package.json
    src/
  bench/
    package-lock.json
    package.json
    results/
    src/
```

`shared/styles.css` owns layout, typography, spacing, controls, and states.
Framework-specific styling glue is allowed only when needed for integration. Do
not use component libraries, CSS-in-JS, Tailwind, or scoped style systems; visual
drift contaminates the comparison.

`shared/seed.js` owns seed data, storage helpers, column constants, and title
normalization helpers. `shared/actions.js` owns framework-neutral state
transitions and read helpers. The vanilla, jQuery, and React rungs delegate board
mutations to these transitions, since immutable updates are their idiom. Svelte
and Solid keep the read helpers and `shared/seed.js` but write their own
transitions - deep `$state` proxy mutation in Svelte, store path setters and
`produce` in Solid - because fine-grained mutation is exactly what those two
frameworks showcase. The behavioral rules are identical either way.

## Shared Constraints

- Keep the app-visible state shape identical across rungs.
- Treat card titles as plain text, never HTML.
- Persist only durable board data: `columns`.
- Standalone apps persist to `tiny-kanban:v1`; harness frames may add `?kanbanInstance=...` to
  isolate comparison state.
- Reset restores `createSeedState()`.
- Empty adds do nothing.
- Empty edit commits cancel edit and preserve the original title.
- Keep UI-specific code inside the numbered implementation folders.

## App Specification

Tiny Kanban is a minimal Trello-like board with enough moving pieces to expose
real framework tradeoffs.

## Core User Stories

Cards:

- Add a card to Todo, Doing, or Done.
- Delete a card.
- Move a card left or right: Todo <-> Doing <-> Done.
- Inline edit a card title.
- Enter saves an edit.
- Escape cancels an edit.
- Blur saves an edit.

Board utilities:

- Filter cards whose title contains the trimmed filter text, case-insensitively.
  A whitespace-only filter shows everything.
- Persist durable board data to `localStorage`.
- Reset clears storage and restores seed data.
- Show per-column counts and total count.

Security and robustness:

- Treat card titles as plain text, never HTML.
- Do not use `innerHTML` for user-provided content.
- In jQuery, prefer `.text()` over `.html()` for user-provided content.
- Cards must have stable IDs. `crypto.randomUUID()` is acceptable for new cards.

## Data Model

The same state shape applies to all rungs:

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

Notes:

- This shape is a hard constraint across all rungs.
- `editing` is intentionally explicit; it forces UI state to be modeled instead
  of hidden in the DOM.
- `draftTitle` lives in state only while editing.
- Framework-local variables are allowed only for non-domain mechanics, such as
  focusing an input.

## Seed State

`createSeedState()` must return a fresh state object:

```js
export function createSeedState() {
  return {
    columns: {
      todo: [{ id: "seed-1", title: "Read the spec" }],
      doing: [{ id: "seed-2", title: "Build the first rung" }],
      done: [{ id: "seed-3", title: "Compare tradeoffs" }]
    },
    filter: "",
    editing: null
  };
}
```

Seed cards use fixed IDs for comparability. Newly added cards use stable
generated IDs.

## Actions

Implement these pure-ish operations, even if a rung does not enforce purity:

- `addCard(columnId, title)`
- `deleteCard(columnId, cardId)`
- `moveCard(columnId, cardId, direction)`, where direction is `left` or `right`
- `startEdit(columnId, cardId)`
- `updateDraft(title)`
- `commitEdit()`
- `cancelEdit()`
- `setFilter(text)`
- `reset()`

Action rules:

- `addCard(columnId, title)` trims `title`; if empty after trim, do nothing.
- `commitEdit()` trims `editing.draftTitle`; if empty after trim, cancel edit and
  leave the original title unchanged.
- Committed card titles store normalized trimmed text.
- Draft titles preserve exactly what the user typed while editing.

## Rendering Rules

- Columns render in order: Todo, Doing, Done.
- Each non-editing card renders its title and buttons for left, right, and delete.
- Each editing card renders an input in place of the title.
- Disable the left button in Todo.
- Disable the right button in Done.
- Filter affects what is displayed, not what is stored.

## Persistence Rules

- Storage key: `tiny-kanban:v1`
- Storage payload shape: `{ "columns": { todo, doing, done } }`. Loaders validate
  this shape and fall back to seed data on anything else.
- Persist only durable board data: `columns`.
- Do not persist session UI state: `filter` or `editing`.
- On app load, start from `createSeedState()`.
- If storage exists, parses, and contains valid `columns`, merge those columns
  into the fresh seed-shaped state.
- Always load with `filter: ""` and `editing: null`.
- After every successful durable board action, save `columns`.
- `setFilter`, `startEdit`, `updateDraft`, `commitEdit` with an empty draft, and
  `cancelEdit` may update UI state without changing persisted columns.

## Acceptance Checklist

An implementation is done when:

- Add, move, and delete work.
- Filter works.
- Inline edit works with Enter, Escape, and blur.
- Refresh preserves cards and column placement via `localStorage`.
- Refresh does not preserve transient filter or editing state.
- Reset restores seed.
- Empty add does nothing.
- Empty edit commit leaves the original title unchanged.
- No XSS via card titles. Entering `<img onerror=alert(1)>` shows text and does
  not execute.

## Learning Ladder

Each rung should follow the same app spec and milestone order. The learning value
comes from feeling where each approach puts state, rendering, identity, events,
and side effects.

## Rung 1: Vanilla JS

What you are learning:

- The real cost of UI: state plus DOM synchronization.
- Why event delegation exists.
- Why frameworks invent render loops and diffing.
- How bugs appear when DOM becomes an implicit data store.

Idiomatic constraints:

- Use one `state` object as the single source of truth.
- Use one `render(state)` function that updates the UI.
- Use one root listener for dynamic elements through event delegation.
- Do not use inline `onclick`.
- Do not read truth from the DOM, such as inferring which column a card is in.
- Avoid micro-diffing too early; first feel the pain.

Phase A: naive re-render:

- Structural actions update state, then call `render()`.
- `render()` clears and rebuilds the card lists from scratch.
- Draft keystrokes may update explicit state without repainting the input, so the
  demo remains usable.
- Phase A exists as `01-vanilla-a-rerender/`.
- Notes capture how render-loop simplicity trades away durable DOM identity.
- No identity patch sneaks into Phase A.

Phase B: identity plus minimal patch:

- Fix the main UX glitch: editing losing focus.
- Key every card DOM node by `data-card-id`.
- In render, preserve the existing input node when the same card remains in edit
  mode.
- Keep this as a small keyed preservation patch; do not turn vanilla JS into a
  framework.
- Phase B exists as `02-vanilla-b-keyed-patch/`.

You learned it when:

- You can explain why event delegation is needed for cards created later.
- You can explain why full re-render breaks editing UX.
- You can point to one place where you were tempted to store state in the DOM and
  explain why not to.

Common traps:

- Using `innerHTML` for templating introduces XSS risk and makes event wiring
  harder.
- Sprinkling `addEventListener` on every card leaks behavior across re-renders
  and breaks for new cards.
- Reading draft values directly from the input on save turns the DOM into state.

## Rung 2: jQuery

What you are learning:

- jQuery makes imperative DOM manipulation pleasant.
- jQuery still does not give you an application model.
- Its historical niche is ergonomic DOM APIs and event delegation.

Idiomatic constraints:

- Use jQuery for selection, creation, delegation, and DOM updates.
- Still keep explicit `state`; do not regress to DOM-as-state.
- Use delegated handlers such as `$(root).on("click", "[data-action=...]", handler)`.
- Use `.text()` for user content.
- Do not build a React-style render engine or virtual DOM inside jQuery.

jQuery is included as a pedagogical rung. The point is to learn its historical
niche and tradeoffs, not to treat it as the default greenfield recommendation.

Approach A: render loop:

- Keep the same full `render()` loop.
- Use jQuery to build nodes and attach attributes tersely.
- Let draft keystrokes update explicit state without rebuilding the active input.
- Approach A exists as `03-jquery-a-render-loop/`.
- It proves jQuery shortens DOM code without changing the state architecture.

Approach B: incremental DOM updates:

- On add, append a card node directly.
- On delete, remove that specific node.
- On move, detach and insert into the other column container.
- On edit, swap title span and input in place.
- Approach B exists as `04-jquery-b-incremental/`.
- It proves manual patches are productive but increase invariant-management
  burden.

You learned it when:

- You can articulate the exact moment DOM and state got out of sync.
- You can describe why incremental updates are both tempting and dangerous.
- You understand why `.text()` vs `.html()` matters with user input.

Common traps:

- Letting state live partly in `state` and partly in DOM structure.
- Attaching handlers to elements instead of delegating from a stable root.
- Treating "it works now" as enough when future filter, move, and edit paths can
  violate DOM invariants.

## Rung 3: React

What you are learning:

- Declarative UI: render is a pure-ish function of state.
- Component boundaries and composition.
- Identity via keys.
- Side effects are explicit and constrained.

Idiomatic constraints:

- Use function components.
- Use `useReducer` when named board actions read better than many setters.
- Keep the reducer pure: mint card identity in the event handler and pass the
  finished card in the action, so StrictMode double-invocation is a no-op.
- Use React 19 form actions for the add form; the action receives `FormData`
  and React resets the uncontrolled form afterward.
- Compute derived values from state; do not store filtered lists in state.
- Use `useEffect` for persistence only.
- Use stable keys, such as `card.id`, when mapping lists.
- Do not use direct DOM manipulation for rendering.
- Do not mutate nested state in place.

Recommended component boundaries:

- `App` owns state, dispatch, reset, and persistence.
- `Board` renders columns.
- `Column` renders cards.
- `Card` handles button clicks and edit entry.
- `EditInput` is controlled, with value coming from state.

State transitions:

- Keep `boardReducer(state, action)` close to the app.
- Let each action describe one user intent, such as `cardAdded`, `cardMoved`, or
  `editCommitted`.
- Delegate durable board mutations to the shared state helpers.

Editing:

- The editing input is controlled by `editing.draftTitle`.
- UI state is real state.

Persistence:

- `useEffect` persists only when the `columns` object identity changes.
- The initial loaded columns and reset path should not immediately write storage
  back.
- Load by merging persisted columns into a fresh `createSeedState()`.

You learned it when:

- You can explain why `key={card.id}` matters.
- You can explain why mutating nested objects often leads to stale renders.
- You can explain why this app uses `useReducer`.
- You can explain why the `localStorage` write belongs in an effect.

Common traps:

- Putting derived data in state, such as `filteredColumns`.
- Using array index as key.
- Overusing `useEffect` to react to state changes that should be modeled directly.

## Rung 4: Svelte 5 With Runes

What you are learning:

- Reactivity as a language and compiler feature.
- Fine-grained updates without a "re-render everything" mental model.
- Explicit tools for state, derived state, effects, and props.

Idiomatic constraints:

- Keep board state in a module-level `$state(...)` inside `board.svelte.js`,
  exported alongside intent-named actions.
- Let actions mutate the deep proxy directly:
  `board.columns[columnId].push(createCard(title))`, `cards.splice(index, 1)`,
  `card.title = normalized`. Deep reactivity is the Svelte 5 showcase; do not
  route mutations through immutable rebuild-the-tree helpers.
- Compute derived values with `$derived(...)`.
- Put side effects, such as persistence, in `$effect(...)`.
- Declare props with `$props()` in runes mode; pass only identity props such as
  `columnId` and `card`. Components read the board by importing the module -
  no `$bindable()` chains that turn props into setters.
- Use bindings, such as `bind:value`, for inputs; with a deep proxy the binding
  writes one property, not the whole tree.
- Use `{@attach ...}` for element-scoped DOM work such as focusing the edit
  input; it replaces the `bind:this` + `$effect` dance.
- Do not use `$effect` to compute derived values.
- Do not use legacy Svelte 4 syntax for this exercise.

State:

```js
// board.svelte.js
export const board = $state(loadState());

export const actions = {
  addCard(columnId, title) {
    board.columns[columnId].push(createCard(normalizeTitle(title)));
  }
  // delete, move, edit, reset...
};
```

Derived values:

- Total count: `$derived(totalCount(board.columns))`.
- Filtered card lists: `$derived(visibleCards(board, columnId))`.
- Per-column counts can stay as direct template reads from
  `board.columns[columnId].length`.

Effects:

- Persist durable columns in one `$effect`; a deep clone of `board.columns`
  doubles as the dependency read, so the effect subscribes to every durable
  change and nothing else.
- Skip the initial loaded state and reset clear where needed.

Props:

```svelte
<script>
  let { columnId, card } = $props();
</script>
```

You learned it when:

- You can explain the conceptual difference between `$derived` and `$effect`.
- You can explain why Svelte reactivity does not need dependency arrays like
  React effects do.
- You can explain why `card.title = normalized` updates one text node while the
  React rung rebuilds the component tree for the same edit.
- You can point to one place where React needed boilerplate that Svelte expresses
  more directly.

Common traps:

- Writing React patterns inside Svelte: reassigning a root `$state` with
  immutable copies, or threading `$bindable()` setters through the tree, throws
  away the deep-proxy granularity the compiler gives you.
- Putting side effects in `$derived`.
- Using legacy `export let` instead of `$props()` for runes mode.

## Rung 5: SolidJS

What you are learning:

- Fine-grained reactivity as a runtime library: components run once, then
  updates flow through signals straight to the DOM nodes they touch.
- JSX without a virtual DOM and without a re-render mental model.
- Nested state as a store; transitions expressed as path setters or localized
  mutations instead of immutable rebuilds.
- Control flow as components: `<For>`, `<Show>`, and fallbacks.

Idiomatic constraints:

- Keep board state in one `createStore`, wrapped in a `createBoard()` primitive
  that exposes intent-named actions.
- Use path setters for single-location updates and `produce` for transitions
  that touch several locations at once; group multi-set actions with `batch`.
- Derive values as plain expressions in JSX or small thunks. Reach for
  `createMemo` only when a derivation is expensive or fans out; this app needs
  none, and that absence is idiomatic.
- Persist in a single deferred effect; the dependency read subscribes it to
  every durable board change and nothing else.
- Access props lazily as `props.x`; never destructure them.
- Use `<For>` for reactive lists (rows follow object identity, no keys) and
  `<Show>` for the edit swap. Static lists such as the column order are plain
  `.map` - components run once, so nothing needs to reconcile them.
- Use `onMount` with a `ref` for focus.
- Do not import React habits: no dependency arrays, no memoization reflexes, no
  expecting the component body to re-run.

State and transitions:

```js
const [board, setBoard] = createStore(loadState());

setBoard("columns", columnId, (cards) => [...cards, createCard(title)]);
setBoard("columns", columnId, (card) => card.id === cardId, "title", title);
setBoard(produce((draft) => { /* multi-location transition */ }));
```

Effects:

```js
createEffect(
  on(() => cloneColumns(board.columns), saveColumns, { defer: true })
);
```

You learned it when:

- You can explain why a component body runs exactly once, and where updates
  actually happen after that.
- You can explain why `<For>` needs no keys: rows follow object identity, and
  mutating a card title in place updates one text node without touching its row.
- You can explain why committing an unchanged title writes nothing to storage:
  store setters bail out on equal values, so the persistence effect never fires.
- You can explain why destructuring props at setup time silently kills
  reactivity.

Common traps:

- Destructuring props or reading store values into plain variables during setup,
  then wondering why the UI never updates.
- Using `createEffect` to compute derived state.
- Tracking too much: deep-reading a store inside an effect without `on` scoping
  what the effect subscribes to.
- Treating JSX like React: expecting re-renders, adding keys, wrapping
  everything in memos.

## Cross-Rung Comparison Guide

Where truth lives:

- Vanilla: you must enforce that state is truth.
- jQuery: the temptation is DOM becomes truth.
- React: state is truth and rendering is derived.
- Svelte: state is truth in a deep proxy and the compiler wires updates directly.
- Solid: state is truth in a store, and signals wire it straight to the DOM at
  runtime.

What updates the UI:

- Vanilla: you choose full re-render or manual patches.
- jQuery: you choose, and manual patch paths multiply.
- React: component render plus reconciliation.
- Svelte: reactive dependencies.
- Solid: fine-grained signal subscriptions created on first render.

How identity bugs are prevented:

- Vanilla and jQuery: `data-card-id` conventions plus careful patching.
- React: `key`.
- Svelte: keyed `{#each ... (id)}`.
- Solid: `<For>` tracks rows by object identity; in-place store mutations keep
  that identity stable.

Side effect discipline:

- Vanilla and jQuery: anything can happen anywhere unless you impose discipline.
- React: effects are explicit and constrained with `useEffect`.
- Svelte: effects are explicit with `$effect`.
- Solid: effects are explicit with `createEffect`, and `on` scopes what they
  subscribe to.

What each approach costs:

- Vanilla and jQuery: engineering discipline and ongoing maintenance.
- React: conceptual overhead around hooks, purity, and component patterns.
- Svelte: a compile step and framework-specific reactivity model.
- Solid: a JSX compile step and a components-run-once mental model.

## Milestone Build Order

Do these in the same order for every rung so comparisons are meaningful:

1. Boot and persistence: load, save, reset.
2. Basic render: columns and cards.
3. Add card.
4. Delete card.
5. Move card.
6. Filter.
7. Inline edit.
8. Polish: counts, empty states, and keyboard UX.

At the end of each milestone, write two or three bullets in that rung's notes:

- What was hard?
- What became easier?
- What new kind of bug appeared?

## References

- [jQuery download](https://jquery.com/download/)
- [React releases](https://github.com/facebook/react/releases)
- [Svelte package](https://www.npmjs.com/package/svelte)
- [Vite package](https://www.npmjs.com/package/vite)
- [Vite getting started](https://vite.dev/guide/)
- [Svelte `$state`](https://svelte.dev/docs/svelte/$state)
- [Svelte `$derived`](https://svelte.dev/docs/svelte/$derived)
- [Svelte `$effect`](https://svelte.dev/docs/svelte/$effect)
- [Svelte `$props`](https://svelte.dev/docs/svelte/$props)
- [Svelte attachments `{@attach}`](https://svelte.dev/docs/svelte/@attach)
- [Svelte legacy `export let`](https://svelte.dev/docs/svelte/legacy-export-let)
- [solid-js package](https://www.npmjs.com/package/solid-js)
- [Solid `createStore`](https://docs.solidjs.com/reference/store-utilities/create-store)
- [Solid `produce`](https://docs.solidjs.com/reference/store-utilities/produce)
- [Solid `on`](https://docs.solidjs.com/reference/reactive-utilities/on)
- [Solid `<For>`](https://docs.solidjs.com/reference/components/for)
