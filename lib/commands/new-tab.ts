import { Command } from "./index";

const newTabCommand: Command = {
  id: "new-tab",
  name: "New Tab",
  description: "Open a new browser tab",
  context: "background",
  execute: async () => {
    await browser.tabs.create({ url: "about:newtab" });
    return "New tab opened."; // Optional success message
  },
  meta: { type: "browser", category: "tabs" },
  isEnabled: true,
  isUserDefined: false,
};

export default newTabCommand;
