import { openRungPage, waitForBoot } from "./browser.mjs";
import { CPU_THROTTLE, SCALING_ITERATIONS, SCALING_OPS, SCALING_SIZES, rungs } from "./config.mjs";
import { makeScenarios } from "./scenarios.mjs";
import { makeBoard } from "./seed.mjs";
import { summarize } from "./stats.mjs";

// Opt-in sweep: the timing methodology repeated across board sizes so latency can be
// plotted against N. Fewer iterations than the main timing phase; this is about the
// shape of the curve, not tight confidence intervals.
export async function runScaling(browser, log) {
  const results = [];
  for (const rung of rungs) {
    const rungResult = {
      id: rung.id,
      throttle: CPU_THROTTLE,
      iterations: SCALING_ITERATIONS,
      sizes: []
    };
    for (const cards of SCALING_SIZES) {
      log(`scaling: ${rung.id} @ ${cards}`);
      const columns = makeBoard(cards);
      const scenarios = makeScenarios(cards).filter((scenario) =>
        SCALING_OPS.includes(scenario.id)
      );
      const { page, url } = await openRungPage(browser, rung, {
        columns,
        expectedCards: cards,
        cpuThrottle: CPU_THROTTLE
      });
      const sizeResult = { cards, boot: null, ops: {} };
      const bootSamples = [];
      for (const scenario of scenarios) {
        const scriptSamples = [];
        for (let iteration = 0; iteration < SCALING_ITERATIONS; iteration += 1) {
          await page.goto(url);
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
        }
        sizeResult.ops[scenario.id] = { script: summarize(scriptSamples) };
      }
      sizeResult.boot = summarize(bootSamples);
      await page.close();
      rungResult.sizes.push(sizeResult);
    }
    results.push(rungResult);
  }
  return results;
}
