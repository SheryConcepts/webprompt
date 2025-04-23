import { v4 as uuidv4 } from "uuid";
import type { Browser } from "wxt/browser";
import { Command } from "./index";

const reloadTabCommand: Command = {
  id: uuidv4(),
  name: "Reload Tab",
  description: "Reload the current tab",
  context: "background",
  execute: async (tab?: Browser.tabs.Tab) => {
    if (tab?.id) {
      await browser.tabs.reload(tab.id);
      return "Tab reloaded.";
    }
    throw new Error("Could not determine the active tab to reload.");
  },
  meta: { type: "browser", category: "tabs" },
};

export default reloadTabCommand;
