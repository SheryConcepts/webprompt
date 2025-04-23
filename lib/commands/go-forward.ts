import type { Command } from "./index";

import { v4 as uuidv4 } from "uuid";

const goForwardCommand: Command = {
  id: uuidv4(),
  name: "Go Forward",
  description: "Navigate forward in history",
  context: "content",
  execute: () => {
    window.history.forward();
    return "Navigated forward.";
  },
  meta: { type: "page", category: "navigation" },
};

export default goForwardCommand;
