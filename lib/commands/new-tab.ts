import { v4 as uuidv4 } from "uuid";
import type { Browser } from "wxt/browser";
import { Command } from "./index";

const newTabCommand: Command = {
  id: "new-tab",
  name: "New Tab",
  description: "Open a new browser tab",
  context: "background",
  execute: async (url?: string) => {
    await browser.tabs.create({ url: url || "about:newtab" });
    return "New tab opened."; // Optional success message
  },
  // args: [{ name: 'url', type: 'string', description: '(Optional) URL to open' }]
  meta: { type: "browser", category: "tabs" },
  isEnabled: true,
  isUserDefined: false,
};

export default newTabCommand;
