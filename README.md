# Example API Tool Setup

This project demonstrates two approaches for integrating external API tools with Pydantic AI agents.

## Project Structure

### l1-mcp/ (Level 1 - MCP Integration)
Uses **Model Context Protocol (MCP) servers** for tool integration. Tools are loaded from an external MCP server configured via `.mcp.json`.

**Key Features:**
- External tool server via MCP protocol
- Dynamic tool loading
- Configuration-driven approach

### l2-tool/ (Level 2 - Direct Tool Integration)
Directly initializes and registers connector tools within the agent code.

**Key Features:**
- In-memory tool registration
- Direct connector initialization
- Programmatic approach

## Setup

### Prerequisites
- Python 3.12 or higher
- Environment variables configured (see below)

### Installation

1. Clone or navigate to the project directory:
   ```bash
   cd /path/to/example-api-tool-setup
   ```

2. Run the setup script to create the shared virtual environment:
   ```bash
   ./setup.sh
   ```

   This will:
   - Create a shared `venv/` directory at the project root
   - Install all required dependencies
   - Set up the environment for both l1-mcp and l2-tool

### Environment Configuration

Both implementations share a single `.env` file at the project root. Copy the `.env.example` file as a starting point:

```bash
cp .env.example .env
# Edit .env and add your API keys
```

Required environment variables:
- `ANTHROPIC_API_KEY` - Claude API key
- `GONG_ACCESS_KEY` - Gong API access key
- `GONG_ACCESS_KEY_SECRET` - Gong API secret
- `LANGSMITH_*` - (Optional) LangSmith tracing configuration
- `AIRBYTE_*` - Airbyte configuration for l2-tool direct integration

## Running the Applications

Both implementations use the same Gradio chat interface and can be run independently.

### Run l1-mcp (MCP Integration)
```bash
cd l1-mcp
./run.sh
```

### Run l2-tool (Direct Tools)
```bash
cd l2-tool
./run.sh
```

The Gradio interface will be available at: **http://localhost:8000**