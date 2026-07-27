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

// Ordered segment steps from the sequential blue ramp, kept inside the ordinal
// contrast floors for each surface (light: no lighter than step 250; dark: no darker
// than step 600). Identity is never color-alone: every stacked chart has a legend
// and per-segment tooltips.
const TRIO = [
  { light: "#1c5cab", dark: "#86b6ef" },
  { light: "#3987e5", dark: "#3987e5" },
  { light: "#86b6ef", dark: "#184f95" }
];
const QUAD = [
  { light: "#104281", dark: "#86b6ef" },
  { light: "#256abf", dark: "#3987e5" },
  { light: "#5598e7", dark: "#256abf" },
  { light: "#86b6ef", dark: "#184f95" }
];

function segmentLegend(keys) {
  return `<div class="legend">${keys
    .map(
      (key) =>
        `<span class="legend-item"><span class="swatch" style="background: light-dark(${key.palette.light}, ${key.palette.dark})"></span>${esc(key.label)}</span>`
    )
    .join("")}</div>`;
}

// Stacked horizontal bars: one row per rung, segments in fixed order with 2px
// surface gaps, total value labeled at the bar end, per-segment tooltips.
function stackedPanel({ title, unit, rows, keys, format, note, wide }) {
  const width = wide ? 720 : 460;
  const labelWidth = 84;
  const rowHeight = 24;
  const barHeight = 14;
  const chartWidth = width - labelWidth - 84;
  const totals = rows.map((row) => keys.reduce((sum, key) => sum + row.values[key.key], 0));
  const max = Math.max(...totals) || 1;
  const parts = rows.map((row, index) => {
    const y = index * rowHeight + 6;
    let x = labelWidth;
    const segments = keys
      .map((key) => {
        const value = row.values[key.key];
        const segmentWidth = (value / max) * chartWidth;
        if (segmentWidth < 0.5) {
          return "";
        }
        const share = Math.round((value / totals[index]) * 100);
        const tooltip = `${rungName(row.id)} · ${key.label}: ${format(value)} (${share}%)`;
        const rect = `<rect class="mark" x="${x}" y="${y}" width="${Math.max(1, segmentWidth - 2)}" height="${barHeight}" rx="2" fill="light-dark(${key.palette.light}, ${key.palette.dark})"><title>${esc(tooltip)}</title></rect>`;
        x += segmentWidth;
        return rect;
      })
      .join("");
    return `<g>
      <text x="${labelWidth - 8}" y="${y + barHeight - 3}" class="row-label">${esc(rungName(row.id))}</text>
      ${segments}
      <text x="${x + 6}" y="${y + barHeight - 3}" class="value-label">${format(totals[index])}</text>
    </g>`;
  });
  const height = rows.length * rowHeight + 8;
  return `<figure class="panel${wide ? " wide" : ""}">
    <figcaption>${esc(title)} <span class="unit">${esc(unit)}</span></figcaption>
    ${segmentLegend(keys)}
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
      <line x1="${labelWidth}" y1="0" x2="${labelWidth}" y2="${height}" class="baseline" />
      ${parts.join("\n")}
    </svg>
    ${note ? `<p class="note">${note}</p>` : ""}
  </figure>`;
}

// Latency-vs-board-size lines: log x axis, per-panel linear y, one fixed-slot line
// per rung. The section renders a single shared legend; markers carry tooltips and a
// surface ring so overlapping points stay separable.
function linePanel({ title, unit, xs, series }) {
  const width = 460;
  const height = 240;
  const pad = { left: 52, right: 16, top: 12, bottom: 30 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const minX = xs[0];
  const maxX = xs[xs.length - 1];
  const sx = (value) => pad.left + (Math.log(value / minX) / Math.log(maxX / minX)) * plotWidth;
  const maxY = Math.max(...series.flatMap((entry) => entry.values)) * 1.08 || 1;
  const sy = (value) => pad.top + plotHeight - (value / maxY) * plotHeight;
  const gridY = [0.25, 0.5, 0.75, 1]
    .map(
      (fraction) =>
        `<line x1="${pad.left}" y1="${sy(maxY * fraction)}" x2="${width - pad.right}" y2="${sy(maxY * fraction)}" class="grid" /><text x="${pad.left - 5}" y="${sy(maxY * fraction) + 3}" class="tick">${fmt(maxY * fraction, 0)}</text>`
    )
    .join("");
  const ticksX = xs
    .map(
      (value) =>
        `<text x="${sx(value)}" y="${height - 8}" class="tick tick-x">${value >= 1000 ? `${value / 1000}k` : value}</text>`
    )
    .join("");
  const lines = series
    .map((entry) => {
      const color = `light-dark(${SLOTS[entry.id].light}, ${SLOTS[entry.id].dark})`;
      const points = entry.values.map((value, index) => `${sx(xs[index])},${sy(value)}`).join(" ");
      const markers = entry.values
        .map(
          (value, index) =>
            `<circle class="mark" cx="${sx(xs[index])}" cy="${sy(value)}" r="4" fill="${color}"><title>${esc(`${rungName(entry.id)} @ ${xs[index]} cards: ${fmt(value)} ${unit}`)}</title></circle>`
        )
        .join("");
      return `<g><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" />${markers}</g>`;
    })
    .join("\n");
  return `<figure class="panel">
    <figcaption>${esc(title)} <span class="unit">${esc(unit)}</span></figcaption>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
      ${gridY}
      <line x1="${pad.left}" y1="${pad.top + plotHeight}" x2="${width - pad.right}" y2="${pad.top + plotHeight}" class="baseline" />
      ${ticksX}
      ${lines}
    </svg>
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

// Derived from the churn ledger, no extra measurement: DOM writes issued for one
// logical change (a single card title), on a log scale, with the multiple over the
// leanest rung as the label.
function amplificationSection(churn) {
  const total = (writes) => writes.added + writes.removed + writes.attrs + writes.text;
  const values = churn.map((rung) => ({ id: rung.id, writes: total(rung.ops["commit-edit"]) }));
  const min = Math.min(...values.map((entry) => entry.writes).filter((value) => value > 0));
  const max = Math.max(...values.map((entry) => entry.writes));
  const width = 720;
  const labelWidth = 84;
  const rowHeight = 24;
  const barHeight = 14;
  const chartWidth = width - labelWidth - 190;
  const parts = values.map((entry, index) => {
    const y = index * rowHeight + 6;
    const barWidth = Math.max(2, (Math.log(entry.writes + 1) / Math.log(max + 1)) * chartWidth);
    const ratio = entry.writes / min;
    const label = `${entry.writes.toLocaleString("en-US")} writes · ${
      ratio >= 10 ? Math.round(ratio).toLocaleString("en-US") : ratio.toFixed(1)
    }× the leanest`;
    const color = SLOTS[entry.id];
    return `<g>
      <text x="${labelWidth - 8}" y="${y + barHeight - 3}" class="row-label">${esc(rungName(entry.id))}</text>
      ${roundedBar(labelWidth, y, barWidth, barHeight, `light-dark(${color.light}, ${color.dark})`, `${rungName(entry.id)}: ${label}`)}
      <text x="${labelWidth + barWidth + 6}" y="${y + barHeight - 3}" class="value-label">${esc(label)}</text>
    </g>`;
  });
  const height = values.length * rowHeight + 8;
  return `<section>
    <h2>Write amplification</h2>
    <p>One logical change &mdash; commit a single edited card title on a 300-card board &mdash;
    and the DOM writes each strategy spends on it. Log scale; derived directly from the write
    ledger above.</p>
    <figure class="panel wide">
      <figcaption>DOM writes per single-title commit <span class="unit">log scale</span></figcaption>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Write amplification">
        <line x1="${labelWidth}" y1="0" x2="${labelWidth}" y2="${height}" class="baseline" />
        ${parts.join("\n")}
      </svg>
    </figure>
  </section>`;
}

function scalingSection(scaling, scenarioLabels) {
  const xs = scaling[0].sizes.map((size) => size.cards);
  const opIds = Object.keys(scaling[0].sizes[0].ops);
  const legend = `<div class="legend">${scaling
    .map(
      (rung) =>
        `<span class="legend-item"><span class="swatch" style="background: light-dark(${SLOTS[rung.id].light}, ${SLOTS[rung.id].dark})"></span>${esc(rungName(rung.id))}</span>`
    )
    .join("")}</div>`;
  const panels = [
    linePanel({
      title: "Boot: seeded board fully rendered",
      unit: "ms",
      xs,
      series: scaling.map((rung) => ({
        id: rung.id,
        values: rung.sizes.map((size) => size.boot.median)
      }))
    }),
    ...opIds.map((op) =>
      linePanel({
        title: scenarioLabels[op] ?? op,
        unit: "ms",
        xs,
        series: scaling.map((rung) => ({
          id: rung.id,
          values: rung.sizes.map((size) => size.ops[op].script.median)
        }))
      })
    )
  ];
  const table = dataTable(
    ["operation", "cards", ...scaling.map((rung) => `${rungName(rung.id)} (ms)`)],
    xs.flatMap((cards, sizeIndex) => [
      ["boot", cards, ...scaling.map((rung) => fmt(rung.sizes[sizeIndex].boot.median))],
      ...opIds.map((op) => [
        scenarioLabels[op] ?? op,
        cards,
        ...scaling.map((rung) => fmt(rung.sizes[sizeIndex].ops[op].script.median))
      ])
    ])
  );
  return `<section>
    <h2>Scaling: latency vs board size</h2>
    <p>The timing methodology swept across board sizes (${xs.join(", ")} cards; log x axis,
    ${scaling[0].iterations} runs per point, ${scaling[0].throttle}&times; CPU throttle). The
    shape is the story. Full rebuilds and framework list reconciliation both rise with N
    &mdash; what differs is the constant &mdash; while jQuery B's hand-targeted patches are
    the only structural updates that stay flat. The draft-keystroke panel is the fine-grained
    test: strategies that touch just the input hold at a millisecond regardless of board
    size.</p>
    ${legend}
    <div class="panel-grid">${panels.join("\n")}</div>
    ${table}
  </section>`;
}

function workdaySection(workday) {
  const keys = [
    { key: "script", label: "script", palette: TRIO[0] },
    { key: "style", label: "style recalc", palette: TRIO[1] },
    { key: "layout", label: "layout", palette: TRIO[2] }
  ];
  const panel = stackedPanel({
    title: `CPU per ${workday[0].actions}-action session`,
    unit: "seconds",
    wide: true,
    rows: workday.map((entry) => ({ id: entry.id, values: entry })),
    keys,
    format: (value) => `${value.toFixed(2)} s`,
    note: "Unthrottled CDP task accounting on a 1,000-card board; idle time between actions contributes nothing."
  });
  const table = dataTable(
    ["rung", "script (s)", "style recalc (s)", "layout (s)", "all tasks (s)"],
    workday.map((entry) => [
      rungName(entry.id),
      entry.script.toFixed(2),
      entry.style.toFixed(2),
      entry.layout.toFixed(2),
      entry.task.toFixed(2)
    ])
  );
  return `<section>
    <h2>Cost of a workday</h2>
    <p>A fixed, deterministic editing session &mdash; adds, edits with keystrokes, moves,
    filters, deletes &mdash; run identically against every rung, with cumulative CPU time split
    by what the browser was doing. Rebuild strategies pay in style and layout; virtual-DOM
    reconciliation pays in script.</p>
    ${panel}
    ${table}
  </section>`;
}

function coldstartSection(coldstart) {
  const keys = [
    { key: "html", label: "HTML", palette: TRIO[0] },
    { key: "js", label: "JS transfer", palette: TRIO[1] },
    { key: "render", label: "parse + execute + render", palette: TRIO[2] }
  ];
  const panel = stackedPanel({
    title: "Cold load to rendered board",
    unit: "ms",
    wide: true,
    rows: coldstart.map((entry) => ({ id: entry.id, values: entry })),
    keys,
    format: (value) => `${fmt(value, 0)} ms`,
    note: "Median of 3 cold loads; HTTP cache disabled."
  });
  const table = dataTable(
    [
      "rung",
      "HTML (ms)",
      "JS transfer (ms)",
      "parse+exec+render (ms)",
      "total (ms)",
      "JS transferred"
    ],
    coldstart.map((entry) => [
      rungName(entry.id),
      fmt(entry.html, 0),
      fmt(entry.js, 0),
      fmt(entry.render, 0),
      fmt(entry.total, 0),
      kb(entry.transferred)
    ])
  );
  return `<section>
    <h2>Cold start on a slow connection</h2>
    <p>Fast-3G network emulation plus ${coldstart[0].throttle}&times; CPU throttle, loading a
    persisted ${coldstart[0].cards.toLocaleString("en-US")}-card board from scratch. This is
    where shipped bytes become felt time: transfer dominates for the heavy bundles, then the
    rebuild rungs pay again at render.</p>
    ${panel}
    ${table}
  </section>`;
}

function compositionSection(composition) {
  const keys = [
    { key: "framework", label: "framework", palette: QUAD[0] },
    { key: "shared", label: "shared helpers", palette: QUAD[1] },
    { key: "app", label: "app code", palette: QUAD[2] },
    { key: "glue", label: "bundler glue", palette: QUAD[3] }
  ];
  const panel = stackedPanel({
    title: "Shipped bytes by origin",
    unit: "uncompressed",
    wide: true,
    rows: composition.map((entry) => ({ id: entry.id, values: entry.segments })),
    keys,
    format: kb,
    note: "Built rungs attributed via sourcemaps on a dedicated --sourcemap build; static rungs ship sources verbatim."
  });
  const table = dataTable(
    ["rung", "framework", "shared helpers", "app code", "bundler glue", "total"],
    composition.map((entry) => [
      rungName(entry.id),
      kb(entry.segments.framework),
      kb(entry.segments.shared),
      kb(entry.segments.app),
      kb(entry.segments.glue),
      kb(entry.total)
    ])
  );
  return `<section>
    <h2>Bundle composition</h2>
    <p>Who the shipped bytes belong to. The app is the same everywhere; what changes is how
    much framework rides along with it.</p>
    ${panel}
    ${table}
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
  .legend { display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; margin: 0 0 0.5rem; }
  .legend-item { display: inline-flex; align-items: center; gap: 0.35rem;
    font-size: 0.8rem; color: light-dark(#52514e, #c3c2b7); }
  .swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  .tick-x { text-anchor: middle; }
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
  const optional = (name) => {
    try {
      return load(name);
    } catch {
      return null;
    }
  };
  const meta = load("meta");
  const staticMetrics = load("static");
  const churn = load("churn");
  const timing = load("timing");
  const memory = load("memory");
  const conformance = load("conformance");
  const workday = optional("workday");
  const coldstart = optional("coldstart");
  const composition = optional("composition");
  const scaling = optional("scaling");

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
  ${amplificationSection(churn)}
  ${timingSection(timing, scenarioLabels)}
  ${scaling ? scalingSection(scaling, scenarioLabels) : ""}
  ${workday ? workdaySection(workday) : ""}
  ${coldstart ? coldstartSection(coldstart) : ""}
  ${staticSection(staticMetrics)}
  ${composition ? compositionSection(composition) : ""}
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
