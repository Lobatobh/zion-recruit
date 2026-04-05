const { spawn } = require('child_process');
const http = require('http');

let serverProc = null;

function startServer() {
  if (serverProc) {
    try { serverProc.kill('SIGTERM'); } catch(e) {}
  }
  
  serverProc = spawn('node', ['serve.js'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });
  
  serverProc.stdout.on('data', d => process.stdout.write(d));
  serverProc.stderr.on('data', d => process.stderr.write(d));
  
  serverProc.on('exit', (code) => {
    console.log(`Server exited with code ${code}, restarting in 1s...`);
    setTimeout(startServer, 1000);
  });
  
  console.log(`Started server PID: ${serverProc.pid}`);
}

// Create a simple HTTP server to keep this process "busy"
const keepalive = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('keepalive');
});
keepalive.listen(19999, '127.0.0.1', () => {
  console.log('Keepalive on :19999');
});

startServer();

// Self-ping every 2s
setInterval(() => {
  http.get('http://127.0.0.1:19999/', (res) => {
    res.resume();
  }).on('error', () => {});
}, 2000);
