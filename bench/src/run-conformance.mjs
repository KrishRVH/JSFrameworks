import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PORT, STORAGE_KEY, benchRoot, rungs } from "./config.mjs";

// SPEC.md acceptance checklist driven through a real browser against every rung.
// Documented render-loop drift in 01/03 (see their NOTES.md) is encoded as an
// expectation, so the suite stays green while still reporting the drift.
const EXPECTED_DRIFT = {
  "vanilla-a": ["blur-commit then move", "first click after blur-commit lands"],
  "jquery-a": ["blur-commit then move", "first click after blur-commit lands"]
};

async function checkRung(browser, rung) {
  const base = `http://127.0.0.1:${PORT}${rung.path}`;
  const page = await browser.newPage();
  await page.route("https://code.jquery.com/**", (route) =>
    route.fulfill({
      contentType: "text/javascript; charset=utf-8",
      body: readFileSync(join(benchRoot, "vendor", "jquery-4.0.0.min.js"), "utf8")
    })
  );

  const results = [];
  const check = (name, ok) => results.push({ name, ok });
  const cardsIn = (index) =>
    page.$$eval(`.board .column:nth-child(${index + 1}) .cards .card .card-title`, (els) =>
      els.map((el) => el.textContent)
    );
  const storage = () => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  const settle = () => page.waitForTimeout(150);
  const addTo = async (column, text) => {
    await page.fill(`.board .column:nth-child(${column}) .add-form input`, text);
    await page.click(`.board .column:nth-child(${column}) .add-form button`);
    await settle();
  };
  const editInput = ".board .column:nth-child(1) .card:nth-child(1) input";

  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.goto(base);
  await page.waitForSelector(".board .column");

  check("three columns render", (await page.$$(".board .column")).length === 3);
  check("seed cards render", (await cardsIn(0)).join() === "Read the spec");
  check("total count", (await page.textContent(".count-pill")).trim() === "3 total");

  await addTo(1, "  New task  ");
  check("add trims title", (await cardsIn(0)).includes("New task"));
  check(
    "add clears input",
    (await page.inputValue(".board .column:nth-child(1) .add-form input")) === ""
  );
  await addTo(1, "   ");
  check("empty add ignored", (await cardsIn(0)).length === 2);

  check(
    "left disabled in todo",
    await page.isDisabled(
      ".board .column:nth-child(1) .card:nth-child(1) .card-actions button:nth-child(1)"
    )
  );
  await page.click(
    ".board .column:nth-child(1) .card:nth-child(2) .card-actions button:nth-child(2)"
  );
  check("move right", (await cardsIn(1)).includes("New task"));
  await page.click(
    ".board .column:nth-child(2) .card:nth-child(2) .card-actions button:nth-child(2)"
  );
  check("move right again", (await cardsIn(2)).includes("New task"));
  check(
    "right disabled in done",
    await page.isDisabled(
      ".board .column:nth-child(3) .card:nth-child(2) .card-actions button:nth-child(2)"
    )
  );

  await page.fill(".toolbar input", "spec");
  await page.reload();
  await page.waitForSelector(".board .column");
  check("cards persist across reload", (await cardsIn(2)).includes("New task"));
  check("filter not persisted", (await page.inputValue(".toolbar input")) === "");

  await page.fill(".toolbar input", "SPEC");
  check("filter case-insensitive", (await cardsIn(0)).join() === "Read the spec");
  check(
    "filter empty state",
    (await page.textContent(".board .column:nth-child(2) .cards")).includes("No matching cards")
  );
  await page.fill(".toolbar input", "");

  await page.click(".board .column:nth-child(1) .card:nth-child(1) .card-title-button");
  await page.waitForSelector(editInput);
  check("edit input focused", await page.$eval(editInput, (el) => document.activeElement === el));
  check(
    "edit input selected",
    await page.$eval(editInput, (el) => el.selectionEnd - el.selectionStart === el.value.length)
  );
  await page.fill(editInput, "  Edited title  ");
  await page.keyboard.press("Enter");
  check("enter commits trimmed", (await cardsIn(0)).join() === "Edited title");

  await page.click(".board .column:nth-child(1) .card:nth-child(1) .card-title-button");
  await page.fill(editInput, "Should not appear");
  await page.keyboard.press("Escape");
  check("escape cancels", (await cardsIn(0)).join() === "Edited title");

  await page.click(".board .column:nth-child(1) .card:nth-child(1) .card-title-button");
  await page.fill(editInput, "Blur commit");
  await page.click(".toolbar input");
  check("blur commits", (await cardsIn(0)).join() === "Blur commit");

  await page.click(".board .column:nth-child(1) .card:nth-child(1) .card-title-button");
  await page.fill(editInput, "   ");
  await page.keyboard.press("Enter");
  check("empty commit preserves title", (await cardsIn(0)).join() === "Blur commit");

  await addTo(1, "<img src=x onerror=window.__xss=1>");
  check("xss stays text", (await cardsIn(0)).includes("<img src=x onerror=window.__xss=1>"));
  check("xss did not execute", await page.evaluate(() => typeof globalThis.__xss === "undefined"));
  check("no img injected", (await page.$$(".card img")).length === 0);
  await page.click(
    ".board .column:nth-child(1) .card:nth-child(2) .card-actions button:nth-child(3)"
  );
  check("delete removes card", !(await cardsIn(0)).some((title) => title.includes("<img")));

  await page.click(".board .column:nth-child(1) .card:nth-child(1) .card-title-button");
  await page.waitForSelector(editInput);
  await page.click(
    ".board .column:nth-child(1) .card:nth-child(1) .card-actions button:nth-child(3)"
  );
  check(
    "delete while editing clears edit",
    (await page.$$(".board .column:nth-child(1) .cards input")).length === 0
  );

  await page.click(".toolbar button");
  await settle();
  check("reset restores seed", (await cardsIn(0)).join() === "Read the spec");
  check("reset clears storage", (await storage()) === null);

  await addTo(1, "After reset");
  check("save resumes after reset", ((await storage()) ?? "").includes("After reset"));

  await page.click(".board .column:nth-child(1) .card:nth-child(1) .card-title-button");
  await page.fill(editInput, "draft only");
  check("draft not persisted", !((await storage()) ?? "").includes("draft only"));
  await page.keyboard.press("Escape");

  await page.click(".board .column:nth-child(1) .card:nth-child(2) .card-title-button");
  await page.fill(".board .column:nth-child(1) .card:nth-child(2) input", "moving draft");
  await page.click(
    ".board .column:nth-child(1) .card:nth-child(2) .card-actions button:nth-child(2)"
  );
  await settle();
  check("blur-commit then move", (await cardsIn(1)).includes("moving draft"));

  await addTo(1, "Probe card");
  await page.click(".board .column:nth-child(1) .card:nth-child(1) .card-title-button");
  await page.waitForSelector(editInput);
  await page.click(
    ".board .column:nth-child(1) .card:nth-child(2) .card-actions button:nth-child(3)"
  );
  await settle();
  check("first click after blur-commit lands", !(await cardsIn(0)).includes("Probe card"));

  await page.evaluate(() => localStorage.clear());
  await page.close();
  return results;
}

export async function runConformance(browser, log) {
  const results = [];
  for (const rung of rungs) {
    log(`conformance: ${rung.id}`);
    const checks = await checkRung(browser, rung);
    const drift = EXPECTED_DRIFT[rung.id] ?? [];
    const unexpected = checks.filter((entry) => !(entry.ok || drift.includes(entry.name)));
    results.push({
      id: rung.id,
      passed: checks.filter((entry) => entry.ok).length,
      total: checks.length,
      failures: checks.filter((entry) => !entry.ok).map((entry) => entry.name),
      expectedDrift: drift,
      unexpectedFailures: unexpected.map((entry) => entry.name)
    });
  }
  return results;
}
