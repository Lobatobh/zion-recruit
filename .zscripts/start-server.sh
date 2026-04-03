#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Next.js..."
  npx next start -p 3000 2>&1
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server exited. Restarting in 3s..."
  sleep 3
done
