const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  server.listen(3000, '::', () => {
    console.log('> Ready on http://localhost:3000 (IPv4 + IPv6)');
  });

  // Built-in keepalive: ping self every 30s to stay active in sandbox
  setInterval(() => {
    const req = require('http').get('http://localhost:3000/', (res) => {
      res.resume();
    });
    req.on('error', () => {});
  }, 30000);

  // Handle process signals gracefully
  process.on('SIGTERM', () => {
    console.log('[serve] SIGTERM received, shutting down...');
    server.close(() => process.exit(0));
  });

  process.on('uncaughtException', (err) => {
    console.error('[serve] Uncaught exception:', err.message);
  });

  process.on('unhandledRejection', (err) => {
    console.error('[serve] Unhandled rejection:', err);
  });
});
