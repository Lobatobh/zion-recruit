#!/bin/bash
# Keepalive script for Next.js production server
PROJECT_DIR="/home/z/my-project"
LOG_FILE="$PROJECT_DIR/dev.log"
PID_FILE="$PROJECT_DIR/.zscripts/next.pid"

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
export HOME="/home/z"

cd "$PROJECT_DIR"

while true; do
  # Check if server is running
  RUNNING=false
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      # Check if port is actually responding
      if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200\|302\|304"; then
        RUNNING=true
      fi
    fi
  fi

  if [ "$RUNNING" = false ]; then
    # Kill any leftover
    pkill -f "next start" 2>/dev/null
    sleep 2

    # Remove stale PID
    rm -f "$PID_FILE"

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Next.js server..." >> "$LOG_FILE"

    # Start server
    npx next start -p 3000 >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"

    # Wait and verify
    sleep 5
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200\|302\|304"; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server started successfully (PID: $(cat $PID_FILE))" >> "$LOG_FILE"
    else
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server failed to start" >> "$LOG_FILE"
    fi
  fi

  sleep 15
done
