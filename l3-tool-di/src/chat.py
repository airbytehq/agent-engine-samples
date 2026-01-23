"""Gradio chat interface for Pydantic AI Agent with Gong and HubSpot Connectors"""

from dotenv import load_dotenv
import gradio as gr

from src.agent_setup import create_agent, create_deps, register_tools
from src.airbyte_widget import get_widget_token, generate_widget_html, AirbyteWidgetError

# Load environment variables
load_dotenv()

# Global state (initialized on first message)
agent = None
deps = None
message_history = []


async def chat(message, history):
    """Handle chat messages with the agent."""
    global agent, deps, message_history

    # Lazy initialization on first message
    if agent is None:
        # Create and configure the agent
        agent = create_agent()
        deps = create_deps()
        register_tools(agent)

    try:
        # Run agent with message history and dependencies
        result = await agent.run(message, message_history=message_history, deps=deps)

        # Update message history with the full conversation
        message_history = result.all_messages()

        return result.output

    except Exception as e:
        return f"Error: {str(e)}"


async def fetch_and_open_widget():
    """Fetch widget token and return HTML to open the Airbyte widget."""
    try:
        token = await get_widget_token()
        return generate_widget_html(token)
    except AirbyteWidgetError as e:
        return f'<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;">Error: {str(e)}</div>'
    except Exception as e:
        return f'<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;">Unexpected error: {str(e)}</div>'


# Pre-load Airbyte widget script in page head (scripts in gr.HTML don't execute)
AIRBYTE_HEAD = """
<script src="https://cdn.jsdelivr.net/npm/@airbyte-embedded/airbyte-embedded-widget@0.4.2"></script>
<script>
    // Watch for token element and initialize widget
    const observer = new MutationObserver((mutations) => {
        const tokenEl = document.getElementById('airbyte-widget-token');
        if (tokenEl && tokenEl.dataset.token) {
            const token = tokenEl.dataset.token;
            tokenEl.removeAttribute('data-token');  // Prevent re-triggering
            const widget = new AirbyteEmbeddedWidget({
                token: token,
                onEvent: (event) => console.log("Airbyte widget event:", event)
            });
            widget.open();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
</script>
"""

# Create Gradio interface with custom layout
with gr.Blocks(title="AI Agent Chat", head=AIRBYTE_HEAD) as demo:
    # Header row with title and button
    with gr.Row():
        gr.Markdown("# AI Agent Chat")
        open_widget_btn = gr.Button("Add Connector", size="sm", scale=0)

    # Chat interface with existing functionality
    gr.ChatInterface(
        chat,
        description="Ask me about anything you are looking to learn more about.",
        examples=[
            "List 10 users in my Gong organization",
            "Show me a call transcript from last week",
            "List all contacts in HubSpot",
            "Find companies with domain invesco.com"
        ]
    )

    # Hidden HTML component for widget rendering
    widget_html = gr.HTML()

    # Wire button click to widget opening
    open_widget_btn.click(
        fn=fetch_and_open_widget,
        inputs=[],
        outputs=[widget_html],
        api_name=False
    )

if __name__ == "__main__":
    print("Starting AI Agent Chat...")
    print("Server running on http://localhost:8000")
    demo.launch(server_port=8000, server_name="0.0.0.0")
