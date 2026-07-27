import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { launchBrowser } from "./browser.mjs";
import { buildRungs } from "./build.mjs";
import { benchRoot } from "./config.mjs";
import { generateReport } from "./report.mjs";
import { runChurn } from "./run-churn.mjs";
import { runConformance } from "./run-conformance.mjs";
import { runMemory } from "./run-memory.mjs";
import { runTiming } from "./run-timing.mjs";
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

const log = (message) => process.stderr.write(`${message}\n`);

const phase = process.argv[2] ?? "all";
const browserPhases = ["churn", "timing", "memory", "conformance"];
const phases = phase === "all" ? ["static", ...browserPhases, "report"] : [phase];

if (phases.includes("report") && phases.length === 1) {
  save("meta", {
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform} ${process.arch}`
  });
  generateReport(load, log);
  process.exit(0);
}

if (phases.some((name) => browserPhases.includes(name))) {
  buildRungs();
}

const server = phases.some((name) => browserPhases.includes(name)) ? await startServer() : null;
const browser = server ? await launchBrowser() : null;

try {
  for (const name of phases) {
    if (name === "static") {
      save("static", collectStaticMetrics());
      log("static: done");
    } else if (name === "churn") {
      save("churn", await runChurn(browser, log));
    } else if (name === "timing") {
      save("timing", await runTiming(browser, log));
    } else if (name === "memory") {
      save("memory", await runMemory(browser, log));
    } else if (name === "conformance") {
      save("conformance", await runConformance(browser, log));
    } else if (name === "report") {
      save("meta", {
        generatedAt: new Date().toISOString(),
        node: process.version,
        platform: `${process.platform} ${process.arch}`
      });
      generateReport(load, log);
    }
  }
} finally {
  await browser?.close();
  server?.close();
}
