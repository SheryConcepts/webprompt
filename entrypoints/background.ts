import { getCommandById } from "@/lib/commands"; // Import from registry

console.log("Background script loaded.");

export default defineBackground(() => {
  // Command listener (for keyboard shortcut) remains the same
  browser.commands.onCommand.addListener(async (commandName) => {
    console.log(`Command received: ${commandName}`);
    if (commandName === "toggle_webprompt") {
      console.log("shortcut pressed");
      const [currentTab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (currentTab?.id) {
        console.log(`Sending toggle-ui message to tab ${currentTab.id}`);
        try {
          await browser.tabs.sendMessage(currentTab.id, {
            action: "toggle-ui",
          });
          console.log(`Message sent successfully to tab ${currentTab.id}`);
        } catch (error) {
          console.error(
            `Error sending message to tab ${currentTab.id}:`,
            error,
          );
          // TODO: Consider injecting content script if it doesn't exist
        }
      } else {
        console.log("No active tab found or tab has no ID.");
      }
    }
  });

  // --- Command Orchestration ---
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(
      "Message received in background:",
      message,
      "from tab:",
      sender.tab?.id,
    );

    if (message.action === "execute-command") {
      const { commandId, args } = message.payload;
      const command = getCommandById(commandId);

      if (!command) {
        console.error(`Command not found: ${commandId}`);
        sendResponse({
          success: false,
          error: `Command not found: ${commandId}`,
        });
        return false; // Synchronous response
      }

      console.log(
        `Orchestrating command: ${command.name} (context: ${command.context})`,
      );

      if (command.context === "background") {
        // Execute directly in background
        Promise.resolve() // Ensure async handling
          .then(() => command.execute(sender.tab, ...(args || []))) // Pass tab context
          .then((result) => {
            console.log(
              `Background command '${command.name}' executed successfully.`,
            );
            sendResponse({ success: true, result });
          })
          .catch((error) => {
            console.error(
              `Error executing background command '${command.name}':`,
              error,
            );
            sendResponse({
              success: false,
              error: error?.message || String(error),
            });
          });
        return true; // Indicates async response
      } else if (command.context === "content") {
        // Forward to the content script that sent the message
        if (!sender.tab?.id) {
          console.error(
            "Cannot execute content script command: sender tab ID is missing.",
          );
          sendResponse({ success: false, error: "Missing sender tab ID." });
          return false;
        }
        console.log(
          `Forwarding command '${command.name}' to content script in tab ${sender.tab.id}`,
        );
        browser.tabs
          .sendMessage(sender.tab.id, {
            action: "run-content-command",
            payload: { commandId, args: args || [] },
          })
          .then((response) => {
            console.log(
              `Response from content script for '${command.name}':`,
              response,
            );
            // Forward the content script's response back to the original UI caller
            sendResponse(response);
          })
          .catch((error) => {
            console.error(
              `Error forwarding/receiving from content script for '${command.name}':`,
              error,
            );
            sendResponse({
              success: false,
              error:
                error?.message || `Error communicating with content script.`,
            });
          });
        return true; // Indicates async response
      } else {
        console.error(`Unsupported command context: ${command.context}`);
        sendResponse({
          success: false,
          error: `Unsupported command context: ${command.context}`,
        });
        return false;
      }
    }
    // Handle other message types if needed
    return false; // Indicate synchronous handling if no response needed or handled above
  });
});

console.log("Background script setup complete.");
