#!/bin/zsh
set -e
cd /Users/jian/Desktop/OpenClaw-Fix-Desk
PORT="${PORT:-41891}"
URL="http://127.0.0.1:${PORT}"

if lsof -ti tcp:${PORT} >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

nohup npm start >/tmp/openclaw-fix-desk.log 2>&1 &
sleep 1
open "$URL"
echo "OpenClaw Fix Desk started at $URL"
