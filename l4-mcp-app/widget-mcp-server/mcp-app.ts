import { App, applyDocumentTheme, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";

declare const AirbyteEmbeddedWidget: new (config: {
  token: string;
  onEvent?: (event: unknown) => void;
}) => {
  open: () => void;
  destroy?: () => void;
};

const statusEl = document.getElementById("status")!;
let widgetInstance: ReturnType<typeof AirbyteEmbeddedWidget["prototype"]["constructor"]> | null = null;

function showStatus(message: string, type: "loading" | "error" | "success" = "loading") {
  statusEl.textContent = message;
  statusEl.className = type;
}

const app = new App({ name: "Airbyte Widget", version: "1.0.0" });

app.onhostcontextchanged = (ctx) => {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.safeAreaInsets) {
    document.body.style.padding =
      `${ctx.safeAreaInsets.top}px ${ctx.safeAreaInsets.right}px ${ctx.safeAreaInsets.bottom}px ${ctx.safeAreaInsets.left}px`;
  }
};

app.ontoolinput = () => {
  showStatus("Fetching widget token...", "loading");
};

app.ontoolresult = (result) => {
  if (result.isError) {
    const errorText = result.content?.find((c: { type: string; text?: string }) => c.type === "text")?.text ?? "Unknown error";
    showStatus(errorText, "error");
    return;
  }

  const { widgetToken } = (result.structuredContent || {}) as { widgetToken?: string };

  if (!widgetToken) {
    showStatus("No widget token received", "error");
    return;
  }

  showStatus("Opening Airbyte widget...", "success");

  try {
    if (widgetInstance) {
      widgetInstance.destroy?.();
    }

    widgetInstance = new AirbyteEmbeddedWidget({
      token: widgetToken,
      onEvent: (event) => {
        console.log("Airbyte widget event:", event);
        app.sendLog({ level: "info", data: `Widget event: ${JSON.stringify(event)}` });
      }
    });

    widgetInstance.open();
    showStatus("Widget opened! Configure your integration.", "success");
  } catch (error) {
    showStatus(`Failed to initialize widget: ${(error as Error).message}`, "error");
  }
};

app.ontoolcancelled = (params) => {
  showStatus(`Cancelled: ${params.reason || "Unknown reason"}`, "error");
};

app.onerror = (error) => {
  showStatus(`Error: ${error.message}`, "error");
};

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

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) app.onhostcontextchanged(ctx);
  showStatus("Ready. Waiting for tool call...", "loading");
}).catch((error) => {
  showStatus(`Connection failed: ${(error as Error).message}`, "error");
});
