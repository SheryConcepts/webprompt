import type { Command } from "./index";
import type { Browser } from "wxt/browser";
import { v4 } from "uuid";

const closeTabCommand: Command = {
  id: v4(),
  name: "Close Tab",
  description: "Close the current tab",
  context: "background",
  // Note: Background executor needs to pass the 'tab' object from the sender
  execute: async (tab?: Browser.tabs.Tab) => {
    if (tab?.id) {
      await browser.tabs.remove(tab.id);
      return "Tab closed.";
    }
    throw new Error("Could not determine the active tab to close.");
  },
  meta: { type: "browser", category: "tabs" },
};

export default closeTabCommand;
