#!/usr/bin/env node
/**
 * Airbyte Widget MCP App Server
 *
 * MCP server that provides the Airbyte Embedded Widget as an MCP App.
 * Uses AC_ prefixed environment variables for configuration.
 */

import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const AIRBYTE_API_BASE = "https://api.airbyte.ai/api/v1";
const AIRBYTE_WIDGET_CDN = "https://cdn.jsdelivr.net/npm/@airbyte-embedded/airbyte-embedded-widget@0.4.2";

async function fetchApplicationToken(): Promise<string> {
  const clientId = process.env.AC_AIRBYTE_CLIENT_ID;
  const clientSecret = process.env.AC_AIRBYTE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing AC_AIRBYTE_CLIENT_ID or AC_AIRBYTE_CLIENT_SECRET environment variables");
  }

  const response = await fetch(`${AIRBYTE_API_BASE}/account/applications/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const token = data.token ?? data.access_token;

  if (typeof token !== "string") {
    throw new Error(`Unexpected API response format: ${Object.keys(data).join(", ")}`);
  }

  return token;
}

async function fetchWidgetToken(appToken: string): Promise<string> {
  const externalUserId = process.env.AC_EXTERNAL_USER_ID ?? "customer-workspace";
  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "null";

  const response = await fetch(`${AIRBYTE_API_BASE}/embedded/widget-token`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${appToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workspace_name: externalUserId,
      allowed_origin: allowedOrigin,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch widget token: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const token = data.token ?? data.access_token;

  if (typeof token !== "string") {
    throw new Error(`Unexpected widget token response format: ${Object.keys(data).join(", ")}`);
  }

  return token;
}

async function getWidgetToken(): Promise<string> {
  const appToken = await fetchApplicationToken();
  return fetchWidgetToken(appToken);
}

const APP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>Airbyte Widget</title>
  <script src="${AIRBYTE_WIDGET_CDN}"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--color-background-primary, #ffffff);
      color: var(--color-text-primary, #1a1a1a);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { text-align: center; padding: 2rem; }
    .loading { color: var(--color-text-secondary, #666); }
    .error { color: #dc2626; }
    .success { color: #16a34a; }
  </style>
</head>
<body>
  <div class="container">
    <p id="status" class="loading">Initializing widget...</p>
  </div>
  <script>
    const statusEl = document.getElementById("status");
    let widgetInstance = null;

    function showStatus(message, type) {
      statusEl.textContent = message;
      statusEl.className = type || "loading";
    }

    function initWidget(widgetToken) {
      if (!widgetToken) {
        showStatus("No widget token available", "error");
        return;
      }

      showStatus("Opening Airbyte widget...", "success");

      try {
        widgetInstance = new AirbyteEmbeddedWidget({
          token: widgetToken,
          onEvent: function(event) {
            console.log("Airbyte widget event:", event);
          }
        });

        widgetInstance.open();
        showStatus("Widget opened! Configure your integration.", "success");
      } catch (error) {
        showStatus("Failed to initialize widget: " + error.message, "error");
      }
    }

    window.addEventListener("message", function(event) {
      if (event.data && event.data.type === "widget-token") {
        initWidget(event.data.token);
      }
    });

    showStatus("Waiting for widget token...", "loading");
  </script>
</body>
</html>`;

function createServer(): McpServer {
  const server = new McpServer({
    name: "Airbyte Widget MCP App",
    version: "1.0.0",
  });

  const resourceUri = "ui://airbyte/widget.html";

  registerAppTool(
    server,
    "open-airbyte-widget",
    {
      title: "Open Airbyte Widget",
      description: "Opens the Airbyte embedded widget to add or manage data source integrations. Call this when the user wants to add a new connector, set up an integration, or manage their data sources.",
      inputSchema: {},
      outputSchema: z.object({
        widgetToken: z.string().describe("Token for initializing the Airbyte widget"),
      }),
      _meta: { ui: { resourceUri } },
    },
    async (): Promise<CallToolResult> => {
      try {
        const widgetToken = await getWidgetToken();

        return {
          content: [
            {
              type: "text",
              text: "The Airbyte widget is now open. Use it to add or manage your data source integrations."
            }
          ],
          structuredContent: { widgetToken },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Failed to open widget: ${message}` }],
          isError: true,
        };
      }
    },
  );

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      return {
        contents: [
          { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: APP_HTML },
        ],
      };
    },
  );

  return server;
}

async function main() {
  await createServer().connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
