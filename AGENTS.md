# Repository Guidelines

## Project Structure & Module Organization

This repository contains Tiny Kanban implemented across several JavaScript approaches for comparison.

- `01-vanilla-a-rerender/` and `02-vanilla-b-keyed-patch/`: plain JavaScript versions with `index.html`, `app.js`, and local `NOTES.md`.
- `03-jquery-a-render-loop/` and `04-jquery-b-incremental/`: jQuery implementations with the same static-file shape.
- `05-react/`: React 19 Vite app; source lives in `05-react/src/`.
- `06-svelte/`: Svelte 5 Vite app; source lives in `06-svelte/src/`.
- `shared/`: shared CSS, seed data, and state transition helpers used by all implementations.
- `SPEC.md`: behavior contract for every implementation. Keep visible behavior aligned with this file.

## Build, Test, and Development Commands

- Static implementations: from the repo root, run `python3 -m http.server` and open `http://127.0.0.1:8000/01-vanilla-a-rerender/` or another numbered folder.
- React: `cd 05-react && bun install && bun run dev` starts Vite locally; `bun run build` creates `dist/`; `bun run preview` serves the production build.
- Svelte: `cd 06-svelte && bun install && bun run dev`; use `bun run build` and `bun run preview` the same way.

There is no root package manager workspace. Install dependencies inside each Vite app directory.

## Coding Style & Naming Conventions

Use ES modules throughout. Match the existing two-space indentation, double quotes in JavaScript, and semicolon style already present in the source. Keep shared state logic framework-neutral in `shared/actions.js` and `shared/seed.js`; UI-specific code should stay inside the numbered implementation folders. Prefer descriptive action names such as `addCardState`, `commitEditState`, and `visibleCards`.

## Testing Guidelines

No automated test framework is currently configured. Validate changes manually against `SPEC.md` in every affected implementation. At minimum, check add, delete, move, edit commit/cancel, filter, reset, persistence, and empty-title behavior. For framework apps, run `bun run build` before submitting changes.

## Commit & Pull Request Guidelines

The current Git history uses short imperative messages such as `init commit` and `Initial commit`. Keep commits concise and focused. Pull requests should describe the behavior changed, list the implementations touched, note manual verification steps, and include screenshots or screen recordings for visible UI changes.

## Agent-Specific Instructions

Do not change one implementation without considering whether `SPEC.md` requires the same behavior elsewhere. Treat card titles as plain text, never HTML, and persist only durable board data: `columns`.
