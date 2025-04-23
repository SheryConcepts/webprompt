import type { Command } from "./index";

import { v4 as uuidv4 } from "uuid";

const downloadMarkdownCommand: Command = {
  id: uuidv4(),
  name: "Download as Markdown",
  description: "Convert page content to Markdown and download",
  context: "content",
  execute: async () => {
    console.log("Downloading as markdown (implementation needed)...");
    // Placeholder: Add HTML-to-Markdown conversion logic here
    await new Promise((res) => setTimeout(res, 50));
    return "Markdown download not yet implemented.";
  },
  meta: { type: "page", category: "content" },
};

export default downloadMarkdownCommand;
