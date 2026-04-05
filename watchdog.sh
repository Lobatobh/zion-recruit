#!/bin/bash
cd /home/z/my-project
LOG="/home/z/my-project/dev.log"

while true; do
  # Check if next is already running
  if ! pgrep -f "next-server" > /dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Next.js production server..." >> "$LOG"
    NODE_OPTIONS="--max-old-space-size=2048" nohup npx next start -p 3000 -H 0.0.0.0 >> "$LOG" 2>&1 &
    sleep 5
  fi
  
  # Keep alive with periodic requests
  for i in $(seq 1 15); do
    sleep 4
    curl -s -m 5 -o /dev/null http://localhost:3000/ 2>/dev/null || true
  done
done
