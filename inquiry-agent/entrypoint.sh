#!/usr/bin/env bash
set -e

MODE="${1:-all}"

echo "Starting Eximple Voice Agent Container in mode: ${MODE}"

if [ "${MODE}" = "backend" ]; then
    echo "Starting FastAPI Backend on port 8000..."
    exec uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000

elif [ "${MODE}" = "agent" ]; then
    echo "Starting LiveKit Agent Worker (production mode)..."
    exec uv run python -m agent.main run

elif [ "${MODE}" = "all" ]; then
    echo "Starting both FastAPI Backend and LiveKit Agent Worker..."
    
    # Start Backend in background
    uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    
    # Wait for backend to be ready
    sleep 2
    
    # Start Agent in foreground
    uv run python -m agent.main run &
    AGENT_PID=$!

    # Trap termination signals to gracefully shut down both processes
    trap "echo 'Stopping container processes...'; kill -TERM $BACKEND_PID $AGENT_PID 2>/dev/null; wait" SIGINT SIGTERM
    
    # Wait for either process to exit
    wait -n $BACKEND_PID $AGENT_PID
    EXIT_STATUS=$?
    
    echo "A service process exited with code $EXIT_STATUS. Shutting down container."
    kill -TERM $BACKEND_PID $AGENT_PID 2>/dev/null || true
    exit $EXIT_STATUS

else
    # Allow arbitrary commands (e.g. bash, testing)
    exec "$@"
fi
