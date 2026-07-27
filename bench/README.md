# Tiny Kanban Bench

Apples-to-apples measurements across the seven implementations. Same app, same markup,
same behavior contract, so the differences are the rendering strategies themselves.

## What it measures

- **DOM write ledger** (`churn.json`): MutationObserver counts of node insertions,
  removals, attribute writes, and text writes per user action on a 300-card board.
  Inserted/removed subtrees are counted node-by-node. Deterministic: each op runs
  twice and mismatches are flagged. Includes same-value writes on purpose - issuing
  them is precisely the cost that diffing removes.
- **Interaction latency** (`timing.json`): median of 9 independent runs (reload
  between runs) on a 1,000-card board at 4x CPU throttle. `script` is event dispatch
  until the DOM reflects the result; `total` adds two rAFs (the next rendered frame).
- **Author cost vs user cost** (`static.json`): shipped JS raw/gzip per rung versus
  authored non-blank source lines (shared helpers and HTML shells excluded).
- **Memory** (`memory.json`): heap after boot at 1,000 and 5,000 cards after forced
  GC (retained bytes per card), plus DOM node and JS event listener counts.
- **Behavioral conformance** (`conformance.json`): the SPEC.md acceptance checklist
  driven through a real browser, with the documented 01/03 render-loop drift encoded
  as expected.

## Methodology guards

- Framework rungs are measured from **production builds** (`vite build --base ./`),
  never dev servers; StrictMode double-rendering and dev transforms would poison
  every number.
- jQuery is served from `vendor/` via request interception, so CDN latency never
  leaks into a measurement and runs work offline.
- Everything runs in headless Chromium on one machine; cross-machine comparisons of
  saved results are invalid. Numbers describe these strategies on this app - they
  are not general framework rankings.

## Running

Requires a Chromium binary: a Playwright browser cache is auto-detected, or set
`BENCH_CHROMIUM=/path/to/chrome`.

```sh
npm --prefix bench install
npm run bench          # everything: static, churn, timing, memory, conformance, report
npm run bench:report   # regenerate report from existing results
```

Individual phases: `npm --prefix bench run bench:churn` (also `timing`, `memory`,
`conformance`, `static`).

Results land in `bench/results/*.json`; the self-contained report (inline SVG, light
and dark, no external assets) is written to `bench/report/index.html`.
