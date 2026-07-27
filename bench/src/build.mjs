import { spawnSync } from "node:child_process";

import { repoRoot, rungs } from "./config.mjs";

// Benchmarks run against production builds. --base ./ makes the emitted asset URLs
// relative so each dist/ can be served under /dist/<rung>/ by the bench server.
export function buildRungs() {
  for (const rung of rungs.filter((entry) => entry.built)) {
    const result = spawnSync(
      "npm",
      ["--prefix", rung.package, "run", "build", "--", "--base", "./"],
      { cwd: repoRoot, stdio: "inherit" }
    );
    if (result.status !== 0) {
      throw new Error(`Build failed for ${rung.package}`);
    }
  }
}
