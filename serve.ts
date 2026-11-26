// HomeLedger local preview server (Node 22, standard library only).
// Serves app/ at http://localhost:8080 so the site can be checked in a
// browser during development: `node serve.ts` (`--port <n>` for another
// port). Development convenience only; the site itself needs no server.

import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL("./app", import.meta.url)));
const argv = process.argv.slice(2);
const portFlagIndex = argv.indexOf("--port");
const requestedPort = portFlagIndex === -1 ? 8080 : Number(argv[portFlagIndex + 1]);
const listenPort = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort < 65536 ? requestedPort : 8080;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  let pathname: string;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    response.writeHead(400).end("bad request");
    return;
  }
  if (pathname.endsWith("/")) pathname += "index.html";
  const filePath = resolve(join(appRoot, normalize(pathname)));
  if (filePath !== appRoot && !filePath.startsWith(appRoot + sep)) {
    response.writeHead(403).end("forbidden");
    return;
  }
  let fileSize: number;
  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) throw new Error("not a file");
    fileSize = stats.size;
  } catch {
    response.writeHead(404).end("not found");
    return;
  }
  response.writeHead(200, {
    "content-type": CONTENT_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "content-length": fileSize,
    "cache-control": "no-store",
  });
  createReadStream(filePath).pipe(response);
}).listen(listenPort, "127.0.0.1", () => {
  console.log(`HomeLedger app/ is served at http://localhost:${listenPort}`);
});
