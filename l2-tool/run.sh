#!/bin/bash

# Gradio Chat Launcher

set -e

echo "=================================="
echo "Gradio Chat Launcher"
echo "=================================="
echo ""

# Check shared .env file
if [ ! -f ../.env ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env in the project root and configure it"
    exit 1
fi

# Activate shared venv from project root
if [ -d "../venv" ]; then
    source ../venv/bin/activate
else
    echo "Error: Shared venv not found at ../venv/"
    echo "Please run: cd .. && ./setup.sh"
    exit 1
fi

# Check dependencies
echo "Checking dependencies..."
python -c "import pydantic_ai" 2>/dev/null || {
    echo "Error: pydantic-ai not installed"
    echo "Please run: cd .. && ./setup.sh"
    exit 1
}

python -c "import airbyte_agent_gong" 2>/dev/null || {
    echo "Error: airbyte-agent-gong not installed"
    echo "Please run: cd .. && ./setup.sh"
    exit 1
}

python -c "import airbyte_agent_hubspot" 2>/dev/null || {
    echo "Error: airbyte-agent-hubspot not installed"
    echo "Please run: cd .. && ./setup.sh"
    exit 1
}

python -c "import gradio" 2>/dev/null || {
    echo "Error: gradio not installed"
    echo "Please run: cd .. && ./setup.sh"
    exit 1
}

echo ""
echo "Starting Gradio Chat..."
echo "Available at: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop"
echo "=================================="
echo ""

# Run the app
python -m src.chat
