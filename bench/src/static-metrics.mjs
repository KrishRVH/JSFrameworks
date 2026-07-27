import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import { repoRoot, rungs } from "./config.mjs";

function fileMetrics(path) {
  const content = readFileSync(path);
  return {
    raw: content.length,
    gzip: gzipSync(content, { level: 9 }).length,
    lines: content
      .toString("utf8")
      .split("\n")
      .filter((line) => line.trim() !== "").length
  };
}

function payloadFiles(rung) {
  if (!rung.built) {
    return rung.payload.map((relative) => join(repoRoot, relative));
  }
  const assets = join(repoRoot, rung.package, "dist", "assets");
  return readdirSync(assets)
    .filter((name) => name.endsWith(".js"))
    .map((name) => join(assets, name));
}

// Shipped JS (raw + gzip) versus authored app code (non-shared sources). CSS is
// identical across rungs and excluded everywhere; shared/*.js counts as payload for
// the unbuilt rungs because they ship it verbatim, while built rungs bundle it.
export function collectStaticMetrics() {
  return rungs.map((rung) => {
    const payload = payloadFiles(rung).reduce(
      (total, path) => {
        const metrics = fileMetrics(path);
        return { raw: total.raw + metrics.raw, gzip: total.gzip + metrics.gzip };
      },
      { raw: 0, gzip: 0 }
    );
    const authored = rung.sources.reduce(
      (total, relative) => {
        const metrics = fileMetrics(join(repoRoot, relative));
        return { bytes: total.bytes + metrics.raw, lines: total.lines + metrics.lines };
      },
      { bytes: 0, lines: 0 }
    );
    return { id: rung.id, payload, authored };
  });
}
