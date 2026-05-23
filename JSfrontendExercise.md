Below is a **complete spec + learning plan** for a single app implemented as 6 comparable artifacts:

1. **Vanilla JS, Phase A: naive re-render**
2. **Vanilla JS, Phase B: keyed patch**
3. **jQuery, Approach A: render loop**
4. **jQuery, Approach B: incremental DOM updates**
5. **React**
6. **Svelte 5 (Runes)**

The goal is not “translate the same code 6 times.” The goal is to **force each rung to be idiomatic**, so you genuinely internalize *why* people reach for each approach.

---

## Tooling and version pins

Keep these pins consistent across the rungs so the comparison is fair. These are **latest-as-of-writing references**, not a requirement to keep chasing latest releases after the exercise starts.

* **jQuery:** 4.0.0 ([jQuery][1])
* **React / React DOM:** 19.2.6 ([GitHub][2])
* **Svelte:** 5.55.9 ([npm][3])
* **Vite:** 8.0.14 ([npm][4])
* **Node requirement for Vite:** Node 20.19+ or 22.12+ ([vitejs][5])

Svelte “Runes” primitives you’ll use:

* `$state` ([Svelte][6])
* `$derived` ([Svelte][7])
* `$effect` ([Svelte][8])
* `$props` ([Svelte][9])

---

## Repo structure

One repo, six artifacts, shared spec + CSS:

```
tiny-kanban/
  SPEC.md
  shared/
    styles.css
    seed.js
  01-vanilla-a-rerender/
    index.html
    app.js
  02-vanilla-b-keyed-patch/
    index.html
    app.js
  03-jquery-a-render-loop/
    index.html
    app.js
  04-jquery-b-incremental/
    index.html
    app.js
  05-react/
    (Vite React app)
  06-svelte/
    (Vite Svelte app)
```

**Rule:** all rungs must follow the same behavioral spec and state shape. Only the “how” changes.

**Styling rule:** `shared/styles.css` owns layout, typography, spacing, controls, and states. Framework-specific styling glue is allowed only when needed for integration. Do not use component libraries, CSS-in-JS, Tailwind, or scoped style systems; visual drift contaminates the comparison.

**Seed rule:** `shared/seed.js` exports `createSeedState()`, a factory that returns a fresh state object. Seed cards use fixed IDs for comparability; newly added cards use stable generated IDs such as `crypto.randomUUID()`.

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

---

# App specification: Tiny Kanban

A minimal Trello-like board with enough moving pieces to expose real framework tradeoffs.

## Core user stories

### Cards

* Add a card to **Todo / Doing / Done**
* Delete a card
* Move a card left/right (Todo ↔ Doing ↔ Done)
* Inline edit a card title (Enter saves, Esc cancels, blur saves)

### Board utilities

* Filter box: show cards whose title contains filter text (case-insensitive)
* Persist durable board data to `localStorage`
* “Reset” button to clear storage and restore seed data
* Show per-column counts and total count

### Security/robustness requirements

* Treat card titles as **plain text**, not HTML.

  * No `innerHTML` for user-provided content.
  * In jQuery, prefer `.text()` over `.html()`.
* Cards must have stable IDs (`crypto.randomUUID()` is fine).

---

## Data model

Same for all rungs:

```js
// AppState
{
  columns: {
    todo:  [{ id, title }, ...],
    doing: [{ id, title }, ...],
    done:  [{ id, title }, ...]
  },
  filter: "",
  editing: null // or { columnId, cardId, draftTitle }
}
```

Notes:

* This shape is a hard constraint across all rungs.
* `editing` is intentionally explicit; it forces you to model UI state, not hide it in the DOM.
* `draftTitle` lives in state only while editing.
* Framework-local variables are allowed only for non-domain mechanics such as focusing an input.

---

## Actions

Implement these pure-ish operations (even if your rung doesn’t enforce purity, you should):

* `addCard(columnId, title)`
* `deleteCard(columnId, cardId)`
* `moveCard(columnId, cardId, direction)` where direction ∈ `{ left, right }`
* `startEdit(columnId, cardId)`
* `updateDraft(title)`
* `commitEdit()`
* `cancelEdit()`
* `setFilter(text)`
* `reset()`

Action rules:

* `addCard(columnId, title)` trims `title`; if empty after trim, do nothing.
* `commitEdit()` trims `editing.draftTitle`; if empty after trim, cancel edit and leave original title unchanged.
* Committed card titles store normalized trimmed text.
* Draft titles preserve exactly what the user typed while editing.

---

## Rendering rules

* Columns render in order: Todo, Doing, Done
* Each card renders:

  * Title (or an `<input>` if editing)
  * Buttons: Left, Right, Delete
* Disable left/right buttons at edges
* Filter affects what is displayed, not what is stored

---

## Persistence rules

* Storage key: `tiny-kanban:v1`
* Persist only durable board data: `columns`
* Do not persist session UI state: `filter` or `editing`
* On app load:

  * Start from `createSeedState()`
  * If storage exists, parses, and contains valid `columns`, merge those columns into the fresh seed-shaped state
  * Always load with `filter: ""` and `editing: null`
* After every successful durable board action, save `columns`
* `setFilter`, `startEdit`, `updateDraft`, `commitEdit` with an empty draft, and `cancelEdit` may update UI state without changing persisted columns

---

## Acceptance checklist

You’re “done” with a rung when:

* Add / move / delete work
* Filter works
* Inline edit works with Enter/Esc/blur correctly
* Refresh page preserves cards and column placement (localStorage)
* Refresh page does not preserve transient filter/editing state
* Reset restores seed
* Empty add does nothing
* Empty edit commit leaves original title unchanged
* No XSS via card titles (e.g., entering `<img onerror=alert(1)>` shows text, doesn’t execute)

---

# The learning ladder

Below are the **idiomatic constraints** and what you must pay attention to in each rung.

## Rung 1: Vanilla JS

### What you’re learning

* The real cost of UI: **state + DOM synchronization**
* Why event delegation exists
* Why frameworks invent render loops and diffing
* How bugs appear when DOM becomes an implicit data store

### Idiomatic constraints

* ✅ One `state` object as the single source of truth
* ✅ One `render(state)` function that updates the UI
* ✅ One root listener for dynamic elements (event delegation)
* ❌ No inline `onclick=...`
* ❌ No reading “truth” from the DOM (like “which column is it in?”)
* ❌ Avoid micro-diffing too early; first feel the pain

### Implementation guidance

Do this as two separate artifacts (the pain is the lesson):

**Phase A: naive re-render**

* On every action: mutate state → call `render()`
* `render()` clears and rebuilds the card lists from scratch

You should notice:

* Inline editing loses cursor/focus if you rebuild the whole list
* You start inventing identity rules (“don’t recreate the editing input if it’s the same card”)

**Phase B: identity + minimal patch**
Fix the one big UX glitch: editing losing focus.

Approach:

* Key every card DOM node by `data-card-id`
* In render, if a card is in “editing mode”, preserve the existing input node when possible

You are basically re-discovering “why keyed rendering exists.”

Phase A acceptance:

* Naive full re-render exists as `01-vanilla-a-rerender/`.
* Notes capture exactly how inline edit loses focus/cursor.
* No identity patch sneaks into Phase A.

Phase B acceptance:

* Keyed patch exists as `02-vanilla-b-keyed-patch/`.
* Fix only the identity/focus glitch.
* Do not turn Vanilla into a framework.

### “You learned it” checks

* Can you explain why event delegation is needed for cards created later?
* Can you explain why full re-render breaks editing UX?
* Can you point to one place where you were tempted to store state in the DOM—and why you shouldn’t?

### Common traps

* Using `innerHTML` for templating → introduces XSS + becomes hard to wire events safely
* Sprinkling `addEventListener` on every card → leaks + breaks on rerender
* “Quick fix”: store the draft title in an `<input>` and read it on save (DOM-as-state) → you’ll regret this later when filtering/moving edits

---

## Rung 2: jQuery

### What you’re learning

* jQuery makes imperative DOM manipulation *pleasant*
* It still does **not** give you an application model (you still own state architecture)
* The historical niche: make DOM APIs + event delegation ergonomic

### Idiomatic constraints

* ✅ Use jQuery for selection, creation, delegation, DOM updates
* ✅ Still keep explicit `state` (don’t regress to DOM-as-state)
* ✅ Use delegated handlers: `$(root).on('click', '[data-action=...]', handler)`
* ✅ Use `.text()` for user content
* ❌ No React-style render engine re-implementation inside jQuery (don’t build your own VDOM)

jQuery is included as a pedagogical rung: you are learning its historical niche and tradeoffs, not treating it as the default greenfield recommendation.

jQuery 4.0.0 is the pinned reference for this exercise and is officially distributed for script tag usage, including ESM module builds. ([GitHub][10])

### Implementation guidance

Again do two approaches as separate artifacts—this is the comparison:

**Approach A: “Vanilla but shorter”**

* Keep the same full `render()` loop
* Use jQuery to build nodes and attach attributes tersely

**Approach B: incremental DOM updates**

* On add: append a card node directly
* On delete: remove that specific node
* On move: detach and insert into the other column container
* On edit: swap title span ↔ input in-place

This approach is where you feel the core jQuery tradeoff:

* fast to ship
* but the number of “UI invariants” you must manually preserve grows quickly

Approach A acceptance:

* Render-loop version exists as `03-jquery-a-render-loop/`.
* It proves jQuery shortens DOM code without changing the state architecture.

Approach B acceptance:

* Incremental version exists as `04-jquery-b-incremental/`.
* It proves manual patches are productive but increase invariant-management burden.

### “You learned it” checks

* Can you articulate the exact moment you created a bug because DOM and state got out of sync?
* Can you describe why incremental updates are both tempting and dangerous?
* Do you understand why `.text()` vs `.html()` matters with user input?

### Common traps

* “It works” but your state is now half in `state` and half encoded in DOM structure → filter/move/edit interactions start behaving inconsistently
* Handlers attached to elements instead of delegated → break for newly created cards

---

## Rung 3: React

### What you’re learning

* Declarative UI: **render is a pure-ish function of state**
* Component boundaries and composition
* Identity via keys
* Side effects are explicit and constrained

React / React DOM 19.2.6 is the pinned reference for this exercise. ([GitHub][2])

### Idiomatic constraints

* ✅ Use function components
* ✅ `useState` for state
* ✅ Derived values computed from state (don’t store filtered lists in state)
* ✅ `useEffect` for persistence only
* ✅ Use stable keys (`card.id`) when mapping lists
* ❌ No direct DOM manipulation for rendering (no `document.querySelector` updates)
* ❌ No mutable updates (don’t `state.columns.todo.push(...)` and reuse the same object)

### Implementation guidance

Structure it so React’s strengths are forced to appear:

**Component boundaries**

* `App` owns state + persistence
* `Board` renders columns
* `Column` renders cards
* `Card` handles button clicks + edit entry
* `EditInput` is controlled (value comes from state)

**Important learning constraint: controlled editing**

* The editing input should be controlled by `editing.draftTitle`
* You will feel why “UI state” is real state

**Persistence**

* `useEffect(() => saveColumns(state.columns), [state.columns])`
* Load by merging persisted columns into a fresh `createSeedState()`

### “You learned it” checks

* Can you explain why `key={card.id}` matters for preserving input state and preventing weird reuse bugs?
* Can you explain why mutating nested objects often leads to stale renders?
* Can you explain what is a “side effect” and why localStorage write belongs in an effect?

### Common traps

* Putting derived data in state (e.g., storing `filteredColumns`) → creates sync bugs
* Using array index as key → breaks editing identity when moving cards
* Overusing `useEffect` to “react to state changes” → usually means you’re fighting React instead of modeling state

---

## Rung 4: Svelte 5 with Runes

### What you’re learning

* Reactivity as a *language/compiler feature*, not a runtime convention
* Fine-grained updates without a “re-render everything” mental model
* Explicit tools for: state, derived state, effects

Svelte 5.55.9 is the pinned reference for this exercise. ([npm][3])
Runes you’ll use: `$state`, `$derived`, `$effect`, `$props`. ([Svelte][6])

### Idiomatic constraints

* ✅ State created with `$state(...)` ([Svelte][6])
* ✅ Derived computed with `$derived(...)` (no side effects inside) ([Svelte][7])
* ✅ Persistence as `$effect(() => { ... })` ([Svelte][8])
* ✅ Props declared with `$props()` in runes mode ([Svelte][9])
* ✅ Use bindings (`bind:value`) for inputs where appropriate
* ❌ Don’t use `$effect` to compute derived values (use `$derived`)
* ❌ Don’t write legacy Svelte 4 syntax for this exercise (you’re explicitly learning runes)

### Implementation guidance

Svelte wants you to stop thinking “rerender.” You model state and let the compiler wire updates.

**State**

```svelte
<script>
  let state = $state(loadOrSeed());
  let filter = $derived(state.filter.trim().toLowerCase());
</script>
```

**Derived**

* Counts per column: `$derived(state.columns.todo.length)` etc.
* Filtered card lists: `$derived( ... )` based on `filter`

**Effects**

* Persist durable columns in `$effect(() => saveColumns(state.columns))`

**Props**

* In child components:

```svelte
<script>
  let { columnId, cards } = $props();
</script>
```

That is idiomatic runes-mode props. ([Svelte][9])

### “You learned it” checks

* Can you explain the conceptual difference between `$derived` and `$effect`?
* Can you explain why Svelte’s reactivity doesn’t need dependency arrays the way React effects do?
* Can you point to one place where React needed boilerplate (handlers/state lifting) that Svelte expresses more directly?

### Common traps

* Trying to write React inside Svelte (lots of manual memoization / manual “rerender” thinking)
* Putting side effects in `$derived` (Svelte disallows state changes there) ([Svelte][7])
* Using legacy `export let` instead of `$props()` for runes mode (it still exists as legacy mode, but you’re learning the new model) ([Svelte][11])

---

# Cross-rung comparison guide

This is the “why frameworks” payoff. As you build each rung, keep a notes file and answer these after each milestone.

## A. Where does truth live?

* Vanilla: you must **enforce** that state is truth
* jQuery: the temptation is DOM becomes truth
* React: state is truth and rendering is derived
* Svelte: state is truth and the compiler wires updates directly

For this exercise, the shared app-visible state shape is mandatory across all rungs.

## B. What is the unit of update?

* Vanilla: *you* choose (full rerender or manual patches)
* jQuery: *you* choose (and you’ll end up patching lots)
* React: the unit is component render + reconciliation
* Svelte: the unit is reactive dependencies (fine-grained)

## C. How do you prevent identity bugs?

* Vanilla/jQuery: you invent `data-card-id` conventions + careful patching
* React: `key` is the explicit identity mechanism
* Svelte: keyed `{#each ... (id)}` (same concept, different syntax)

## D. Side effects discipline

* Vanilla/jQuery: anything can happen anywhere
* React: effects are explicit and constrained (`useEffect`)
* Svelte: effects are explicit (`$effect`) and tied to reactive dependencies ([Svelte][8])

## E. What do you “pay” for?

* Vanilla/jQuery: you pay in **engineering discipline** and ongoing maintenance
* React: you pay in **conceptual overhead** (hooks, purity, component patterns)
* Svelte: you pay in **compile step + framework-specific reactivity model**, but you get very direct code

---

# Milestone-based build order for every rung

Do these in the same order each time (so comparisons are meaningful):

1. **Boot + persistence**: load/save/reset
2. **Basic render**: columns + cards
3. **Add card**
4. **Delete**
5. **Move**
6. **Filter**
7. **Inline edit**
8. **Polish**: counts + empty states + keyboard UX

At the end of each milestone, write 2–3 bullets:

* “What was hard?”
* “What became easier?”
* “What new kind of bug appeared?”

That reflection is how this becomes real understanding instead of a rewrite exercise.

[1]: https://jquery.com/download/ "Download jQuery | jQuery"
[2]: https://github.com/facebook/react/releases?utm_source=chatgpt.com "Releases · facebook/react"
[3]: https://www.npmjs.com/package/svelte?utm_source=chatgpt.com "svelte"
[4]: https://www.npmjs.com/package/vite?utm_source=chatgpt.com "vite"
[5]: https://vite.dev/guide/?utm_source=chatgpt.com "Getting Started"
[6]: https://svelte.dev/docs/svelte/%24state?utm_source=chatgpt.com "$state • Svelte Docs"
[7]: https://svelte.dev/docs/svelte/%24derived?utm_source=chatgpt.com "$derived • Svelte Docs"
[8]: https://svelte.dev/docs/svelte/%24effect?utm_source=chatgpt.com "$effect • Svelte Docs"
[9]: https://svelte.dev/docs/svelte/%24props?utm_source=chatgpt.com "$props • Svelte Docs"
[10]: https://github.com/jquery/jquery-dist?utm_source=chatgpt.com "Distribution repo for jQuery Core releases"
[11]: https://svelte.dev/docs/svelte/legacy-export-let?utm_source=chatgpt.com "export let"
