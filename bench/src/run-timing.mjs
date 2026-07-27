import { openRungPage, waitForBoot } from "./browser.mjs";
import { CPU_THROTTLE, PORT, TIMING_CARDS, TIMING_ITERATIONS, rungs } from "./config.mjs";
import { makeScenarios } from "./scenarios.mjs";
import { makeBoard } from "./seed.mjs";
import { summarize } from "./stats.mjs";

// Interaction latency under CPU_THROTTLE x slowdown on a TIMING_CARDS board.
// `script` = event dispatch until the DOM reflects the result (logical completion,
// mutation-observer resolution). `total` = script + two rAFs, i.e. including the
// following rendered frame. Every iteration reloads so runs are independent; the
// init script re-seeds storage each navigation.
export async function runTiming(browser, log) {
  const columns = makeBoard(TIMING_CARDS);
  const scenarios = makeScenarios(TIMING_CARDS);
  const results = [];

  for (const rung of rungs) {
    log(`timing: ${rung.id}`);
    const { page } = await openRungPage(browser, rung, {
      columns,
      expectedCards: TIMING_CARDS,
      cpuThrottle: CPU_THROTTLE
    });
    const rungResult = {
      id: rung.id,
      cards: TIMING_CARDS,
      throttle: CPU_THROTTLE,
      iterations: TIMING_ITERATIONS,
      boot: null,
      ops: {}
    };
    const bootSamples = [];

    for (const scenario of scenarios) {
      const scriptSamples = [];
      const totalSamples = [];
      for (let iteration = 0; iteration < TIMING_ITERATIONS; iteration += 1) {
        await page.goto(`http://127.0.0.1:${PORT}${rung.path}`);
        const boot = await waitForBoot(page);
        bootSamples.push(boot.bootAt);
        await page.evaluate(() => globalThis.__benchSettle());
        for (const step of scenario.setup ?? []) {
          await page.evaluate((source) => globalThis.__benchRun(source), step);
        }
        const sample = await page.evaluate(
          ([action, predicate]) => globalThis.__benchMeasure(action, predicate),
          [scenario.action, scenario.predicate]
        );
        scriptSamples.push(sample.script);
        totalSamples.push(sample.total);
      }
      rungResult.ops[scenario.id] = {
        script: summarize(scriptSamples),
        total: summarize(totalSamples)
      };
    }
    rungResult.boot = summarize(bootSamples);
    await page.close();
    results.push(rungResult);
  }
  return results;
}
