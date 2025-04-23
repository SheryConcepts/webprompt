import React from "react";
import ReactDOM from "react-dom/client";
import { CommandUI } from "@/components/CommandUI";
import App from "./App.tsx";
import "~/assets/tailwind.css";
// Import command registry functions
import { getCommandById, Command } from "@/lib/commands";
import { ContentScriptContext } from "#imports";

let ui: ReturnType<typeof createShadowRootUi> | null = null;
let root: ReactDOM.Root | null = null;
let isUIMounted = false;

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  main: (ctx) => {
    console.log("Content script loaded for:", window.location.href);

    // Listener for toggling the UI (from background script)
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Check if the message is from the background script itself (not another content script)
      if (sender.id !== browser.runtime.id) {
        return false; // Ignore messages not from the background script
      }

      console.log("Message received in content script:", message);
      if (message.action === "toggle-ui") {
        toggleUI(ctx);
        sendResponse({ success: true, status: `UI Toggled: ${!isUIMounted}` });
        return false; // No async response needed here
      }

      // Listener for executing content-script commands (from background script)
      if (message.action === "run-content-command") {
        const { commandId, args } = message.payload;
        console.log(`Received request to run content command: ${commandId}`);
        const command = getCommandById(commandId);

        if (command && command.context === "content") {
          Promise.resolve() // Ensure async handling
            .then(() => command.execute(...(args || [])))
            .then((result) => {
              console.log(
                `Content command '${command.name}' executed successfully.`,
              );
              sendResponse({ success: true, result });
            })
            .catch((error) => {
              console.error(
                `Error executing content command '${command.name}':`,
                error,
              );
              sendResponse({
                success: false,
                error: error?.message || String(error),
              });
            });
        } else {
          console.error(
            `Command ${commandId} not found or not a content script command.`,
          );
          sendResponse({
            success: false,
            error: `Command ${commandId} not found or not executable in content script.`,
          });
        }
        return true; // Indicates async response
      }
      // return false; // Explicitly indicate no response if message is not handled
    });
  },
});

// ToggleUI function remains mostly the same, but calls handleCommandSelection now
async function toggleUI(ctx: ContentScriptContext) {
  if (isUIMounted) {
    console.log("Unmounting UI");
    ui?.remove(); // onRemove callback handles unmounting React root
    // isUIMounted state is set in onRemove
    return;
  }

  console.log("Mounting UI");
  if (!ui) {
    console.log("Creating ShadowRoot UI instance");
    // @ts-ignore
    ui = await createShadowRootUi(ctx, {
      name: "webprompt-ui",
      position: "modal",
      anchor: "body",
      zIndex: 99999,
      onMount: (container) => {
        console.log("UI onMount triggered");
        root = ReactDOM.createRoot(container);
        root.render(
          <App
            // @ts-ignore
            onClose={() => ui?.remove()}
            onSelectCommand={handleCommandSelection}
          />,
        );
        console.log("React component rendered");
        isUIMounted = true; // Set mounted state AFTER successful render

        // Add the click outside listener ONLY when UI is mounted
      },
      onRemove: () => {
        console.log("UI onRemove triggered");
        root?.unmount();
        root = null;
        isUIMounted = false; // Update state on removal
        ui = null; // Clean up UI instance reference
        console.log("React component unmounted and UI instance cleaned");
      },
    });
  }

  try {
    // Ensure ui instance exists before mounting (it should, due to the logic above)
    if (ui) {
      ui.mount(); // Mount the UI
      console.log("UI mount requested");
      // Note: isUIMounted is set in onMount for accuracy
    } else {
      console.error("UI instance is null, cannot mount.");
    }
  } catch (error) {
    console.error("Error mounting UI:", error);
    // Maybe cleanup ui instance if mount fails?
    ui = null; // Ensure cleanup if mount fails
    isUIMounted = false;
  }
}

// Renamed function: This now ONLY sends the request to the background
function handleCommandSelection(commandId: string, args?: any[]) {
  console.log(`Command selected in UI: ${commandId}, Args:`, args);

  // Close the UI immediately for better UX
  if (ui) {
    ui.remove(); // This will set isUIMounted to false via onRemove
  } else {
    console.warn("Attempted to close UI, but UI instance was not found.");
    isUIMounted = false; // Ensure state consistency
  }

  // Send the command execution request to the background script (orchestrator)
  console.log("Sending execute-command request to background for:", commandId);
  browser.runtime
    .sendMessage({
      action: "execute-command",
      payload: { commandId, args: args || [] },
    })
    .then((response) => {
      // This response is the final result after orchestration (either from background or content script)
      console.log(
        `Final response received from background for ${commandId}:`,
        response,
      );
      if (!response?.success) {
        console.error(
          `Command execution failed for ${commandId}:`,
          response?.error,
        );
        // TODO: Optionally display this error back to the user (e.g., temporary notification)
      } else {
        console.log(
          `Command ${commandId} executed successfully. Result:`,
          response?.result,
        );
        // TODO: Optionally display success feedback
      }
    })
    .catch((error) => {
      console.error(
        `Error sending/receiving execute-command for ${commandId} to background:`,
        error,
      );
      // TODO: Display error feedback
    });
}

console.log("Content script setup complete.");
