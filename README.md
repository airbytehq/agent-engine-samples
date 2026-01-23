# Example API Tool Setup

This project demonstrates three approaches for integrating external API tools with Pydantic AI agents.

## Project Structure

### l1-mcp/ (Level 1 - MCP Integration)
Uses **Model Context Protocol (MCP) servers** for tool integration. Tools are loaded from an external MCP server configured via `.mcp.json`.

**Key Features:**
- External tool server via MCP protocol
- Dynamic tool loading
- Configuration-driven approach

### l2-tool/ (Level 2 - Direct Tool Integration)
Directly initializes and registers connector tools within the agent code using closures.

**Key Features:**
- In-memory tool registration
- Direct connector initialization via closures
- Programmatic approach

### l3-tool-di/ (Level 3 - Dependency Injection)
Uses **Pydantic-AI's built-in dependency injection** framework for cleaner tool integration.

**Key Features:**
- Dependencies managed via `AgentDeps` dataclass
- Tools receive connectors via `RunContext[AgentDeps]`
- Centralized dependency creation with `create_deps()` factory
- Better testability and separation of concerns

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
   - Set up the environment for l1-mcp, l2-tool, and l3-tool-di

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

All implementations use the same Gradio chat interface and can be run independently.

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

### Run l3-tool-di (Dependency Injection)
```bash
cd l3-tool-di
./run.sh
```

The Gradio interface will be available at: **http://localhost:8000**