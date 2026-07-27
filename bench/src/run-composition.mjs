import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { repoRoot, rungs } from "./config.mjs";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeSegment(segment) {
  const fields = [];
  let result = 0;
  let shift = 0;
  for (const char of segment) {
    const digit = B64.indexOf(char);
    result |= (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
    } else {
      const negative = result & 1;
      result >>>= 1;
      fields.push(negative ? -result : result);
      result = 0;
      shift = 0;
    }
  }
  return fields;
}

// Walks the sourcemap mappings and charges each span of generated code to the source
// file it came from. Spans with no mapping (rollup/vite runtime glue) are counted
// separately rather than guessed.
function attributeBytes(code, map) {
  const lines = code.split("\n");
  const bySource = new Array(map.sources.length).fill(0);
  let unmapped = 0;
  let sourceIndex = 0;
  const mappingLines = map.mappings.split(";");
  for (let line = 0; line < lines.length; line += 1) {
    const lineLength = lines[line].length;
    const segments = [];
    let generatedColumn = 0;
    for (const segment of (mappingLines[line] ?? "").split(",")) {
      if (!segment) {
        continue;
      }
      const fields = decodeSegment(segment);
      generatedColumn += fields[0];
      if (fields.length >= 4) {
        sourceIndex += fields[1];
        segments.push({ column: generatedColumn, source: sourceIndex });
      } else {
        segments.push({ column: generatedColumn, source: -1 });
      }
    }
    if (!segments.length) {
      unmapped += lineLength;
      continue;
    }
    unmapped += segments[0].column;
    for (let index = 0; index < segments.length; index += 1) {
      const end = index + 1 < segments.length ? segments[index + 1].column : lineLength;
      const span = Math.max(0, end - segments[index].column);
      if (segments[index].source >= 0) {
        bySource[segments[index].source] += span;
      } else {
        unmapped += span;
      }
    }
  }
  return { bySource, unmapped };
}

function classify(sourcePath) {
  if (sourcePath.includes("node_modules")) {
    return "framework";
  }
  if (sourcePath.includes("/shared/")) {
    return "shared";
  }
  if (sourcePath.includes("/src/")) {
    return "app";
  }
  return "glue";
}

function builtComposition(rung) {
  const result = spawnSync(
    "npm",
    [
      "--prefix",
      rung.package,
      "run",
      "build",
      "--",
      "--base",
      "./",
      "--sourcemap",
      "--outDir",
      "dist/mapbuild"
    ],
    { cwd: repoRoot, stdio: "ignore" }
  );
  if (result.status !== 0) {
    throw new Error(`Sourcemap build failed for ${rung.package}`);
  }
  const assets = join(repoRoot, rung.package, "dist", "mapbuild", "assets");
  const segments = { framework: 0, shared: 0, app: 0, glue: 0 };
  for (const name of readdirSync(assets).filter((file) => file.endsWith(".js"))) {
    const code = readFileSync(join(assets, name), "utf8").replace(
      /\n\/\/# sourceMappingURL=.*\n?$/,
      ""
    );
    const map = JSON.parse(readFileSync(join(assets, `${name}.map`), "utf8"));
    const { bySource, unmapped } = attributeBytes(code, map);
    segments.glue += unmapped;
    map.sources.forEach((source, index) => {
      segments[classify(source)] += bySource[index];
    });
  }
  return segments;
}

function staticComposition(rung) {
  const size = (relative) => readFileSync(join(repoRoot, relative)).length;
  return {
    framework: rung.jquery ? size("bench/vendor/jquery-4.0.0.min.js") : 0,
    shared: size("shared/actions.js") + size("shared/seed.js"),
    app: size(rung.sources[0]),
    glue: 0
  };
}

// Where the shipped bytes come from: the framework itself, the shared helpers, the
// rung's own code, or bundler glue. Built rungs are attributed via sourcemaps on a
// dedicated --sourcemap build; static rungs ship their sources verbatim, so plain
// file sizes are exact. Uncompressed bytes in both cases.
export function collectComposition(log) {
  return rungs.map((rung) => {
    log(`composition: ${rung.id}`);
    const segments = rung.built ? builtComposition(rung) : staticComposition(rung);
    return {
      id: rung.id,
      segments,
      total: Object.values(segments).reduce((sum, value) => sum + value, 0)
    };
  });
}
