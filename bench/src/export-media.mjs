import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { launchBrowser } from "./browser.mjs";
import { benchRoot } from "./config.mjs";

// Exports the README's chart images from the generated report, in both themes, at
// 2x for crisp rendering on GitHub. Run after `npm run report` when results change.
const targets = [
  {
    name: "write-ledger",
    locate: (page) =>
      page
        .locator("section", { has: page.locator("h2", { hasText: "DOM write ledger" }) })
        .locator("table.heatmap")
  },
  {
    name: "amplification",
    locate: (page) =>
      page
        .locator("section", { has: page.locator("h2", { hasText: "Write amplification" }) })
        .locator("figure")
  },
  {
    name: "scaling",
    locate: (page) => page.locator("section", { has: page.locator("h2", { hasText: "Scaling" }) })
  },
  {
    name: "workday",
    locate: (page) =>
      page
        .locator("section", { has: page.locator("h2", { hasText: "Cost of a workday" }) })
        .locator("figure")
  },
  {
    name: "coldstart",
    locate: (page) =>
      page
        .locator("section", { has: page.locator("h2", { hasText: "Cold start" }) })
        .locator("figure")
  },
  {
    name: "author-vs-user",
    locate: (page) => page.locator("figure.wide", { hasText: "Authored lines" })
  }
];

const mediaDir = join(benchRoot, "report", "media");
mkdirSync(mediaDir, { recursive: true });

const browser = await launchBrowser();
for (const theme of ["light", "dark"]) {
  const page = await browser.newPage({
    viewport: { width: 1140, height: 900 },
    deviceScaleFactor: 2
  });
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(`file://${join(benchRoot, "report", "index.html")}`);
  for (const target of targets) {
    await target.locate(page).screenshot({ path: join(mediaDir, `${target.name}-${theme}.png`) });
    process.stderr.write(`media: ${target.name}-${theme}.png\n`);
  }
  await page.close();
}
await browser.close();
