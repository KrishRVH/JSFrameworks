import { openRungPage, waitForBoot } from "./browser.mjs";
import { CHURN_CARDS, rungs } from "./config.mjs";
import { makeScenarios } from "./scenarios.mjs";
import { makeBoard } from "./seed.mjs";

// DOM mutation ledger: how many node insertions/removals, attribute writes, and text
// writes each strategy performs per user action. Deterministic, so each op runs twice
// and mismatches are flagged instead of averaged away.
export async function runChurn(browser, log) {
  const columns = makeBoard(CHURN_CARDS);
  const scenarios = makeScenarios(CHURN_CARDS);
  const results = [];

  for (const rung of rungs) {
    log(`churn: ${rung.id}`);
    const { page } = await openRungPage(browser, rung, {
      columns,
      expectedCards: CHURN_CARDS,
      deepCount: true
    });
    const rungResult = { id: rung.id, cards: CHURN_CARDS, boot: null, ops: {} };

    for (const scenario of scenarios) {
      log(`churn: ${rung.id} ${scenario.id}`);
      const samples = [];
      for (let iteration = 0; iteration < 2; iteration += 1) {
        await page.goto(`http://127.0.0.1:4600${rung.path}`);
        const boot = await waitForBoot(page);
        rungResult.boot = boot.bootMutations;
        await page.evaluate(() => globalThis.__benchSettle());
        for (const step of scenario.setup ?? []) {
          await page.evaluate((source) => globalThis.__benchRun(source), step);
        }
        samples.push(
          await page.evaluate((source) => globalThis.__benchChurn(source), scenario.action)
        );
      }
      const [first, second] = samples;
      rungResult.ops[scenario.id] = {
        ...first,
        deterministic: JSON.stringify(first) === JSON.stringify(second)
      };
    }
    await page.close();
    results.push(rungResult);
  }
  return results;
}
