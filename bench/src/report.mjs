import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { benchRoot, rungs } from "./config.mjs";

// Chart colors follow the dataviz reference palette: one fixed categorical slot per
// rung (color follows the entity across every chart), sequential blue for the churn
// heatmap, ink/chrome tokens for text. Palette validated with validate_palette.js
// for both modes; light-mode contrast WARN slots get their relief via direct labels
// and the table view every chart ships.
const SLOTS = {
  "vanilla-a": { light: "#2a78d6", dark: "#3987e5" },
  "vanilla-b": { light: "#eb6834", dark: "#d95926" },
  "jquery-a": { light: "#1baf7a", dark: "#199e70" },
  "jquery-b": { light: "#eda100", dark: "#c98500" },
  react: { light: "#e87ba4", dark: "#d55181" },
  svelte: { light: "#008300", dark: "#008300" },
  solid: { light: "#4a3aa7", dark: "#9085e9" }
};

const SEQ = [
  "#cde2fb",
  "#b7d3f6",
  "#9ec5f4",
  "#86b6ef",
  "#6da7ec",
  "#5598e7",
  "#3987e5",
  "#2a78d6",
  "#256abf",
  "#1c5cab",
  "#184f95",
  "#104281",
  "#0d366b"
];

const esc = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const rungName = (id) => rungs.find((rung) => rung.id === id)?.name ?? id;

const fmt = (value, digits = 1) =>
  value >= 100 ? Math.round(value).toLocaleString("en-US") : value.toFixed(digits);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

function roundedBar(x, y, width, height, fill, title) {
  const radius = Math.min(4, Math.max(0, width / 2));
  const d = `M${x} ${y} h${Math.max(0, width - radius)} q${radius} 0 ${radius} ${radius} v${
    height - 2 * radius
  } q0 ${radius} ${-radius} ${radius} h${-Math.max(0, width - radius)} z`;
  return `<path class="mark" d="${d}" fill="${fill}"><title>${esc(title)}</title></path>`;
}

// Horizontal bar panel: one row per rung, value labels on every bar (7 marks), an
// IQR whisker when quartiles are provided. Identity is carried by the row label,
// never color alone.
function barPanel({ title, unit, rows, note }) {
  const width = 460;
  const labelWidth = 84;
  const rowHeight = 24;
  const barHeight = 14;
  const chartWidth = width - labelWidth - 76;
  const max = Math.max(...rows.map((row) => row.q3 ?? row.value)) || 1;
  const height = rows.length * rowHeight + 8;
  const parts = rows.map((row, index) => {
    const y = index * rowHeight + 6;
    const barWidth = Math.max(1, (row.value / max) * chartWidth);
    const barExtent = Math.max(barWidth, row.q3 === undefined ? 0 : (row.q3 / max) * chartWidth);
    const color = SLOTS[row.id];
    const tooltip = `${rungName(row.id)}: ${fmt(row.value)} ${unit}${
      row.q1 !== undefined ? ` (IQR ${fmt(row.q1)}–${fmt(row.q3)})` : ""
    }`;
    const whisker =
      row.q1 !== undefined
        ? `<line x1="${labelWidth + (row.q1 / max) * chartWidth}" y1="${y + barHeight / 2}" x2="${
            labelWidth + (row.q3 / max) * chartWidth
          }" y2="${y + barHeight / 2}" class="whisker" />`
        : "";
    return `<g>
      <text x="${labelWidth - 8}" y="${y + barHeight - 3}" class="row-label">${esc(rungName(row.id))}</text>
      ${roundedBar(labelWidth, y, barWidth, barHeight, `light-dark(${color.light}, ${color.dark})`, tooltip)}
      ${whisker}
      <text x="${labelWidth + barExtent + 6}" y="${y + barHeight - 3}" class="value-label">${fmt(row.value)}</text>
    </g>`;
  });
  return `<figure class="panel">
    <figcaption>${esc(title)} <span class="unit">${esc(unit)}</span></figcaption>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
      <line x1="${labelWidth}" y1="0" x2="${labelWidth}" y2="${height}" class="baseline" />
      ${parts.join("\n")}
    </svg>
    ${note ? `<p class="note">${note}</p>` : ""}
  </figure>`;
}

function dataTable(headers, rows) {
  return `<details><summary>Data table</summary><table>
    <thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join("")}</tr></thead>
    <tbody>${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`)
      .join("\n")}</tbody>
  </table></details>`;
}

function churnSection(churn, scenarioLabels) {
  const opIds = Object.keys(churn[0].ops);
  const total = (writes) => writes.added + writes.removed + writes.attrs + writes.text;
  const max = Math.max(
    ...churn.flatMap((rung) => [total(rung.boot), ...opIds.map((op) => total(rung.ops[op]))])
  );
  const step = (value) => {
    if (value === 0) {
      return "s-zero";
    }
    const index = Math.round((Math.log(value + 1) / Math.log(max + 1)) * (SEQ.length - 1));
    return `s-${index}`;
  };
  const cell = (value, breakdown) =>
    `<td class="heat ${step(value)}" title="${esc(breakdown)}">${value.toLocaleString("en-US")}</td>`;
  const rows = [
    `<tr><th>boot (initial render)</th>${churn
      .map((rung) =>
        cell(
          total(rung.boot),
          `+${rung.boot.added} nodes, -${rung.boot.removed}, ${rung.boot.attrs} attrs, ${rung.boot.text} text`
        )
      )
      .join("")}</tr>`,
    ...opIds.map(
      (op) =>
        `<tr><th>${esc(scenarioLabels[op] ?? op)}</th>${churn
          .map((rung) => {
            const data = rung.ops[op];
            const suffix = data.deterministic ? "" : " (non-deterministic)";
            return cell(
              total(data),
              `+${data.added} nodes, -${data.removed}, ${data.attrs} attrs, ${data.text} text${suffix}`
            );
          })
          .join("")}</tr>`
    )
  ];
  return `<section>
    <h2>DOM write ledger</h2>
    <p>Total DOM writes (node insertions + removals + attribute writes + text writes) per user
    action on a ${churn[0].cards}-card board, counted by a MutationObserver. Deterministic and
    noise-free: this is what each strategy actually touches. Hover a cell for the breakdown.
    Color is a log scale.</p>
    <table class="heatmap">
      <thead><tr><th>operation</th>${churn
        .map((rung) => `<th>${esc(rungName(rung.id))}</th>`)
        .join("")}</tr></thead>
      <tbody>${rows.join("\n")}</tbody>
    </table>
  </section>`;
}

function timingSection(timing, scenarioLabels) {
  const opIds = Object.keys(timing[0].ops);
  const panels = opIds.map((op) =>
    barPanel({
      title: scenarioLabels[op] ?? op,
      unit: "ms",
      rows: timing.map((rung) => ({
        id: rung.id,
        value: rung.ops[op].script.median,
        q1: rung.ops[op].script.q1,
        q3: rung.ops[op].script.q3
      }))
    })
  );
  const bootPanel = barPanel({
    title: "Boot: seeded board fully rendered",
    unit: "ms",
    rows: timing.map((rung) => ({
      id: rung.id,
      value: rung.boot.median,
      q1: rung.boot.q1,
      q3: rung.boot.q3
    }))
  });
  const table = dataTable(
    ["operation", ...timing.map((rung) => `${rungName(rung.id)} (ms)`)],
    [
      ["boot", ...timing.map((rung) => fmt(rung.boot.median))],
      ...opIds.map((op) => [
        scenarioLabels[op] ?? op,
        ...timing.map((rung) => fmt(rung.ops[op].script.median))
      ])
    ]
  );
  return `<section>
    <h2>Interaction latency</h2>
    <p>Median of ${timing[0].iterations} independent runs (page reloaded between runs) on a
    ${timing[0].cards.toLocaleString("en-US")}-card board with ${timing[0].throttle}&times; CPU
    throttling. Bars show script time &mdash; from event dispatch until the DOM reflects the
    result; whiskers are the interquartile range. Each panel has its own scale: compare within a
    panel, not across panels.</p>
    <div class="panel-grid">${bootPanel}${panels.join("\n")}</div>
    ${table}
  </section>`;
}

function staticSection(staticMetrics) {
  const payloadPanel = barPanel({
    title: "Shipped JavaScript",
    unit: "kB gzip",
    rows: staticMetrics.map((entry) => ({ id: entry.id, value: entry.payload.gzip / 1024 })),
    note: "jQuery rungs include the 30&nbsp;kB library; built rungs bundle the shared helpers."
  });
  const authoredPanel = barPanel({
    title: "Authored app code",
    unit: "non-blank lines",
    rows: staticMetrics.map((entry) => ({ id: entry.id, value: entry.authored.lines })),
    note: "Rung-specific sources only; shared helpers and HTML shells excluded everywhere."
  });
  const scatter = scatterPanel(staticMetrics);
  const table = dataTable(
    ["rung", "shipped raw", "shipped gzip", "authored lines", "authored bytes"],
    staticMetrics.map((entry) => [
      rungName(entry.id),
      kb(entry.payload.raw),
      kb(entry.payload.gzip),
      entry.authored.lines,
      kb(entry.authored.bytes)
    ])
  );
  return `<section>
    <h2>Author cost vs user cost</h2>
    <div class="panel-grid">${payloadPanel}${authoredPanel}</div>
    ${scatter}
    ${table}
  </section>`;
}

function scatterPanel(staticMetrics) {
  const width = 560;
  const height = 300;
  const pad = { left: 56, right: 110, top: 16, bottom: 40 };
  const maxX = Math.max(...staticMetrics.map((entry) => entry.authored.lines)) * 1.12;
  const maxY = Math.max(...staticMetrics.map((entry) => entry.payload.gzip / 1024)) * 1.15;
  const sx = (value) => pad.left + (value / maxX) * (width - pad.left - pad.right);
  const sy = (value) => height - pad.bottom - (value / maxY) * (height - pad.top - pad.bottom);
  const gridY = [0.25, 0.5, 0.75, 1].map(
    (fraction) =>
      `<line x1="${pad.left}" y1="${sy(maxY * fraction)}" x2="${width - pad.right}" y2="${sy(
        maxY * fraction
      )}" class="grid" /><text x="${pad.left - 6}" y="${sy(maxY * fraction) + 3}" class="tick">${Math.round(
        maxY * fraction
      )}</text>`
  );
  const points = staticMetrics.map((entry) => {
    const x = sx(entry.authored.lines);
    const y = sy(entry.payload.gzip / 1024);
    const color = SLOTS[entry.id];
    return `<g class="mark">
      <circle cx="${x}" cy="${y}" r="5" fill="light-dark(${color.light}, ${color.dark})">
        <title>${esc(rungName(entry.id))}: ${entry.authored.lines} lines, ${kb(entry.payload.gzip)} gzip</title>
      </circle>
      <text x="${x + 9}" y="${y + 4}" class="point-label">${esc(rungName(entry.id))}</text>
    </g>`;
  });
  return `<figure class="panel wide">
    <figcaption>Authored lines (x) vs shipped gzip kB (y) &mdash; the cost trade in one picture</figcaption>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Author cost versus user cost scatter">
      ${gridY.join("\n")}
      <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${
        height - pad.bottom
      }" class="baseline" />
      <text x="${(pad.left + width - pad.right) / 2}" y="${height - 8}" class="axis-title">authored non-blank lines</text>
      <text x="14" y="${height / 2}" class="axis-title" transform="rotate(-90 14 ${height / 2})">shipped kB (gzip)</text>
      ${points.join("\n")}
    </svg>
  </figure>`;
}

function memorySection(memory) {
  const panel = barPanel({
    title: "Retained heap per card",
    unit: "bytes",
    rows: memory.map((entry) => ({ id: entry.id, value: entry.retainedPerCard })),
    note: "Heap delta between 1,000- and 5,000-card boards after forced GC, divided by the card delta."
  });
  const table = dataTable(
    ["rung", "heap @1k", "heap @5k", "DOM nodes @1k", "listeners @1k"],
    memory.map((entry) => [
      rungName(entry.id),
      `${(entry.small.heap / 1048576).toFixed(1)} MB`,
      `${(entry.large.heap / 1048576).toFixed(1)} MB`,
      entry.small.nodes.toLocaleString("en-US"),
      entry.small.listeners.toLocaleString("en-US")
    ])
  );
  return `<section>
    <h2>Memory</h2>
    <div class="panel-grid">${panel}</div>
    <p>DOM node counts on identical markup expose per-framework anchor overhead; listener counts
    expose delegation (a handful at the root) versus per-node handlers.</p>
    ${table}
  </section>`;
}

function conformanceSection(conformance) {
  const rows = conformance.map((entry) => {
    const drift = entry.expectedDrift.length
      ? `<span class="drift" title="${esc(entry.expectedDrift.join("; "))}">&#9888; ${
          entry.expectedDrift.length
        } documented drift</span>`
      : "&#10003; full";
    const unexpected = entry.unexpectedFailures.length
      ? `<span class="bad">&#10007; ${esc(entry.unexpectedFailures.join(", "))}</span>`
      : "";
    return `<tr><th>${esc(rungName(entry.id))}</th><td>${entry.passed}/${entry.total}</td><td>${drift} ${unexpected}</td></tr>`;
  });
  return `<section>
    <h2>Behavioral conformance</h2>
    <p>The SPEC.md acceptance checklist driven through a real browser. "Documented drift" is the
    render-loop cost 01/03 deliberately keep (and their NOTES.md name): the first click after a
    blur-commit is swallowed by the full rebuild.</p>
    <table class="conformance">
      <thead><tr><th>rung</th><th>checks</th><th>status</th></tr></thead>
      <tbody>${rows.join("\n")}</tbody>
    </table>
  </section>`;
}

const STYLE = `
  :root { color-scheme: light dark; }
  body {
    margin: 0; padding: 2rem 1.25rem 4rem;
    background: light-dark(#f9f9f7, #0d0d0d);
    color: light-dark(#0b0b0b, #ffffff);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    line-height: 1.5;
  }
  main { max-width: 72rem; margin: 0 auto; }
  h1 { margin: 0; font-size: 1.7rem; }
  h2 { margin: 2.5rem 0 0.5rem; font-size: 1.2rem; }
  p { max-width: 60rem; color: light-dark(#52514e, #c3c2b7); margin: 0.4rem 0 1rem; }
  .meta { color: #898781; font-size: 0.85rem; }
  section > table, figure { background: light-dark(#fcfcfb, #1a1a19);
    border: 1px solid light-dark(rgba(11,11,11,0.10), rgba(255,255,255,0.10));
    border-radius: 8px; }
  .panel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(28rem, 1fr)); gap: 1rem; }
  figure.panel { margin: 0; padding: 0.75rem 1rem 0.5rem; }
  figure.wide { margin-top: 1rem; }
  figcaption { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.5rem; }
  figcaption .unit { color: #898781; font-weight: 400; }
  svg { width: 100%; height: auto; display: block; }
  .row-label, .value-label, .tick, .point-label, .axis-title {
    font: 11px system-ui, sans-serif; fill: light-dark(#52514e, #c3c2b7);
  }
  .row-label { text-anchor: end; }
  .value-label, .tick { font-variant-numeric: tabular-nums; }
  .tick { text-anchor: end; fill: #898781; }
  .axis-title { text-anchor: middle; fill: #898781; }
  .baseline { stroke: light-dark(#c3c2b7, #383835); stroke-width: 1; }
  .grid { stroke: light-dark(#e1e0d9, #2c2c2a); stroke-width: 1; }
  .whisker { stroke: light-dark(#0b0b0b, #ffffff); stroke-opacity: 0.45; stroke-width: 2; }
  .mark:hover { opacity: 0.8; }
  .note { font-size: 0.8rem; color: #898781; margin: 0.35rem 0 0.25rem; }
  table { border-collapse: collapse; font-size: 0.85rem; }
  th, td { padding: 0.35rem 0.6rem; text-align: left; }
  td { font-variant-numeric: tabular-nums; }
  thead th { color: #898781; font-weight: 600; border-bottom: 1px solid light-dark(#e1e0d9, #2c2c2a); }
  tbody th { font-weight: 500; }
  .heatmap td.heat { text-align: right; min-width: 4.5rem; }
  .conformance td, .conformance th { border-bottom: 1px solid light-dark(#e1e0d9, #2c2c2a); }
  .drift { color: light-dark(#52514e, #c3c2b7); }
  .bad { color: light-dark(#d03b3b, #d03b3b); font-weight: 600; }
  details { margin: 0.75rem 0 0; }
  summary { cursor: pointer; color: #898781; font-size: 0.85rem; }
  details table { margin-top: 0.5rem; background: light-dark(#fcfcfb, #1a1a19); }
  td.s-zero { background: transparent; color: #898781; }
${SEQ.map((hex, index) => {
  const darkHex = SEQ[SEQ.length - 1 - index];
  const lightInk = index >= 6 ? "#ffffff" : "#0b0b0b";
  const darkInk = SEQ.length - 1 - index >= 6 ? "#ffffff" : "#0b0b0b";
  return `  td.s-${index} { background: light-dark(${hex}, ${darkHex}); color: light-dark(${lightInk}, ${darkInk}); }`;
}).join("\n")}
`;

export function generateReport(load, log) {
  const meta = load("meta");
  const staticMetrics = load("static");
  const churn = load("churn");
  const timing = load("timing");
  const memory = load("memory");
  const conformance = load("conformance");

  const scenarioLabels = {
    "add-card": "Add one card",
    "delete-middle": "Delete middle card",
    "move-card": "Move card right",
    "start-edit": "Open inline edit",
    "draft-keystroke": "Draft keystroke",
    "commit-edit": "Commit edited title",
    "filter-type": "Filter (type)",
    "filter-clear": "Clear filter",
    reset: "Reset board"
  };

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Tiny Kanban Bench</title>
<style>${STYLE}</style>
</head>
<body>
<main>
  <h1>Tiny Kanban Bench</h1>
  <p>Seven implementations of the same app, same markup, same behavior contract &mdash; measured
  apples to apples. Production builds only; jQuery served locally; numbers illustrate the
  strategies on <em>this</em> app, not framework performance in general.</p>
  <p class="meta">Generated ${esc(meta.generatedAt)} &middot; Node ${esc(meta.node)} &middot; ${esc(
    meta.platform
  )} &middot; single machine, treat cross-machine comparisons as invalid.</p>
  ${conformanceSection(conformance)}
  ${churnSection(churn, scenarioLabels)}
  ${timingSection(timing, scenarioLabels)}
  ${staticSection(staticMetrics)}
  ${memorySection(memory)}
</main>
</body>
</html>
`;
  const outDir = join(benchRoot, "report");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  log(`report: ${join(outDir, "index.html")}`);
}
