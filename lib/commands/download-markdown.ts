import type { Command } from "./index";

const downloadMarkdownCommand: Command = {
  id: "cmd-download-markdown",
  name: "Download as Markdown",
  description: "Convert page content to Markdown and download",
  context: "content",
  execute: async () => {
    try {
      // Get page title and content
      const title = document.title || "page";
      const content = document.body.innerText;
      
      // Convert to markdown (simple conversion - can be enhanced later)
      const markdownContent = `# ${title}\n\n${content
        .replace(/^#+\s/gm, "") // Remove existing markdown headers
        .replace(/\n{3,}/g, "\n\n") // Normalize newlines
      }`;
      
      // Create download link
      const blob = new Blob([markdownContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      return `Downloaded "${title}" as markdown`;
    } catch (error) {
      console.error("Failed to download markdown:", error);
      throw new Error("Failed to convert page to markdown");
    }
  },
  meta: { type: "page", category: "content" },
  isEnabled: true,
  isUserDefined: false,
};

export default downloadMarkdownCommand;