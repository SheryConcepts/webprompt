import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "~/assets/tailwind.css";
import { getCommandById } from "@/lib/commands";
import type { Command } from "@/lib/commands"; // Import type if needed
import { ContentScriptContext } from "#imports";

let ui: ReturnType<typeof createShadowRootUi> | null = null;
let root: ReactDOM.Root | null = null;
let isUIMounted = false;
let command_exc_error = "";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  main: (ctx) => {
    console.log("Content script loaded for:", window.location.href);

    // Listener for messages from the background script
    browser.runtime.onMessage.addListener(
      async (message, sender, sendResponse) => {
        // IMPORTANT: Check if the message is specifically from *your* extension's background script
        if (sender.id !== browser.runtime.id) {
          console.log(
            "Ignoring message from non-background sender:",
            sender.id,
          );
          return false;
        }

        console.log("Message received in content script:", message);

        if (message.action === "toggle-ui") {
          toggleUI(ctx);
          // It's okay to send a simple sync response here if toggleUI itself doesn't need to be awaited heavily
          sendResponse({
            success: true,
            status: `UI Toggled: ${!isUIMounted}`,
          });
          return false; // Indicate sync response (or make toggleUI fully async and return true if needed)
        }

        // Listener for executing content-script commands (forwarded by background)
        if (message.action === "run-content-command") {
          const { commandId, args } = message.payload;
          console.log(`Received request to run content command: ${commandId}`);
          let command: Command | undefined;

          try {
            // Fetch the command definition *again* here to ensure we have the latest override info
            // Although overrides don't affect 'execute', this ensures consistency if we check other props.
            // If performance is critical and overrides rarely change context/isEnabled,
            // you *could* skip this, but it's safer to fetch.
            command = await getCommandById(commandId);

            if (!command) {
              throw new Error(`Command ${commandId} not found.`);
            }
            if (command.context !== "content") {
              throw new Error(
                `Command ${commandId} is not a content script command.`,
              );
            }
            if (!command.isEnabled) {
              throw new Error(`Command '${command.name}' is disabled.`);
            }

            // Execute the command function (already deserialized if user-defined)
            const result = await command.execute(...(args || [])); // Use await
            console.log(
              `Content command '${command.name}' executed successfully.`,
            );
            sendResponse({ success: true, result });
          } catch (error) {
            console.error(
              `Error executing content command '${command?.name || commandId}':`,
              error,
            );
            sendResponse({
              success: false,
              error: error?.message || String(error),
            });
          }
          return true; // Indicate async response
        }

        // return false; // Explicitly indicate no response if message is not handled
      },
    );

    browser.runtime.onMessage.addListener((message) => {
      if (message.action === "command-execution-error") {
        console.log(message.error, "command_exc_error")
        const warningContainer = document.createElement('div');
        warningContainer.classList.add("z-100");
        warningContainer.style.position = 'fixed';
        warningContainer.style.top = '10px';
        warningContainer.style.right = '10px';
        warningContainer.style.background = 'yellow';
        warningContainer.style.padding = '10px';
        warningContainer.style.borderRadius = '5px';
        const warningText = document.createTextNode(message.error);
        warningContainer.appendChild(warningText);
        document.body.appendChild(warningContainer);
        console.log(warningContainer, "warningContainer")
        setTimeout(() => {
          warningContainer.remove();
        }, 5000);
      }
    });

  },
});

// --- UI Handling --- (toggleUI and handleCommandSelection remain largely the same)

async function toggleUI(ctx: ContentScriptContext) {
  if (isUIMounted) {
    console.log("Unmounting UI");
    ui?.remove();
    return;
  }

  console.log("Mounting UI");
  if (!ui) {
    console.log("Creating ShadowRoot UI instance");
    try {
      // @ts-ignore - WXT types might need update or specific casting
      ui = await createShadowRootUi(ctx, {
        name: "webprompt-ui",
        position: "modal", // Or "overlay" depending on desired behavior
        // Use appendTo: 'body' or similar if anchor isn't sufficient
        // anchor: 'body',
        // Try appending directly if anchor causes issues
        mountTarget: document.body, // Example: Append directly to body
        zIndex: 2147483647, // Max z-index often needed for overlays
        onMount: (container) => {
          console.log("UI onMount triggered");
          // Create a div inside the container for React root
          const appRootElement = document.createElement("div");
          container.append(appRootElement);
          root = ReactDOM.createRoot(appRootElement); // Mount on the new div
          root.render(
            // @ts-ignore
            <App
              onClose={() => ui?.remove()}
              onSelectCommand={handleCommandSelection}
              error={command_exc_error}
            />,
          );
          isUIMounted = true;
          console.log("React component rendered");

          // Add click outside listener
          // Ensure this doesn't interfere with UI interaction
          // document.addEventListener('click', handleClickOutside, true);
        },
        onRemove: () => {
          console.log("UI onRemove triggered");
          // document.removeEventListener('click', handleClickOutside, true);
          root?.unmount();
          root = null;
          isUIMounted = false;
          ui = null; // Clean up UI instance reference
          console.log("React component unmounted and UI instance cleaned");
        },
      });
    } catch (error) {
      console.error("Error creating ShadowRoot UI:", error);
      isUIMounted = false;
      ui = null;
      return; // Don't proceed if creation failed
    }
  }

  try {
    if (ui) {
      ui.mount();
      console.log("UI mount requested");
    } else {
      console.error(
        "UI instance is null after creation attempt, cannot mount.",
      );
    }
  } catch (error) {
    console.error("Error mounting UI:", error);
    ui = null;
    isUIMounted = false;
  }
}
/*
// Optional: Click outside listener (can be tricky with shadow DOM/modals)
function handleClickOutside(event: MouseEvent) {
    // Check if the click is outside the UI container (ui?.shadowRoot is the key)
    if (ui && ui.shadowRoot && !event.composedPath().includes(ui.shadowRoot) && isUIMounted) {
        console.log("Click outside detected, removing UI.");
        ui.remove();
    }
}
*/

// Sends the command execution request *only* to the background script
function handleCommandSelection(commandId: string, args?: any[]) {
  // Close the UI immediately
  if (ui) {
    ui.remove();
  } else {
    console.warn("Attempted to close UI, but UI instance was not found.");
    isUIMounted = false;
  }

  console.log("Sending execute-command request to background for:", commandId);
  browser.runtime
    .sendMessage({
      action: "execute-command",
      payload: { commandId, args: args || [] },
    })
    .then(async (response) => {
      console.log(
        `Final response received from background for ${commandId}:`,
        response,
      );
      if (!response?.success) {
        console.error(
          `Command execution failed for ${commandId}:`,
          response?.error,
        );
        // TODO: Notify user of error
        const command = await getCommandById(commandId);
        command_exc_error = `Error while executing the command ${command?.name || commandId}`
        browser.runtime.sendMessage({
          action: "command-execution-error",
          error: command_exc_error
        });
      } else {
        console.log(
          `Command ${commandId} executed successfully. Result:`,
          response?.result,
        );
        // TODO: Notify user of success (optional)
      }
    })
    .catch((error) => {
      console.error(
        `Error sending/receiving execute-command for ${commandId} to background:`,
        error,
      );
    });
}

console.log("Content script setup complete.");
