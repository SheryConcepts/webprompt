// Uncomment if 'browser' is not recognized globally by TS despite WXT setup
// import { browser } from 'wxt/browser';

import type { Browser } from "wxt/browser";
import type { ContentScriptContext } from "#imports"; // If needed for content commands

/**
 * Defines the execution context for a command.
 * - 'background': Executes in the background script (Service Worker). Has full extension API access, no direct DOM access.
 * - 'content': Executes in the content script of the active tab. Has DOM access, limited extension API access.
 */
export type CommandExecutionContext = "background" | "content";

export interface Command {
  id: string; // Unique identifier
  name: string; // User-facing name
  description: string;
  context: CommandExecutionContext; // Where the core logic runs
  // The actual function to execute. Arguments are passed from the UI/input.
  // Context-specific arguments (like the Tab for background or maybe ctx for content) are added by the orchestrator.
  execute: (...args: any[]) => Promise<any> | any;
  // Optional: Define expected arguments for help/validation later
  // args?: { name: string; description?: string; type: string }[];
}

// --- Define Commands ---

const commandsList: Command[] = [
  // --- Background Commands ---
  {
    id: "new-tab",
    name: "New Tab",
    description: "Open a new browser tab",
    context: "background",
    execute: async (url?: string) => {
      await browser.tabs.create({ url: url || "about:newtab" });
      return "New tab opened."; // Optional success message
    },
    // args: [{ name: 'url', type: 'string', description: '(Optional) URL to open' }]
  },
  {
    id: "close-tab",
    name: "Close Tab",
    description: "Close the current tab",
    context: "background",
    // Note: Background executor needs to pass the 'tab' object from the sender
    execute: async (tab?: Browser.Tabs.Tab) => {
      if (tab?.id) {
        await browser.tabs.remove(tab.id);
        return "Tab closed.";
      }
      throw new Error("Could not determine the active tab to close.");
    },
  },
  {
    id: "reload-tab",
    name: "Reload Tab",
    description: "Reload the current tab",
    context: "background",
    execute: async (tab?: browser.tabs.Tab) => {
      if (tab?.id) {
        await browser.tabs.reload(tab.id);
        return "Tab reloaded.";
      }
      throw new Error("Could not determine the active tab to reload.");
    },
  },
  {
    id: "list-bookmarks", // Example - Implement actual logic later
    name: "List Bookmarks",
    description: "Search and list bookmarks",
    context: "background",
    execute: async (query?: string) => {
      console.log("Listing bookmarks (implementation needed)... Query:", query);
      // Placeholder: Replace with actual browser.bookmarks.search(...)
      await new Promise((res) => setTimeout(res, 50)); // Simulate async work
      return "Bookmark listing not yet implemented.";
    },
  },

  // --- Content Script Commands ---
  {
    id: "go-back",
    name: "Go Back",
    description: "Navigate back in history",
    context: "content",
    execute: () => {
      window.history.back();
      return "Navigated back."; // Content scripts can return results too
    },
  },
  {
    id: "go-forward",
    name: "Go Forward",
    description: "Navigate forward in history",
    context: "content",
    execute: () => {
      window.history.forward();
      return "Navigated forward.";
    },
  },
  {
    id: "copy-title",
    name: "Copy Page Title",
    description: "Copy the current page title to clipboard",
    context: "content",
    execute: async () => {
      const title = document.title;
      await navigator.clipboard.writeText(title);
      return `Copied title: "${title}"`;
    },
  },
  {
    id: "download-markdown",
    name: "Download as Markdown",
    description: "Convert page content to Markdown and download",
    context: "content",
    execute: async () => {
      console.log("Downloading as markdown (implementation needed)...");
      // Placeholder: Add HTML-to-Markdown conversion logic here
      await new Promise((res) => setTimeout(res, 50));
      return "Markdown download not yet implemented.";
    },
  },
  // Add more commands...
];

// --- Registry Logic ---

const commandsById = new Map<string, Command>(
  commandsList.map((cmd) => [cmd.id, cmd]),
);

export function getAllCommands(): Command[] {
  // Return a copy to prevent mutation
  return [...commandsList];
}

export function getCommandById(id: string): Command | undefined {
  return commandsById.get(id);
}

// You might add search/filter functions here later if needed
export function searchCommands(query: string): Command[] {
  const lowerCaseQuery = query.toLowerCase().trim();
  if (!lowerCaseQuery) return getAllCommands();
  return commandsList.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lowerCaseQuery) ||
      cmd.description.toLowerCase().includes(lowerCaseQuery) ||
      cmd.id.toLowerCase().includes(lowerCaseQuery),
  );
}
