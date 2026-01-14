"""
Agent Setup Module

Handles agent initialization and tool registration.
"""

import os
import json
from pathlib import Path
from datetime import datetime
from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.messages import FunctionToolCallEvent
from langsmith import traceable
from airbyte_agent_gong import GongConnector
from airbyte_agent_hubspot import HubspotConnector


def _load_system_prompt() -> str:
    """Load system prompt from file."""
    prompt_path = Path(__file__).parent / "system_prompt.txt"
    return prompt_path.read_text().strip()

def create_agent() -> Agent:
    """
    Create and configure the Pydantic AI agent.

    Returns:
        Agent: Configured Pydantic AI agent
    """
    model = AnthropicModel("claude-sonnet-4-5-20250929")
    system_prompt = _load_system_prompt()

    agent = Agent(
        model=model,
        # deps_type=Union[GongConnector, HubspotConnector],
        system_prompt=system_prompt,
        retries=10,  # Allow up to 10 tool call iterations before stopping
        event_stream_handler=log_tool_calls  # Log tool calls to terminal
    )

    return agent

def register_generic_tools(agent: Agent):
    @agent.tool_plain
    @traceable(name="get_current_date")
    def get_current_date() -> str:
        """
        Get the current date and time.

        Returns:
            str: Current date and time in ISO format
        """
        return datetime.now().isoformat()
    
########### Add Gong Connector

def register_gong_tools(agent: Agent):
    # Get Airbyte credentials from environment
    airbyte_client_id = os.getenv("AIRBYTE_CLIENT_ID")
    airbyte_client_secret = os.getenv("AIRBYTE_CLIENT_SECRET")
    external_user_id = os.getenv("EXTERNAL_USER_ID", "customer-workspace")

    # Initialize connector
    connector = GongConnector(
        external_user_id=external_user_id,
        airbyte_client_id=airbyte_client_id,
        airbyte_client_secret=airbyte_client_secret
    )

    # @agent.tool_plain
    # @traceable(name="gong_users_list")
    # async def gong_users_list():
    #     '''
    #     Use this tool instead of the other tool for general execute when specifically retrieving lists of users from Gong.
    #     '''
    #     return await connector.users.list()

    # @agent.tool_plain
    # @traceable(name="gong_users_get")
    # async def gong_users_get(id: str):
    #     '''
    #     Use this tool instead of general execute specifically retrieving more info on one user from Gong. To get the ID's, use gong_user_list.
    #     '''
    #     return await connector.users.get(id)

    @agent.tool_plain
    @GongConnector.describe
    @traceable(name="gong_execute")
    async def gong_execute(entity: str, action: str, params: dict | None = None):
        return await connector.execute(entity, action, params or {})

########### Add Hubspot Connector

def register_hubspot_tools(agent: Agent):
    # Get Airbyte credentials from environment
    airbyte_client_id = os.getenv("AIRBYTE_CLIENT_ID")
    airbyte_client_secret = os.getenv("AIRBYTE_CLIENT_SECRET")
    external_user_id = os.getenv("EXTERNAL_USER_ID", "customer-workspace")

    # Initialize connector
    connector = HubspotConnector(
        external_user_id=external_user_id,
        airbyte_client_id=airbyte_client_id,
        airbyte_client_secret=airbyte_client_secret
    )

    @agent.tool_plain
    @HubspotConnector.describe
    @traceable(name="hubspot_execute")
    async def hubspot_execute(entity: str, action: str, params: dict | None = None):
        return await connector.execute(entity, action, params or {})
    
############### 

async def log_tool_calls(ctx, events):
    """
    Event stream handler that logs tool calls to the terminal.

    Displays tool name and parameters in an easy-to-read format with colors.
    """
    # ANSI color codes
    CYAN = "\033[96m"
    MAGENTA = "\033[95m"
    YELLOW = "\033[93m"
    GREEN = "\033[92m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

    async for event in events:
        if isinstance(event, FunctionToolCallEvent):
            # Extract tool name and args
            tool_name = event.part.tool_name
            args = event.part.args_as_dict() if event.part.args else {}

            # Pretty print to terminal with colors
            print(f"\n{CYAN}{'='*50}{RESET}")
            print(f"{BOLD}{MAGENTA}🔧 [TOOL CALL]{RESET} {BOLD}{GREEN}{tool_name}{RESET}")
            print(f"{CYAN}{'-'*50}{RESET}")
            print(f"{YELLOW}Parameters:{RESET}")
            print(json.dumps(args, indent=2))
            print(f"{CYAN}{'='*50}{RESET}\n")
