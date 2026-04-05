#!/bin/bash
# Persistent server wrapper - restarts serve.js whenever it dies
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=1024"

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting serve.js..."
  node /home/z/my-project/serve.js 2>&1
  EXIT_CODE=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] serve.js exited (code=$EXIT_CODE). Restarting in 1s..."
  sleep 1
done
