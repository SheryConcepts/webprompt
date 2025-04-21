import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "WebPrompt",
    description: "A command-line interface for your browser.",
    version: "0.1.0",
    permissions: [
      "tabs", // Required for tab management (new tab, close tab, etc.)
      "storage", // For storing settings, command history, etc.
      "scripting", // Needed by WXT for HMR and sometimes content script injection
      "commands", // To define and listen for keyboard shortcuts
      "activeTab", // Often useful, grants temporary host permission on user action
      // Add more permissions as needed (e.g., 'history', 'bookmarks')
    ],
    // Define the command shortcut
    commands: {
      toggle_webprompt: {
        // Default command often used for browserAction/pageAction popups, repurpose if no popup needed initially
        suggested_key: {
          // Default keybindings - users can change these
          default: "Ctrl+Shift+U",
          mac: "Command+Shift+U",
        },
        description: "Open WebPrompt",
      },
      // Or define a specific command if _execute_action is used for a popup
      // "toggle-webprompt": {
      //   suggested_key: { ... },
      //   description: "Open WebPrompt"
      // }
    },
    // Define icons (WXT will auto-detect if named correctly in /public)
    // icons: {
    //   "16": "icons/icon-16.png",
    //   "48": "icons/icon-48.png",
    //   "128": "icons/icon-128.png"
    // },
    // Action needed for the command to work, even if no popup is shown immediately
    action: {
      default_title: "WebPrompt",
      // default_popup: "popup.html" // Add this later if you create a popup settings page
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
