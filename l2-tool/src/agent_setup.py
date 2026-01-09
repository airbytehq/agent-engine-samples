"""
Agent Setup Module

Handles agent initialization and tool registration.
"""

from pathlib import Path
from typing import Union
from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.mcp import load_mcp_servers
from langsmith import traceable
from airbyte_agent_gong import GongConnector
from airbyte_agent_gong._vendored.connector_sdk.decorators import airbyte_description
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
        deps_type=Union[GongConnector, HubspotConnector],
        system_prompt=system_prompt,
        retries=10  # Allow up to 10 tool call iterations before stopping
    )

    return agent

def register_gong_tools(agent: Agent, connector: GongConnector):
    @agent.tool_plain
    @traceable(name="gong_users_list")
    async def gong_users_list():
        '''
        Use this tool instead of the other tool for general execute when specifically retrieving lists of users from Gong.
        '''
        print("This is listing all users")

        return await connector.users.list()

    @agent.tool_plain
    @traceable(name="gong_users_get")
    async def gong_users_get(id: str):
        '''
        Use this tool instead of general execute specifically retrieving more info on one user from Gong. To get the ID's, use gong_user_list.
        '''
        print("This is a request for more info on one user")

        return await connector.users.get(id)

#     # @agent.tool_plain
#     # @airbyte_description("gong")
#     # @traceable(name="gong_execute")
#     # async def gong_execute(entity: str, action: str, params: dict | None = None):
#     #     return await connector.execute(entity, action, params or {})


def register_hubspot_tools(agent: Agent, connector: HubspotConnector):
    @agent.tool_plain
    @airbyte_description("hubspot")
    @traceable(name="hubspot_execute")
    async def hubspot_execute(entity: str, action: str, params: dict | None = None):
        return await connector.execute(entity, action, params or {})