import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { launchBrowser } from "./browser.mjs";
import { buildRungs } from "./build.mjs";
import { benchRoot } from "./config.mjs";
import { generateReport } from "./report.mjs";
import { runChurn } from "./run-churn.mjs";
import { runColdstart } from "./run-coldstart.mjs";
import { collectComposition } from "./run-composition.mjs";
import { runConformance } from "./run-conformance.mjs";
import { runMemory } from "./run-memory.mjs";
import { runScaling } from "./run-scaling.mjs";
import { runTiming } from "./run-timing.mjs";
import { runWorkday } from "./run-workday.mjs";
import { startServer } from "./server.mjs";
import { collectStaticMetrics } from "./static-metrics.mjs";

const resultsDir = join(benchRoot, "results");

function save(name, data) {
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(join(resultsDir, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`);
}

function load(name) {
  return JSON.parse(readFileSync(join(resultsDir, `${name}.json`), "utf8"));
}

function saveMeta() {
  save("meta", {
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform} ${process.arch}`
  });
}

const log = (message) => process.stderr.write(`${message}\n`);

const browserPhases = [
  "churn",
  "timing",
  "memory",
  "workday",
  "coldstart",
  "conformance",
  "scaling"
];
// The scaling sweep is opt-in: it is hundreds of page loads including 10k-card
// boards and belongs to `bench:scaling`, never the default run.
const defaultPhases = [
  "static",
  "composition",
  "churn",
  "timing",
  "memory",
  "workday",
  "coldstart",
  "conformance",
  "report"
];

const phase = process.argv[2] ?? "all";
const phases = phase === "all" ? defaultPhases : [phase];

const runners = {
  churn: runChurn,
  timing: runTiming,
  memory: runMemory,
  workday: runWorkday,
  coldstart: runColdstart,
  conformance: runConformance,
  scaling: runScaling
};

const needsBrowser = phases.some((name) => browserPhases.includes(name));
if (needsBrowser) {
  buildRungs();
}
const server = needsBrowser ? await startServer() : null;
const browser = needsBrowser ? await launchBrowser() : null;

try {
  for (const name of phases) {
    if (name === "static") {
      save("static", collectStaticMetrics());
      log("static: done");
    } else if (name === "composition") {
      save("composition", collectComposition(log));
    } else if (name === "report") {
      saveMeta();
      generateReport(load, log);
    } else if (runners[name]) {
      save(name, await runners[name](browser, log));
    } else {
      throw new Error(`Unknown phase: ${name}`);
    }
  }
} finally {
  await browser?.close();
  server?.close();
}
