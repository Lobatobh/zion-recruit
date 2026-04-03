#!/bin/bash
# Keep Next.js dev server alive
while true; do
  if ! pgrep -f "next dev" > /dev/null 2>&1; then
    echo "[$(date)] Server died, restarting..." >> /home/z/my-project/dev.log
    cd /home/z/my-project
    nohup bun run dev >> /home/z/my-project/dev.log 2>&1 &
    echo "[$(date)] Restarted PID: $!" >> /home/z/my-project/dev.log
  fi
  # Keep making requests to prevent idle crash
  curl -s -o /dev/null http://localhost:3000/api/health 2>/dev/null
  sleep 3
done
