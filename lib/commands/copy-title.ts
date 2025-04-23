import type { Command } from "./index";

import { v4 as uuidv4 } from "uuid";

const copyTitleCommand: Command = {
  id: uuidv4(),
  name: "Copy Page Title",
  description: "Copy the current page title to clipboard",
  context: "content",
  execute: async () => {
    const title = document.title;
    await navigator.clipboard.writeText(title);
    return `Copied title: "${title}"`;
  },
  meta: { type: "page", category: "content" },
};

export default copyTitleCommand;
