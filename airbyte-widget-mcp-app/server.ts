#!/usr/bin/env node
/**
 * Airbyte Widget MCP App Server
 *
 * A self-contained MCP server that provides the Airbyte Embedded Widget
 * as an MCP App for adding/managing data source integrations.
 *
 * Usage:
 *   node dist/server.mjs          # stdio transport (for .mcp.json)
 *   node dist/server.mjs --http   # HTTP transport (for testing with basic-host)
 */

import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// ============================================================================
// Configuration
// ============================================================================

const AIRBYTE_API_BASE = "https://api.airbyte.ai/api/v1";
const AIRBYTE_WIDGET_CDN = "https://cdn.jsdelivr.net/npm/@airbyte-embedded/airbyte-embedded-widget@0.4.2";

// ============================================================================
// OAuth Token Flow (ported from airbyte_widget.py)
// ============================================================================

async function fetchApplicationToken(): Promise<string> {
  const clientId = process.env.AIRBYTE_CLIENT_ID;
  const clientSecret = process.env.AIRBYTE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing AIRBYTE_CLIENT_ID or AIRBYTE_CLIENT_SECRET environment variables");
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
  const externalUserId = process.env.EXTERNAL_USER_ID ?? "customer-workspace";
  // MCP App iframes use srcdoc which has origin "null"
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

// ============================================================================
// Embedded Client HTML
// ============================================================================

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
    .container {
      text-align: center;
      padding: 2rem;
    }
    .loading { color: var(--color-text-secondary, #666); }
    .error { color: #dc2626; }
    .success { color: #16a34a; }
  </style>
</head>
<body>
  <div class="container">
    <p id="status" class="loading">Initializing widget...</p>
  </div>
  <script type="module">
    import { App, applyDocumentTheme, applyHostStyleVariables } from "https://esm.sh/@modelcontextprotocol/ext-apps@1.0.1";

    const statusEl = document.getElementById("status");
    let widgetInstance = null;

    function showStatus(message, type = "loading") {
      statusEl.textContent = message;
      statusEl.className = type;
    }

    // Create MCP App instance
    const app = new App({ name: "Airbyte Widget", version: "1.0.0" });

    // Handle host context changes (theme, safe area, etc.)
    app.onhostcontextchanged = (ctx) => {
      if (ctx.theme) applyDocumentTheme(ctx.theme);
      if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
      if (ctx.safeAreaInsets) {
        document.body.style.padding =
          \`\${ctx.safeAreaInsets.top}px \${ctx.safeAreaInsets.right}px \${ctx.safeAreaInsets.bottom}px \${ctx.safeAreaInsets.left}px\`;
      }
    };

    // Handle tool input (called when tool is invoked)
    app.ontoolinput = () => {
      showStatus("Fetching widget token...", "loading");
    };

    // Handle tool result (called when tool returns data)
    app.ontoolresult = (result) => {
      if (result.isError) {
        const errorText = result.content?.find(c => c.type === "text")?.text ?? "Unknown error";
        showStatus(errorText, "error");
        return;
      }

      const { widgetToken } = (result.structuredContent || {});

      if (!widgetToken) {
        showStatus("No widget token received", "error");
        return;
      }

      showStatus("Opening Airbyte widget...", "success");

      // Initialize and open the Airbyte widget
      try {
        if (widgetInstance) {
          widgetInstance.destroy?.();
        }

        widgetInstance = new AirbyteEmbeddedWidget({
          token: widgetToken,
          onEvent: (event) => {
            console.log("Airbyte widget event:", event);
            app.sendLog({ level: "info", data: \`Widget event: \${JSON.stringify(event)}\` });
          }
        });

        widgetInstance.open();
        showStatus("Widget opened! Configure your integration.", "success");
      } catch (error) {
        showStatus(\`Failed to initialize widget: \${error.message}\`, "error");
      }
    };

    // Handle tool cancellation
    app.ontoolcancelled = (params) => {
      showStatus(\`Cancelled: \${params.reason || "Unknown reason"}\`, "error");
    };

    // Handle errors
    app.onerror = (error) => {
      showStatus(\`Error: \${error.message}\`, "error");
    };

    // Cleanup on teardown
    app.onteardown = async () => {
      if (widgetInstance) {
        try {
          widgetInstance.destroy?.();
        } catch (e) {
          console.warn("Error destroying widget:", e);
        }
        widgetInstance = null;
      }
      return {};
    };

    // Connect to host
    app.connect().then(() => {
      const ctx = app.getHostContext();
      if (ctx) app.onhostcontextchanged(ctx);
      showStatus("Ready. Waiting for tool call...", "loading");
    }).catch((error) => {
      showStatus(\`Connection failed: \${error.message}\`, "error");
    });
  </script>
</body>
</html>`;

// ============================================================================
// MCP Server Setup
// ============================================================================

function createServer(): McpServer {
  const server = new McpServer({
    name: "Airbyte Widget MCP App",
    version: "1.0.0",
  });

  const resourceUri = "ui://airbyte/widget.html";

  // Register the tool
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

  // Register the resource (serves the embedded HTML)
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

// ============================================================================
// Transport Setup
// ============================================================================

async function startHttpServer(): Promise<void> {
  // Dynamic imports for HTTP transport (not needed for stdio)
  const { createMcpExpressApp } = await import("@modelcontextprotocol/sdk/server/express.js");
  const cors = (await import("cors")).default;

  const port = parseInt(process.env.PORT ?? "3001", 10);
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.use(cors());

  app.all("/mcp", async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const httpServer = app.listen(port, () => {
    console.log(`Airbyte Widget MCP App listening on http://localhost:${port}/mcp`);
  });

  const shutdown = () => {
    console.log("\nShutting down...");
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function startStdioServer(): Promise<void> {
  await createServer().connect(new StdioServerTransport());
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  if (process.argv.includes("--http")) {
    await startHttpServer();
  } else {
    await startStdioServer();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
