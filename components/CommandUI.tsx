import React, { useState, useEffect, useRef, useCallback } from "react";
// Import commands and types from the central registry
import { getAllCommands, searchCommands, Command } from "@/lib/commands"; // Assuming '@' alias maps to root

interface CommandUIProps {
  // Change prop to just signal which command ID was selected
  onSelectCommand: (commandId: string, args?: any[]) => void;
  onClose: () => void;
  rootRef: React.RefObject<HTMLDivElement>; // Add rootRef
}

export const CommandUI: React.FC<CommandUIProps> = ({
  onSelectCommand,
  onClose,
  rootRef, // Receive rootRef
}) => {
  const [inputValue, setInputValue] = useState("");
  const [filteredCommands, setFilteredCommands] =
    useState<Command[]>(getAllCommands());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Use the search function from the registry
  useEffect(() => {
    setFilteredCommands(searchCommands(inputValue));
    setSelectedIndex(0);
  }, [inputValue]);

  // Scroll selected item into view (no change needed)
  useEffect(() => {
    if (listRef.current) {
      const selectedItem = listRef.current.children[
        selectedIndex
      ] as HTMLLIElement;
      selectedItem?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        onClose();
        event.preventDefault();
      } else if (event.key === "Enter") {
        if (
          filteredCommands.length > 0 &&
          selectedIndex >= 0 &&
          selectedIndex < filteredCommands.length
        ) {
          // Pass the command ID to the handler prop
          // TODO: Parse arguments from inputValue if needed
          onSelectCommand(filteredCommands[selectedIndex].id /*, parsedArgs */);
        }
        event.preventDefault();
      } else if (event.key === "ArrowDown") {
        setSelectedIndex((prev) =>
          Math.min(prev + 1, filteredCommands.length - 1),
        );
        event.preventDefault();
      } else if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        event.preventDefault();
      }
    },
    [onClose, onSelectCommand, filteredCommands, selectedIndex],
  );

  const handleItemClick = (index: number) => {
    setSelectedIndex(index);
    // Pass the command ID to the handler prop
    // TODO: Parse arguments from inputValue if needed
    onSelectCommand(filteredCommands[index].id /*, parsedArgs */);
  };

  return (
    // Container styling remains the same (Tailwind)
    <div
      className="w-[600px] absolute top-1/6 left-1/3 max-w-[90vw] bg-white border border-gray-300 rounded-lg shadow-lg flex flex-col overflow-hidden"
      ref={rootRef} // Attach the ref to the container
    >
      <input
        ref={inputRef}
        type="text"
        className="w-full px-4 py-3 text-base border-b border-gray-200 focus:outline-none focus:border-gray-400"
        placeholder="Enter command..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {/* List rendering remains the same */}
      {filteredCommands.length > 0 && (
        <ul
          className="list-none m-0 p-0 max-h-[400px] overflow-y-auto"
          ref={listRef}
        >
          {filteredCommands.map((cmd, index) => (
            <li
              key={cmd.id}
              className={`px-4 py-2.5 cursor-pointer border-b border-gray-100 flex justify-between items-center last:border-b-0 ${
                index === selectedIndex ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
              onClick={() => handleItemClick(index)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="font-medium text-gray-800">{cmd.name}</span>
              <span className="text-xs text-gray-500 ml-2 text-right">
                {cmd.description}
              </span>
            </li>
          ))}
        </ul>
      )}
      {filteredCommands.length === 0 && inputValue && (
        <div className="px-4 py-3 text-gray-500">No commands found</div>
      )}
    </div>
  );
};
