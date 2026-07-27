# Repository Guidelines

Tiny Kanban is one app implemented seven ways for comparison. Keep behavior aligned with
`SPEC.md`; only the implementation style should differ.

## Structure

- `00-compare-all/`: lightweight Vite comparison harness for the seven real implementations.
- `01-vanilla-a-rerender/`, `02-vanilla-b-keyed-patch/`: static vanilla JS implementations.
- `03-jquery-a-render-loop/`, `04-jquery-b-incremental/`: static jQuery implementations.
- `05-react/`: React 19 Vite app, source in `05-react/src/`.
- `06-svelte/`: Svelte 5 runes Vite app, source in `06-svelte/src/`.
- `07-solid/`: SolidJS Vite app, source in `07-solid/src/`.
- `shared/`: shared CSS, seed/storage helpers, and framework-neutral state transitions.
- `bench/`: benchmark + conformance suite (DOM write ledger, latency, payload, memory,
  behavior checks) and report generator. See `bench/README.md`.
- `SPEC.md`: canonical behavior contract and learning ladder.

## Tooling

Use npm exclusively. The repo pins Node with `.node-version`, npm with `packageManager`, and
exact installs with `.npmrc`.

This is not an npm workspace. Install each package boundary separately:

```sh
npm install
npm --prefix 00-compare-all install
npm --prefix 05-react install
npm --prefix 06-svelte install
npm --prefix 07-solid install
```

Common commands from the repo root:

```sh
npm run check
npm run check:write
npm run lint
npm run format
npm run dev:compare
npm run build
npm run build:react
npm run build:svelte
npm run build:solid
npm run dev:react
npm run dev:svelte
npm run dev:solid
```

Static apps run with `python3 -m http.server` from the repo root, then open the numbered folder.

## Code Rules

- Use ES modules.
- Let Biome own formatting and linting through the root `biome.json`.
- Keep state transitions in `shared/actions.js`. The Svelte and Solid rungs are the
  exception: they mutate natively (deep `$state` proxy, store primitives) and reuse only the
  shared read and persistence helpers. `SPEC.md` explains why.
- Keep storage, seed data, column constants, and title normalization in `shared/seed.js`.
- Keep UI-specific code inside the numbered implementation folders.
- Keep `00-compare-all/` as a minimal viewer; it should not duplicate Kanban app logic.
- Treat card titles as plain text, never HTML.
- Persist only durable board data: `columns`.
- Do not change one implementation without checking whether `SPEC.md` requires the same behavior elsewhere.

## Verification

For framework changes, run `npm run build`; for broader changes, run `npm run check` too.
Behavior is verified by the bench conformance suite: `npm --prefix bench run bench:conformance`
drives the `SPEC.md` acceptance checklist through a real browser against every rung (requires a
Chromium binary; see `bench/README.md`).

Manual behavior checks should cover add, delete, move, edit commit/cancel, filter, reset,
persistence, empty-title behavior, and the XSS text case from `SPEC.md`.

## PR Notes

Keep commits focused. PRs should state the behavior changed, implementations touched,
verification performed, and include screenshots or screen recordings for visible UI changes.
