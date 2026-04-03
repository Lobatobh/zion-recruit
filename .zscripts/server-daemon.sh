#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=512"

while true; do
  if lsof -i :3000 >/dev/null 2>&1; then
    sleep 5
    continue
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Next.js server..." >> /home/z/my-project/dev.log
  npx next start -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Exited. Restarting in 5s..." >> /home/z/my-project/dev.log
  sleep 5
done
