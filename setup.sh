#!/bin/bash

# Shared Dependencies Setup
# Creates a shared virtual environment for l1-mcp, l2-tool, and l3-tool-di

set -e

echo "=================================="
echo "Shared Dependencies Setup"
echo "=================================="
echo ""

# Check if requirements.txt exists
if [ ! -f requirements.txt ]; then
    echo "Error: requirements.txt not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed"
    echo "Please install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

echo "Using uv with Python 3.13"

# Create virtual environment with uv
echo "Creating virtual environment with uv..."
uv venv --python 3.13

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo ""
echo "Installing dependencies from requirements.txt..."
uv pip install -r requirements.txt

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "  - To run l1-mcp (MCP integration):     cd l1-mcp && ./run.sh"
echo "  - To run l2-tool (Direct tools):       cd l2-tool && ./run.sh"
echo "  - To run l3-tool-di (Dependency Inj):  cd l3-tool-di && ./run.sh"
echo "  - To run l4-mcp-app (MCP App):         cd l4-mcp-app && ./run.sh"
echo ""
echo "Note: Make sure you have a .env file configured at the project root."
echo "=================================="
