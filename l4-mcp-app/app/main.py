"""
FastAPI server for the MCP Apps chat interface.

Serves the chat UI and handles agent interactions.
"""

import json
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .agent_setup import create_agent

load_dotenv()

agent = None
message_history = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent
    agent = create_agent()
    yield


app = FastAPI(title="MCP Apps Chat", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    tool_calls: list[dict] = []


@app.get("/", response_class=HTMLResponse)
async def serve_ui():
    """Serve the chat UI."""
    html_path = Path(__file__).parent / "index.html"
    return HTMLResponse(content=html_path.read_text())


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Handle chat messages with the agent."""
    global message_history

    try:
        result = await agent.run(request.message, message_history=message_history)
        message_history = result.all_messages()

        tool_calls = []
        for msg in result.new_messages():
            if hasattr(msg, 'parts'):
                for part in msg.parts:
                    if hasattr(part, 'tool_name'):
                        tool_call = {
                            "tool_name": part.tool_name,
                            "args": part.args_as_dict() if hasattr(part, 'args_as_dict') else {},
                        }
                        if hasattr(part, '_meta') and part._meta:
                            tool_call["_meta"] = part._meta
                        tool_calls.append(tool_call)

        return ChatResponse(response=result.output, tool_calls=tool_calls)

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    print("Starting MCP Apps Chat server...")
    print("Server running on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
