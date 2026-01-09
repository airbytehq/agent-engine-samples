#!/bin/bash

# Shared Dependencies Setup
# Creates a shared virtual environment for both l1-mcp and l2-tool

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

# Check Python version
PYTHON_CMD=""
if command -v python3.12 &> /dev/null; then
    PYTHON_CMD="python3.12"
elif command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
elif command -v python3.10 &> /dev/null; then
    PYTHON_CMD="python3.10"
else
    echo "Error: Python 3.10 or higher is required for pydantic-ai"
    echo "Current python3 version: $(python3 --version)"
    echo "Please install Python 3.10+ or use pyenv:"
    echo "  pyenv install 3.12"
    echo "  pyenv local 3.12"
    exit 1
fi

echo "Using Python: $PYTHON_CMD ($(${PYTHON_CMD} --version))"

# Create virtual environment
echo "Creating virtual environment..."
$PYTHON_CMD -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo ""
echo "Installing dependencies from requirements.txt..."
pip install -r requirements.txt

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "  - To run l1-mcp (MCP integration):  cd l1-mcp && ./run.sh"
echo "  - To run l2-tool (Direct tools):    cd l2-tool && ./run.sh"
echo ""
echo "Note: Make sure you have a .env file configured in each directory."
echo "=================================="
