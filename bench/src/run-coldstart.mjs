import { openRungPage, waitForBoot } from "./browser.mjs";
import {
  COLDSTART_CARDS,
  COLDSTART_ITERATIONS,
  COLDSTART_NETWORK,
  CPU_THROTTLE,
  PORT,
  rungs
} from "./config.mjs";
import { makeBoard } from "./seed.mjs";

// Cold load under Fast-3G-ish network emulation and CPU throttling, HTTP cache
// disabled, fresh page per iteration. Segments: HTML arrival, JS transfer complete,
// then parse/execute/render until the seeded board is on screen. jQuery goes through
// the same emulated network because the bench server rewrites the CDN URL to a local
// path. The iteration with the median total is reported so segments stay coherent.
export async function runColdstart(browser, log) {
  const columns = makeBoard(COLDSTART_CARDS);
  const results = [];
  for (const rung of rungs) {
    log(`coldstart: ${rung.id}`);
    const iterations = [];
    for (let iteration = 0; iteration < COLDSTART_ITERATIONS; iteration += 1) {
      const { page, session } = await openRungPage(browser, rung, {
        columns,
        expectedCards: COLDSTART_CARDS,
        cpuThrottle: CPU_THROTTLE
      });
      await session.send("Network.enable");
      await session.send("Network.setCacheDisabled", { cacheDisabled: true });
      await session.send("Network.emulateNetworkConditions", COLDSTART_NETWORK);
      await page.goto(`http://127.0.0.1:${PORT}${rung.path}`);
      const boot = await waitForBoot(page);
      const resources = await page.evaluate(() => {
        const [nav] = performance.getEntriesByType("navigation");
        const scripts = performance
          .getEntriesByType("resource")
          .filter((entry) => /\.m?js(\?|$)/.test(entry.name));
        return {
          htmlEnd: nav.responseEnd,
          jsEnd: Math.max(nav.responseEnd, ...scripts.map((entry) => entry.responseEnd)),
          transferred:
            (nav.transferSize ?? 0) +
            scripts.reduce((total, entry) => total + (entry.transferSize ?? 0), 0)
        };
      });
      await page.close();
      iterations.push({
        html: resources.htmlEnd,
        js: Math.max(0, resources.jsEnd - resources.htmlEnd),
        render: Math.max(0, boot.bootAt - resources.jsEnd),
        total: boot.bootAt,
        transferred: resources.transferred
      });
    }
    iterations.sort((a, b) => a.total - b.total);
    const median = iterations[Math.floor(iterations.length / 2)];
    results.push({
      id: rung.id,
      cards: COLDSTART_CARDS,
      throttle: CPU_THROTTLE,
      network: "fast-3g",
      ...median
    });
  }
  return results;
}
