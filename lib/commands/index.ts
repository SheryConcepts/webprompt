import { v4 as uuidv4 } from "uuid";
import { storage } from "#imports";

/**
 * Defines the execution context for a command.
 * - 'background': Executes in the background script (Service Worker). Has full extension API access, no direct DOM access.
 * - 'content': Executes in the content script of the active tab. Has DOM access, limited extension API access.
 */
export type CommandExecutionContext = "background" | "content";

export interface Command {
  id: string; // Unique identifier
  name: string; // User-facing name
  description: string;
  context: CommandExecutionContext; // Where the core logic runs
  // The actual function to execute. Arguments are passed from the UI/input.
  // Context-specific arguments (like the Tab for background or maybe ctx for content) are added by the orchestrator.
  execute: (any: any) => any;
  // Optional: Define expected arguments for help/validation later
  // args?: { name: string; description?: string; type: string }[];
  meta?: {
    [key: string]: any;
  };
}

export interface StoredCommand {
  id: string; // Unique identifier
  name: string; // User-facing name
  description: string;
  context: CommandExecutionContext; // Where the core logic runs
  // The actual function to execute. Arguments are passed from the UI/input.
  // Context-specific arguments (like the Tab for background or maybe ctx for content) are added by the orchestrator.
  execute: string;
  // Optional: Define expected arguments for help/validation later
  // args?: { name: string; description?: string; type: string }[];
  meta?: {
    [key: string]: any;
  };
}

import goBackCommand from "./go-back";
import goForwardCommand from "./go-forward";
import copyTitleCommand from "./copy-title";
import downloadMarkdownCommand from "./download-markdown";
import listBookmarksCommand from "./list-bookmarks";
import newTabCommand from "./new-tab";
import reloadTabCommand from "./reload-tab";
import closeTabCommand from "./close-tab";

// Initial default commands
const defaultCommands: Command[] = [
  newTabCommand,
  closeTabCommand,
  reloadTabCommand,
  listBookmarksCommand,
  goBackCommand,
  goForwardCommand,
  copyTitleCommand,
  downloadMarkdownCommand,
];

// --- Registry Logic ---

const COMMANDS_STORAGE_KEY = "commands";

const saved_commands = storage.defineItem<StoredCommand[]>(
  `local:${COMMANDS_STORAGE_KEY}`,
  {
    fallback: [],
  },
);

export async function loadCommands() {
  saveCommands(defaultCommands);
  console.log(await getAllCommands(), "allCommands after loading");
}

async function saveCommands(commands: Command[]) {
  try {
    const commandsWithSerializedFunctions = commands.map((command) => ({
      ...command,
      execute: command.execute.toString(),
    }));
    await saved_commands.setValue(commandsWithSerializedFunctions);
  } catch (error) {
    console.error("Error saving commands to storage:", error);
  }
}

export async function createCommand(
  command: Omit<Command, "id">,
): Promise<Command> {
  const newCommand: Command = { id: uuidv4(), ...command };
  const allCommands = await getAllCommands();
  const updatedCommands = [...allCommands, newCommand];
  await saveCommands(updatedCommands);
  return newCommand;
}

export async function updateCommand(command: Command): Promise<Command> {
  const allCommands = await getAllCommands();
  const updatedCommands = allCommands.map((c) =>
    c.id === command.id ? command : c,
  );
  await saveCommands(updatedCommands);
  return command;
}

export async function deleteCommand(id: string): Promise<string> {
  const allCommands = await getAllCommands();
  const updatedCommands = allCommands.filter((command) => command.id !== id);
  await saveCommands(updatedCommands);
  return id;
}

export async function getAllCommands(): Promise<Command[]> {
  const storedCommands = await saved_commands.getValue();
  const constCommandsWithFunctionDeserialize = storedCommands.map((i) => {
    i.execute;
  });
}

export async function getCommandById(id: string): Promise<Command | undefined> {
  const allCommands = await getAllCommands();
  return allCommands.find((command) => command.id === id);
}

export async function searchCommands(query: string): Promise<Command[]> {
  const allCommands = await getAllCommands();
  console.log(allCommands, "allCommands");
  const lowerCaseQuery = query.toLowerCase().trim();
  if (!lowerCaseQuery) return allCommands;

  return allCommands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lowerCaseQuery) ||
      cmd.description.toLowerCase().includes(lowerCaseQuery) ||
      cmd.id.toLowerCase().includes(lowerCaseQuery),
  );
}
