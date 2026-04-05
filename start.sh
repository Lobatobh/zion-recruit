#!/bin/bash
cd /home/z/my-project

cleanup() {
  kill $NODE_PID 2>/dev/null
  exit
}
trap cleanup SIGTERM SIGINT

while true; do
  node serve.js 2>&1 &
  NODE_PID=$!
  
  # Keepalive: hit the server every 2 seconds to prevent sandbox from killing it
  while kill -0 $NODE_PID 2>/dev/null; do
    curl -s -m 3 -o /dev/null http://localhost:3000/ 2>/dev/null
    sleep 2
  done
  
  # Brief pause before restart
  sleep 1
done
