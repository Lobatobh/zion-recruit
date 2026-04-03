#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_OPTIONS="--max-old-space-size=2048" npx next start -p 3000 >> /home/z/my-project/dev.log 2>&1
  sleep 3
done
