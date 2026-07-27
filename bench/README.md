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
- **Write amplification** (derived in the report): DOM writes spent on one logical
  change, as a multiple of the leanest rung.
- **Cost of a workday** (`workday.json`): cumulative CPU time (script vs style
  recalc vs layout, via CDP task accounting, unthrottled) for a fixed ~110-action
  editing session.
- **Cold start** (`coldstart.json`): Fast-3G network emulation + 4x CPU throttle,
  cache disabled, segmented into HTML arrival, JS transfer, and parse/execute/render
  of a persisted 1,000-card board.
- **Bundle composition** (`composition.json`): shipped bytes attributed to
  framework, shared helpers, app code, and bundler glue - sourcemap-attributed for
  built rungs (a dedicated `--sourcemap` build into `dist/mapbuild`), exact file
  sizes for the static rungs.
- **Scaling sweep** (`scaling.json`, **opt-in**): the timing methodology swept
  across 100/300/1k/3k/10k-card boards for four key operations - the
  latency-vs-N curves. This is hundreds of page loads, so it never runs by
  default. `npm run bench:scaling` produces the results; the report picks them up
  on the next `npm run bench:report` and skips the section when they are absent.
- **Behavioral conformance** (`conformance.json`): the SPEC.md acceptance checklist
  driven through a real browser, with the documented 01/03 render-loop drift encoded
  as expected.

## Methodology guards

- Framework rungs are measured from **production builds** (`vite build --base ./`),
  never dev servers; StrictMode double-rendering and dev transforms would poison
  every number.
- jQuery is never fetched from its CDN. The bench server rewrites the script URL in
  served HTML to the copy in `vendor/`, so runs work offline and the cold-start
  phase throttles jQuery's transfer exactly like every other resource.
- The bench server gzips everything it serves, so cold-start transfer segments
  reflect wire bytes the way real hosting would, not raw file sizes.
- Everything runs in headless Chromium on one machine; cross-machine comparisons of
  saved results are invalid. Numbers describe these strategies on this app - they
  are not general framework rankings.

## Running

Requires a Chromium binary: a Playwright browser cache is auto-detected, or set
`BENCH_CHROMIUM=/path/to/chrome`.

```sh
npm --prefix bench install
npm run bench          # default run: everything except the scaling sweep
npm run bench:scaling  # opt-in scaling sweep (slow; ~700 page loads)
npm run bench:report   # regenerate report from existing results
```

Individual phases: `npm --prefix bench run bench:churn` (also `timing`, `memory`,
`workday`, `coldstart`, `composition`, `conformance`, `static`, `scaling`).

Results land in `bench/results/*.json`; the self-contained report (inline SVG, light
and dark, no external assets) is written to `bench/report/index.html`.
