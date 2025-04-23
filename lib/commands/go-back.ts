import type { Command } from "./index";

import { v4 as uuidv4 } from "uuid";

const goBackCommand: Command = {
  id: uuidv4(),
  name: "Go Back",
  description: "Navigate back in history",
  context: "content",
  execute: () => {
    window.history.back();
    return "Navigated back."; // Content scripts can return results too
  },
  meta: { type: "page", category: "navigation" },
};

export default goBackCommand;
