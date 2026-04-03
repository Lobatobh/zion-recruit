#!/bin/bash
cd /home/z/my-project
rm -rf .next
exec npx next dev -p 3000
