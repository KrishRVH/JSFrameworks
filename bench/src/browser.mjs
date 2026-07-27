import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { PORT, STORAGE_KEY, benchRoot } from "./config.mjs";

function findChromium() {
  if (process.env.BENCH_CHROMIUM && existsSync(process.env.BENCH_CHROMIUM)) {
    return process.env.BENCH_CHROMIUM;
  }
  const cache = join(homedir(), ".cache", "ms-playwright");
  if (existsSync(cache)) {
    const candidates = readdirSync(cache)
      .filter((name) => name.startsWith("chromium"))
      .sort()
      .reverse();
    for (const name of candidates) {
      for (const inner of [
        join(cache, name, "chrome-headless-shell-linux64", "chrome-headless-shell"),
        join(cache, name, "chrome-linux", "chrome"),
        join(cache, name, "chrome-linux", "headless_shell")
      ]) {
        if (existsSync(inner)) {
          return inner;
        }
      }
    }
  }
  for (const system of [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome"
  ]) {
    if (existsSync(system)) {
      return system;
    }
  }
  throw new Error(
    "No Chromium found. Set BENCH_CHROMIUM to a Chrome/Chromium binary or install Playwright browsers."
  );
}

export function launchBrowser() {
  return chromium.launch({ executablePath: findChromium() });
}

// Runs before any page script: seeds the board, installs the mutation ledger, and
// records the moment the seeded board is fully rendered.
const INIT_SCRIPT = `(({ storageKey, columnsJson, expectedCards, deepCount }) => {
  if (columnsJson) {
    localStorage.setItem(storageKey, JSON.stringify({ columns: JSON.parse(columnsJson) }));
  } else {
    localStorage.removeItem(storageKey);
  }

  const bench = {
    mutations: { added: 0, removed: 0, attrs: 0, text: 0 },
    bootAt: null,
    bootMutations: null
  };
  globalThis.__bench = bench;

  // MutationObserver reports one entry per inserted/removed subtree root. For the
  // churn ledger that would flatter coarse strategies (one replaceChildren of 300
  // cards = 3 entries), so deepCount expands each entry to its subtree size. Timing
  // runs keep it off: the traversal would tax exactly the strategies being timed.
  const sizeOf = (node) => {
    let count = 1;
    for (let child = node.firstChild; child; child = child.nextSibling) {
      count += sizeOf(child);
    }
    return count;
  };
  const weight = deepCount ? sizeOf : () => 1;

  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        bench.mutations.added += weight(node);
      }
      for (const node of record.removedNodes) {
        bench.mutations.removed += weight(node);
      }
      if (record.type === "attributes") {
        bench.mutations.attrs += 1;
      }
      if (record.type === "characterData") {
        bench.mutations.text += 1;
      }
    }
    if (bench.bootAt === null && document.querySelectorAll(".card").length >= expectedCards) {
      bench.bootAt = performance.now();
      bench.bootMutations = { ...bench.mutations };
    }
  }).observe(document, { childList: true, subtree: true, attributes: true, characterData: true });

  const revive = (source) => new Function("return (" + source + ")")();

  globalThis.__benchSettle = () =>
    new Promise((resolve) => {
      let last = JSON.stringify(bench.mutations);
      let quiet = 0;
      const tick = () => {
        const now = JSON.stringify(bench.mutations);
        quiet = now === last ? quiet + 1 : 0;
        last = now;
        if (quiet >= 5) {
          resolve();
        } else {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });

  globalThis.__benchRun = async (actionSource) => {
    revive(actionSource)();
    await globalThis.__benchSettle();
  };

  globalThis.__benchChurn = async (actionSource) => {
    const before = { ...bench.mutations };
    revive(actionSource)();
    await globalThis.__benchSettle();
    const after = bench.mutations;
    return {
      added: after.added - before.added,
      removed: after.removed - before.removed,
      attrs: after.attrs - before.attrs,
      text: after.text - before.text
    };
  };

  globalThis.__benchMeasure = (actionSource, predicateSource) =>
    new Promise((resolveMeasure) => {
      const action = revive(actionSource);
      const predicate = predicateSource ? revive(predicateSource) : null;
      const t0 = performance.now();
      action();
      let script = null;
      const finish = () => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolveMeasure({ script, total: performance.now() - t0 }))
        );
      };
      if (!predicate) {
        script = performance.now() - t0;
        finish();
        return;
      }
      if (predicate()) {
        script = performance.now() - t0;
        finish();
        return;
      }
      let done = false;
      const settle = () => {
        if (done) {
          return;
        }
        done = true;
        script = performance.now() - t0;
        observer.disconnect();
        finish();
      };
      const observer = new MutationObserver(() => {
        if (!done && predicate()) {
          settle();
        }
      });
      observer.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
      const poll = () => {
        if (done) {
          return;
        }
        if (predicate()) {
          settle();
        } else {
          requestAnimationFrame(poll);
        }
      };
      requestAnimationFrame(poll);
    });
})`;

export async function openRungPage(
  browser,
  rung,
  { columns, expectedCards, cpuThrottle, deepCount }
) {
  const page = await browser.newPage();
  await page.route("https://code.jquery.com/**", (route) =>
    route.fulfill({
      contentType: "text/javascript; charset=utf-8",
      body: readFileSync(join(benchRoot, "vendor", "jquery-4.0.0.min.js"), "utf8")
    })
  );
  const session = await page.context().newCDPSession(page);
  if (cpuThrottle) {
    await session.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottle });
  }
  await page.addInitScript(
    `${INIT_SCRIPT}(${JSON.stringify({
      storageKey: STORAGE_KEY,
      columnsJson: columns ? JSON.stringify(columns) : null,
      expectedCards,
      deepCount: Boolean(deepCount)
    })})`
  );
  return { page, session, url: `http://127.0.0.1:${PORT}${rung.path}` };
}

export async function waitForBoot(page) {
  await page.waitForFunction(() => globalThis.__bench?.bootAt !== null, undefined, {
    timeout: 60000
  });
  return page.evaluate(() => ({
    bootAt: globalThis.__bench.bootAt,
    bootMutations: globalThis.__bench.bootMutations
  }));
}
