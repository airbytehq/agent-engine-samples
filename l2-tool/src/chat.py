"""Gradio chat interface for Pydantic AI Agent with Gong and HubSpot Connectors"""

from dotenv import load_dotenv
import gradio as gr

from src.agent_setup import create_agent, register_hubspot_tools, register_gong_tools, register_generic_tools

# Load environment variables
load_dotenv()

# Global state (initialized on first message)
agent = None
message_history = []


async def chat(message, history):
    """Handle chat messages with the agent."""
    global agent, message_history

    # Lazy initialization on first message
    if agent is None:
        # Create and configure the agent
        agent = create_agent()
        register_generic_tools(agent)
        register_hubspot_tools(agent)
        register_gong_tools(agent)

    try:
        # Run agent with message history
        result = await agent.run(message, message_history=message_history)

        # Update message history with the full conversation
        message_history = result.all_messages()

        return result.output

    except Exception as e:
        return f"Error: {str(e)}"


# Create Gradio chat interface
demo = gr.ChatInterface(
    chat,
    title="AI Agent Chat",
    description="Ask me about anything you are looking to learn more about.",
    examples=[
        "List 10 users in my Gong organization",
        "Show me a call transcript from last week",
        "List all contacts in HubSpot",
        "Find companies with domain invesco.com"
    ]
)

if __name__ == "__main__":
    print("Starting AI Agent Chat...")
    print("Server running on http://localhost:8000")
    demo.launch(server_port=8000, server_name="0.0.0.0")
