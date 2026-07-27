import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

import { PORT, repoRoot } from "./config.mjs";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".map": "application/json; charset=utf-8"
};

const DIST_PREFIXES = {
  "/dist/react/": "05-react/dist",
  "/dist/svelte/": "06-svelte/dist",
  "/dist/solid/": "07-solid/dist"
};

function resolvePath(urlPath) {
  for (const [prefix, distDir] of Object.entries(DIST_PREFIXES)) {
    if (urlPath.startsWith(prefix)) {
      return join(repoRoot, distDir, urlPath.slice(prefix.length) || "index.html");
    }
  }
  return join(repoRoot, urlPath);
}

export function startServer() {
  const server = createServer((request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
    let urlPath = normalize(decodeURIComponent(url.pathname));
    if (urlPath.endsWith("/")) {
      urlPath += "index.html";
    }
    let filePath = resolve(resolvePath(urlPath));
    if (!filePath.startsWith(repoRoot)) {
      response.writeHead(403).end();
      return;
    }
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, "index.html");
    }
    if (!existsSync(filePath)) {
      response.writeHead(404).end("not found");
      return;
    }
    response.writeHead(200, {
      "content-type": MIME[extname(filePath)] ?? "application/octet-stream",
      "cache-control": "no-store"
    });
    createReadStream(filePath).pipe(response);
  });
  return new Promise((resolvePromise) => {
    server.listen(PORT, "127.0.0.1", () => resolvePromise(server));
  });
}
