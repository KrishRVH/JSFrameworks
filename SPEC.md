# Tiny Kanban

Tiny Kanban is one app implemented as six comparable artifacts:

1. Vanilla JS, Phase A: naive re-render
2. Vanilla JS, Phase B: keyed patch
3. jQuery, Approach A: render loop
4. jQuery, Approach B: incremental DOM updates
5. React
6. Svelte 5 with runes

Shared constraints:

* Keep the app-visible state shape identical across rungs.
* Treat card titles as plain text, never HTML.
* Persist only durable board data: `columns`.
* Reset restores `createSeedState()`.
* Empty adds do nothing.
* Empty edit commits cancel edit and preserve original title.

