#!/bin/bash
cd /home/z/my-project

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Next.js dev server..." >> dev.log
  NODE_OPTIONS="--max-old-space-size=2048" npx next dev --port 3000 >> dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Exited with code $EXIT_CODE. Restarting in 2s..." >> dev.log
  sleep 2
done
