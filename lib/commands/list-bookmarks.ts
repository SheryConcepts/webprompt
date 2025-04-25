import { Command } from "./index";

const listBookmarksCommand: Command = {
  id: "cmd-list-bookmarks",
  name: "List Bookmarks",
  description: "Open the bookmarks section of the browser",
  context: "background",
  execute: async () => {
    await browser.windows.create({
      url: "chrome://bookmarks/",
      type: "popup",
    });
  },
  meta: { type: "browser", category: "bookmarks" },
  isEnabled: true,
  isUserDefined: false,
};

export default listBookmarksCommand;
