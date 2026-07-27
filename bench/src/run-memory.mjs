import { openRungPage, waitForBoot } from "./browser.mjs";
import { MEMORY_CARDS_LARGE, MEMORY_CARDS_SMALL, rungs } from "./config.mjs";
import { makeBoard } from "./seed.mjs";

async function metricsAt(browser, rung, cardCount) {
  const { page, session, url } = await openRungPage(browser, rung, {
    columns: makeBoard(cardCount),
    expectedCards: cardCount
  });
  await page.goto(url);
  await waitForBoot(page);
  await page.evaluate(() => globalThis.__benchSettle());
  await session.send("HeapProfiler.enable");
  await session.send("HeapProfiler.collectGarbage");
  await session.send("HeapProfiler.collectGarbage");
  await session.send("Performance.enable");
  const { metrics } = await session.send("Performance.getMetrics");
  const byName = Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
  await page.close();
  return {
    heap: byName.JSHeapUsedSize,
    listeners: byName.JSEventListeners,
    nodes: byName.Nodes
  };
}

// Heap after boot at two board sizes gives retained bytes per card; the Nodes and
// JSEventListeners counters expose per-framework DOM overhead (anchor comments) and
// listener strategy (delegation vs per-node) on identical markup.
export async function runMemory(browser, log) {
  const results = [];
  for (const rung of rungs) {
    log(`memory: ${rung.id}`);
    const small = await metricsAt(browser, rung, MEMORY_CARDS_SMALL);
    const large = await metricsAt(browser, rung, MEMORY_CARDS_LARGE);
    results.push({
      id: rung.id,
      small: { cards: MEMORY_CARDS_SMALL, ...small },
      large: { cards: MEMORY_CARDS_LARGE, ...large },
      retainedPerCard: (large.heap - small.heap) / (MEMORY_CARDS_LARGE - MEMORY_CARDS_SMALL)
    });
  }
  return results;
}
