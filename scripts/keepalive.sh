#!/bin/bash
# Self-healing dev server for Zion Recruit
# Restarts Next.js automatically if it crashes or gets killed

cd /home/z/my-project

while true; do
  echo "[$(date +%H:%M:%S)] Starting Next.js dev server..."
  
  # Clean Turbopack cache on each restart to prevent stale chunks
  rm -rf .next/cache 2>/dev/null
  
  # Start the server
  npx next dev -p 3000 &
  SERVER_PID=$!
  
  # Wait for it to start
  for i in $(seq 1 30); do
    sleep 1
    if ! kill -0 $SERVER_PID 2>/dev/null; then
      echo "[$(date +%H:%M:%S)] Server exited during startup, restarting..."
      break
    fi
    if ss -tlnp | grep -q 3000; then
      echo "[$(date +%H:%M:%S)] Server ready on port 3000 (PID $SERVER_PID)"
      break
    fi
  done
  
  # Keep server alive with periodic requests + monitor
  while kill -0 $SERVER_PID 2>/dev/null; do
    sleep 15
    # Keepalive request to prevent idle timeout
    curl -s -o /dev/null -w "" http://127.0.0.1:3000/ 2>/dev/null &
  done
  
  echo "[$(date +%H:%M:%S)] Server died, restarting in 2s..."
  sleep 2
done
