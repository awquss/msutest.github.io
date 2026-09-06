#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || process.argv[2] || 8081);

const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function resolveRequestPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0] || "/");
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const resolved = path.resolve(root, path.normalize(relativePath));
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return null;
  }
  return resolved;
}

function serveFile(req, res, filePath, stat) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeByExt[ext] || "application/octet-stream";
  const range = req.headers.range;

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", contentType);

  if (!range) {
    res.writeHead(200, { "Content-Length": stat.size });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
    res.end();
    return;
  }

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : stat.size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= stat.size) {
    res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
    res.end();
    return;
  }

  const safeEnd = Math.min(end, stat.size - 1);
  res.writeHead(206, {
    "Content-Length": safeEnd - start + 1,
    "Content-Range": `bytes ${start}-${safeEnd}/${stat.size}`
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(filePath, { start, end: safeEnd }).pipe(res);
}

const server = http.createServer((req, res) => {
  const filePath = resolveRequestPath(req.url || "/");
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    serveFile(req, res, filePath, stat);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`MSU web server: http://127.0.0.1:${port}/`);
});
