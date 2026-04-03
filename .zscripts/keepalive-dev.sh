#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=512"

while true; do
  if lsof -i :3000 >/dev/null 2>&1; then
    # Server is running, keep alive with a request
    curl -s -o /dev/null -w "" http://localhost:3000/api/auth/session --max-time 3 2>/dev/null || true
    sleep 10
    continue
  fi
  echo "[$(date '+%H:%M:%S')] Starting dev server..." >> /home/z/my-project/dev.log
  rm -rf .next/cache 2>/dev/null
  bun run dev >> /home/z/my-project/dev.log 2>&1
  echo "[$(date '+%H:%M:%S')] Server died. Restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
done
