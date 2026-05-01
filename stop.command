#!/bin/zsh
set -e
PORT="${PORT:-41891}"
PIDS=$(lsof -ti tcp:${PORT} || true)
if [ -n "$PIDS" ]; then
  kill $PIDS
  echo "Stopped OpenClaw Fix Desk on port ${PORT}"
else
  echo "Nothing running on port ${PORT}"
fi
