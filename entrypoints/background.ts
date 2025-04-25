import { getCommandById } from "@/lib/commands";
import type { Command } from "@/lib/commands"; // Import type if needed

console.log("Background script loaded.");

export default defineBackground(async () => {
  browser.runtime.onInstalled.addListener(async (details) => {
    console.log("Extension installed or updated. Loading commands...");
    console.log("Commands loaded.");
    // Example: Log a specific command after loading
    // const exampleCmd = await getCommandById("cmd-new-tab");
    // console.log("Example loaded command:", exampleCmd);
  });

  // If you need commands immediately on startup (not just install)
  // loadCommands(); // Consider if needed outside onInstalled

  // Keyboard shortcut listener
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
            `Error checking/sending message to tab ${currentTab.id}:`,
            error,
          );
        }
      } else {
        console.log("No active tab found or tab has no ID.");
      }
    }
  });

  // Command Orchestration Listener
  browser.runtime.onMessage.addListener(
    async (message, sender, sendResponse) => {
      console.log(
        "Message received in background:",
        message,
        "from tab:",
        sender.tab?.id,
      );

      if (message.action === "execute-command") {
        const { commandId, args } = message.payload;
        let command: Command | undefined;
        try {
          command = await getCommandById(commandId); // Use await
        } catch (error) {
          console.error(`Error retrieving command ${commandId}:`, error);
          sendResponse({
            success: false,
            error: `Failed to retrieve command: ${String(error)}`,
          });
          return false; // Stop processing
        }

        if (!command) {
          console.error(`Command not found: ${commandId}`);
          sendResponse({
            success: false,
            error: `Command not found: ${commandId}`,
          });
          return false;
        }

        if (!command.isEnabled) {
          console.log(`Command '${command.name}' (${commandId}) is disabled.`);
          sendResponse({
            success: false,
            error: `Command '${command.name}' is disabled.`,
          });
          return false;
        }

        console.log(
          `Orchestrating command: ${command.name} (context: ${command.context})`,
        );

        try {
          if (command.context === "background") {
            const result = await command.execute(sender.tab, ...(args || [])); // Pass tab context, use await
            console.log(
              `Background command '${command.name}' executed successfully.`,
            );
            sendResponse({ success: true, result });
          } else if (command.context === "content") {
            if (!sender.tab?.id) {
              throw new Error(
                "Cannot execute content script command: sender tab ID is missing.",
              );
            }
            console.log(
              `Forwarding command '${command.name}' to content script in tab ${sender.tab.id}`,
            );
            const response = await browser.tabs.sendMessage(sender.tab.id, {
              // Use await
              action: "run-content-command",
              payload: { commandId, args: args || [] },
            });
            console.log(
              `Response from content script for '${command.name}':`,
              response,
            );
            sendResponse(response); // Forward the response
          } else {
            throw new Error(`Unsupported command context: ${command.context}`);
          }
        } catch (error) {
          console.error(
            `Error during command orchestration/execution for '${command?.name || commandId}':`,
            error,
          );
          sendResponse({
            success: false,
            error: String(error),
          });
        }
        // Indicate that the response might be sent asynchronously.
        // While we use await above, returning true is still the safest practice
        // for complex async message handlers in extensions.
        return true;
      }
      // Handle other message types if needed
      return false; // Indicate synchronous handling if message not handled
    },
  );
});
