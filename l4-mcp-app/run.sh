#!/bin/bash

# MCP Apps Chat Launcher

set -e

echo "=================================="
echo "MCP Apps Chat Launcher"
echo "=================================="
echo ""

# Navigate to the l4-mcp-app directory
cd "$(dirname "$0")"

# Check shared .env file
if [ ! -f ../.env ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env in the project root and configure it"
    exit 1
fi

# Activate shared venv from project root
if [ -d "../.venv" ]; then
    source ../.venv/bin/activate
else
    echo "Error: Shared venv not found at ../.venv/"
    echo "Please run: cd .. && ./setup.sh"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' ../.env | xargs)

# Build the widget MCP server if needed
if [ ! -f "widget-mcp-server/dist/server.mjs" ]; then
    echo "Building widget-mcp-server..."
    cd widget-mcp-server
    npm install
    npm run build
    cd ..
fi

# Check dependencies
echo "Checking dependencies..."
python -c "import pydantic_ai" 2>/dev/null || {
    echo "Error: pydantic-ai not installed"
    echo "Please run: cd .. && ./setup.sh"
    exit 1
}

python -c "import fastapi" 2>/dev/null || {
    echo "Error: fastapi not installed"
    echo "Please run: pip install fastapi uvicorn"
    exit 1
}

echo ""
echo "Starting MCP Apps Chat..."
echo "Available at: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop"
echo "=================================="
echo ""

# Run the FastAPI app from within l4-mcp-app directory
PYTHONPATH="$PWD:$PYTHONPATH" python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
