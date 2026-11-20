#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { exportLeaderboard } from './leaderboard.js';

const args = process.argv.slice(2);

// Check if exporting leaderboard: <run_cmd> --export-leaderboard out.json
const exportIdx = args.indexOf('--export-leaderboard');
if (exportIdx !== -1 && exportIdx + 1 < args.length) {
  const outPath = args[exportIdx + 1];
  exportLeaderboard(outPath);
  console.log(`Leaderboard exported to ${outPath}`);
  process.exit(0);
}

// Otherwise start web server
const PORT = process.env.PORT || 3000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/src/index.html';
  if (reqPath === '/src' || reqPath === '/src/') reqPath = '/src/index.html';

  const fullPath = path.resolve(process.cwd(), `.${reqPath}`);
  const ext = path.extname(fullPath).toLowerCase();

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Đảo Đèn Lồng running at http://localhost:${PORT}/src/`);
});
