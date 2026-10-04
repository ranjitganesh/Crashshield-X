#!/usr/bin/env bash
echo "==============================================================================="
echo "  CRASHSHIELD X: Resource-Transition Graph Adaptive Process Instability Detection"
echo "==============================================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start backend
echo "Starting Backend on port 8000..."
cd "$SCRIPT_DIR/backend"
PYTHONPATH="$SCRIPT_DIR" python run.py &
BACKEND_PID=$!

# Start frontend
echo "Starting Frontend on port 5173..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "Systems active: Frontend http://localhost:5173 | Backend http://localhost:8000"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
