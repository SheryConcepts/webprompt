import { v4 as uuidv4 } from "uuid";
import { storage } from "#imports"; // Assuming #imports resolves wxt/storage
import type { Browser } from "wxt/browser";

// --- Core Command Definition ---
export type CommandExecutionContext = "background" | "content";

export interface CommandMetadata {
  name: string;
  description: string;
  context: CommandExecutionContext;
  meta?: { [key: string]: any };
  isUserDefined: boolean;
  isEnabled: boolean;
}

export interface Command extends CommandMetadata {
  id: string;
  execute: (...args: any[]) => Promise<any> | any;
}

// --- Storage Structures ---
export interface StoredUserCommand extends CommandMetadata {
  id: string;
  executeScript: string;
}

export type StoredSourceCommandOverride = Partial<
  Omit<CommandMetadata, "isUserDefined" | "context">
>;

// --- Storage Definitions ---
const USER_COMMANDS_STORAGE_KEY = "user_commands";
const SOURCE_OVERRIDES_STORAGE_KEY = "source_command_overrides";

const userCommandsStorage = storage.defineItem<StoredUserCommand[]>(
  `local:${USER_COMMANDS_STORAGE_KEY}`,
  { fallback: [] },
);

const sourceOverridesStorage = storage.defineItem<
  Record<string, StoredSourceCommandOverride>
>(`local:${SOURCE_OVERRIDES_STORAGE_KEY}`, { fallback: {} });

// --- Static Source Command Definitions ---
// Import the *executable* command definitions
import newTabCommandDef from "./new-tab";
import closeTabCommandDef from "./close-tab";
import reloadTabCommandDef from "./reload-tab";
import listBookmarksCommandDef from "./list-bookmarks";
import goBackCommandDef from "./go-back";
import goForwardCommandDef from "./go-forward";
import copyTitleCommandDef from "./copy-title";
import downloadMarkdownCommandDef from "./download-markdown";

// This map holds the *original, code-defined* source commands.
const sourceCommandDefinitions: Readonly<
  Record<string, Omit<Command, "id" | "isUserDefined" | "isEnabled">>
> = {
  "cmd-new-tab": newTabCommandDef,
  "cmd-close-tab": closeTabCommandDef,
  "cmd-reload-tab": reloadTabCommandDef,
  "cmd-list-bookmarks": listBookmarksCommandDef,
  "cmd-go-back": goBackCommandDef,
  "cmd-go-forward": goForwardCommandDef,
  "cmd-copy-title": copyTitleCommandDef,
  "cmd-download-markdown": downloadMarkdownCommandDef,
  // Add other source commands here with unique keys
};

// --- Helper Functions ---

/** Creates an executable function from a script string */
function createFunctionFromString(
  script: string,
): (...args: any[]) => Promise<any> | any {
  try {
    return new Function(
      "...args",
      `return (async (...args) => { ${script} })(...args);`,
    ) as any;
  } catch (error) {
    console.error("Error creating function from string:", error);
    return () =>
      Promise.reject(
        new Error(`Failed to compile user command script: ${error}`),
      );
  }
}

/** Merges a static source command definition with stored overrides */
function mergeSourceWithOverride(
  id: string,
  sourceDef: Omit<Command, "isUserDefined" | "isEnabled">,
  overrideData: StoredSourceCommandOverride | undefined,
): Command {
  const base: Command = {
    ...sourceDef,
    id: id,
    isUserDefined: false,
    isEnabled: true, // Default to enabled
  };

  if (overrideData) {
    return {
      ...base,
      name: overrideData.name !== undefined ? overrideData.name : base.name,
      description:
        overrideData.description !== undefined
          ? overrideData.description
          : base.description,
      isEnabled:
        overrideData.isEnabled !== undefined
          ? overrideData.isEnabled
          : base.isEnabled,
      meta:
        overrideData.meta !== undefined
          ? { ...(base.meta || {}), ...overrideData.meta }
          : base.meta,
    };
  }
  return base;
}

// --- Pruning Function (Exported for use in background script) ---
/**
 * Removes overrides from storage that don't correspond to any known static source command definition ID.
 */
export async function pruneOrphanedOverrides() {
  console.log("Pruning orphaned command overrides...");
  const overrides = await sourceOverridesStorage.getValue();
  let overridesChanged = false;
  for (const id in overrides) {
    if (!sourceCommandDefinitions[id]) {
      console.log(`Pruning override for unknown source command ID: ${id}`);
      delete overrides[id];
      overridesChanged = true;
    }
  }
  if (overridesChanged) {
    await sourceOverridesStorage.setValue(overrides);
    console.log("Orphaned overrides pruned.");
  } else {
    console.log("No orphaned overrides found.");
  }
}

// --- Public Command API (Stateless - Fetches on demand) ---

/**
 * Retrieves all commands (source merged with overrides + user commands).
 * Fetches from storage and merges with static definitions on each call.
 */
export async function getAllCommands(): Promise<Command[]> {
  const userCmdsStored = await userCommandsStorage.getValue();
  const overrides = await sourceOverridesStorage.getValue();

  const processedSourceCommands: Command[] = Object.entries(
    sourceCommandDefinitions,
  ).map(([id, sourceDef]) =>
    mergeSourceWithOverride(id, sourceDef, overrides[id]),
  );

  const processedUserCommands: Command[] = userCmdsStored.map((storedCmd) => ({
    ...storedCmd,
    execute: createFunctionFromString(storedCmd.executeScript),
    isUserDefined: true,
    isEnabled: storedCmd.isEnabled !== undefined ? storedCmd.isEnabled : true,
  }));

  const allCommands = [...processedSourceCommands, ...processedUserCommands];
  // console.log("getAllCommands final merged:", allCommands); // Debug log
  return allCommands;
}

/**
 * Gets a single command by its ID, fetching and merging data on demand.
 */
export async function getCommandById(id: string): Promise<Command | undefined> {
  const sourceDef = sourceCommandDefinitions[id];
  if (sourceDef) {
    const overrides = await sourceOverridesStorage.getValue();
    return mergeSourceWithOverride(id, sourceDef, overrides[id]);
  }

  const userCmdsStored = await userCommandsStorage.getValue();
  const userCmdStored = userCmdsStored.find((cmd) => cmd.id === id);
  if (userCmdStored) {
    return {
      ...userCmdStored,
      execute: createFunctionFromString(userCmdStored.executeScript),
      isUserDefined: true,
      isEnabled:
        userCmdStored.isEnabled !== undefined ? userCmdStored.isEnabled : true,
    };
  }
  return undefined;
}

/**
 * Searches commands by name, description, or ID. Uses getAllCommands internally.
 */
export async function searchCommands(query: string): Promise<Command[]> {
  const allCommands = await getAllCommands();
  const lowerCaseQuery = query.toLowerCase().trim();

  if (!lowerCaseQuery) {
    return allCommands.filter((cmd) => cmd.isEnabled); // Return all enabled only
  }

  return allCommands.filter(
    (cmd) =>
      cmd.isEnabled &&
      (cmd.name.toLowerCase().includes(lowerCaseQuery) ||
        cmd.description.toLowerCase().includes(lowerCaseQuery) ||
        cmd.id.toLowerCase().includes(lowerCaseQuery)),
  );
}

/**
 * Creates a new user-defined command and saves it to storage.
 */
export async function createUserCommand(
  commandData: Omit<StoredUserCommand, "id" | "isUserDefined" | "isEnabled">,
): Promise<Command> {
  const newUserCommandStored: StoredUserCommand = {
    id: uuidv4(),
    ...commandData,
    isUserDefined: true,
    isEnabled: true,
  };

  const currentCommands = await userCommandsStorage.getValue();
  await userCommandsStorage.setValue([
    ...currentCommands,
    newUserCommandStored,
  ]);

  return {
    ...newUserCommandStored,
    execute: createFunctionFromString(newUserCommandStored.executeScript),
  };
}

/**
 * Updates a command. Handles both user commands and overrides for source commands.
 */
export async function updateCommand(
  id: string,
  updateData: Partial<StoredUserCommand & { isEnabled?: boolean }>,
): Promise<Command | undefined> {
  // Try updating a user command
  const userCommands = await userCommandsStorage.getValue();
  const userCmdIndex = userCommands.findIndex((cmd) => cmd.id === id);
  if (userCmdIndex !== -1) {
    const updatedUserCmd = {
      ...userCommands[userCmdIndex],
      ...updateData,
      isUserDefined: true,
    };
    // Ensure non-provided fields retain original values
    updatedUserCmd.name =
      updatedUserCmd.name ?? userCommands[userCmdIndex].name;
    updatedUserCmd.description =
      updatedUserCmd.description ?? userCommands[userCmdIndex].description;
    updatedUserCmd.context =
      updatedUserCmd.context ?? userCommands[userCmdIndex].context;
    updatedUserCmd.executeScript =
      updatedUserCmd.executeScript ?? userCommands[userCmdIndex].executeScript;
    updatedUserCmd.isEnabled =
      updatedUserCmd.isEnabled ?? userCommands[userCmdIndex].isEnabled;

    userCommands[userCmdIndex] = updatedUserCmd;
    await userCommandsStorage.setValue(userCommands);
    return {
      ...updatedUserCmd,
      execute: createFunctionFromString(updatedUserCmd.executeScript),
    };
  }

  // Try updating overrides for a source command
  const sourceDef = sourceCommandDefinitions[id];
  if (sourceDef) {
    const overrides = await sourceOverridesStorage.getValue();
    const currentOverride = overrides[id] || {};

    const newOverride: StoredSourceCommandOverride = {
      name:
        updateData.name !== undefined ? updateData.name : currentOverride.name,
      description:
        updateData.description !== undefined
          ? updateData.description
          : currentOverride.description,
      meta:
        updateData.meta !== undefined
          ? { ...(currentOverride.meta || {}), ...updateData.meta }
          : currentOverride.meta,
      isEnabled:
        updateData.isEnabled !== undefined
          ? updateData.isEnabled
          : currentOverride.isEnabled,
    };

    Object.keys(newOverride).forEach(
      (key) => newOverride[key] === undefined && delete newOverride[key],
    );

    const isNameDefault =
      newOverride.name === undefined || newOverride.name === sourceDef.name;
    const isDescDefault =
      newOverride.description === undefined ||
      newOverride.description === sourceDef.description;
    const isMetaDefault = newOverride.meta === undefined;
    const isEnabledDefault =
      newOverride.isEnabled === undefined || newOverride.isEnabled === true;

    if (isNameDefault && isDescDefault && isMetaDefault && isEnabledDefault) {
      delete overrides[id];
    } else {
      overrides[id] = newOverride;
    }

    await sourceOverridesStorage.setValue(overrides);
    return mergeSourceWithOverride(id, sourceDef, overrides[id]);
  }

  console.error(`Command with ID ${id} not found for update.`);
  return undefined;
}

/**
 * Deletes a user-defined command or resets overrides for a source command.
 */
export async function deleteCommand(id: string): Promise<boolean> {
  // Reset overrides for source commands
  if (sourceCommandDefinitions[id]) {
    const overrides = await sourceOverridesStorage.getValue();
    if (overrides[id]) {
      delete overrides[id];
      await sourceOverridesStorage.setValue(overrides);
      console.log(`Overrides reset for source command ${id}.`);
      return true;
    }
    console.log(`No overrides to reset for source command ${id}.`);
    return false;
  }

  // Delete user command
  const userCommands = await userCommandsStorage.getValue();
  const initialLength = userCommands.length;
  const updatedCommands = userCommands.filter((cmd) => cmd.id !== id);

  if (updatedCommands.length < initialLength) {
    await userCommandsStorage.setValue(updatedCommands);
    console.log(`User command ${id} deleted.`);
    return true;
  }

  console.warn(`User command with ID ${id} not found for deletion.`);
  return false;
}

// Ensure command definition files export the correct structure
// Example: lib/commands/new-tab.ts needs to export an object matching Omit<Command, 'id' | 'isUserDefined' | 'isEnabled'>
/*
  import type { Command } from './index';
  import type { Browser } from 'wxt/browser';

  const newTabCommandDef: Omit<Command, 'id' | 'isUserDefined' | 'isEnabled'> = {
    name: "New Tab",
    description: "Open a new browser tab",
    context: "background",
    execute: async (tab?: Browser.tabs.Tab, url?: string) => { // Updated signature
      await browser.tabs.create({ url: url || "about:newtab" });
      return "New tab opened.";
    },
    meta: { type: "browser", category: "tabs" },
  };
  export default newTabCommandDef;
*/
