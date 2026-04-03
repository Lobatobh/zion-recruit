#!/bin/bash
# Auto-restart script for Next.js dev server
while true; do
  echo "[$(date)] Starting Next.js dev server..."
  npx next dev -p 3000 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 2s..."
  sleep 2
done
