import { openRungPage, waitForBoot } from "./browser.mjs";
import { WORKDAY_CARDS, WORKDAY_ROUNDS, rungs } from "./config.mjs";
import { makeWorkday } from "./scenarios.mjs";
import { makeBoard } from "./seed.mjs";

async function metricsSnapshot(session) {
  const { metrics } = await session.send("Performance.getMetrics");
  return Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
}

// Cumulative CPU accounting for a fixed ~110-action editing session, measured
// unthrottled via CDP Performance metrics (durations are in seconds). The diff
// isolates the session: Performance.enable happens after boot has settled. Idle
// time between settled actions contributes nothing to task durations, so this is
// "where does the CPU go", not wall clock.
export async function runWorkday(browser, log) {
  const columns = makeBoard(WORKDAY_CARDS);
  const steps = makeWorkday(WORKDAY_ROUNDS);
  const results = [];
  for (const rung of rungs) {
    log(`workday: ${rung.id}`);
    const { page, session, url } = await openRungPage(browser, rung, {
      columns,
      expectedCards: WORKDAY_CARDS
    });
    await page.goto(url);
    await waitForBoot(page);
    await page.evaluate(() => globalThis.__benchSettle());
    await session.send("Performance.enable");
    const before = await metricsSnapshot(session);
    for (const step of steps) {
      await page.evaluate((source) => globalThis.__benchRun(source), step);
    }
    const after = await metricsSnapshot(session);
    await page.close();
    results.push({
      id: rung.id,
      cards: WORKDAY_CARDS,
      actions: steps.length,
      script: after.ScriptDuration - before.ScriptDuration,
      style: after.RecalcStyleDuration - before.RecalcStyleDuration,
      layout: after.LayoutDuration - before.LayoutDuration,
      task: after.TaskDuration - before.TaskDuration
    });
  }
  return results;
}
