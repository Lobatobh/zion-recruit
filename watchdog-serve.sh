#!/bin/bash
cd /home/z/my-project
LOG="/home/z/my-project/dev.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Watchdog starting..." >> "$LOG"

while true; do
  # Start server if not running
  if ! pgrep -f "serve.js" > /dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting serve.js..." >> "$LOG"
    NODE_OPTIONS="--max-old-space-size=2048" node serve.js >> "$LOG" 2>&1 &
    SERVER_PID=$!
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Started PID: $SERVER_PID" >> "$LOG"
    sleep 3
  fi
  
  # Keep alive with rapid requests
  for i in $(seq 1 20); do
    sleep 3
    curl -s -m 3 -o /dev/null http://localhost:3000/ 2>/dev/null || true
  done
done
