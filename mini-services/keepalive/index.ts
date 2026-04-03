/**
 * Keepalive Service - Zion Recruit
 * Keeps the Next.js dev server alive by sending periodic HTTP requests.
 * Port: 3001
 */

import http from 'http';

const NEXTJS_URL = 'http://localhost:3000';
const KEEPALIVE_PORT = 3001;
const PING_INTERVAL = 10000; // 10 seconds

function ping(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`${NEXTJS_URL}/api/health`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve(res.statusCode === 200 || res.statusCode === 404);
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log(`[${new Date().toISOString()}] Keepalive service started on port ${KEEPALIVE_PORT}`);
  console.log(`[${new Date().toISOString()}] Pinging ${NEXTJS_URL} every ${PING_INTERVAL / 1000}s`);

  // Start pinging immediately
  setInterval(async () => {
    const ok = await ping();
    if (!ok) {
      console.log(`[${new Date().toISOString()}] Server not responding`);
    }
  }, PING_INTERVAL);

  // Simple HTTP server to show status
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'alive', nextjs: NEXTJS_URL }));
  });

  server.listen(KEEPALIVE_PORT, () => {
    console.log(`[${new Date().toISOString()}] Status endpoint: http://localhost:${KEEPALIVE_PORT}`);
  });
}

main().catch(console.error);
