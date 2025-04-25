import React, { useState, useEffect, useRef, useCallback } from "react";
import { searchCommands, getAllCommands, Command } from "@/lib/commands"; // Add getAllCommands
import { LuTerminal, LuChevronDown, LuChevronUp } from "react-icons/lu";

interface CommandUIProps {
  onSelectCommand: (commandId: string, args?: any[]) => void;
  onClose: () => void;
}

export const CommandUI: React.FC<CommandUIProps> = ({
  onSelectCommand,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showScrollUp, setShowScrollUp] = useState(false);

  // Fetch commands effect
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const fetch = async () => {
      try {
        const commands =
          inputValue.length > 0
            ? await searchCommands(inputValue)
            : await getAllCommands(); // Fetch all enabled if input is empty

        console.log(commands, "commands");
        if (isMounted) {
          // Only show enabled commands in the list
          setFilteredCommands(commands.filter((cmd) => cmd.isEnabled));
          setSelectedIndex(0);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching commands:", error);
        if (isMounted) setIsLoading(false);
        // Handle error display if needed
      }
    };

    fetch();

    return () => {
      isMounted = false;
    }; // Cleanup mount status
  }, [inputValue]); // Re-fetch when input changes

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll handling effect (no changes needed)
  useEffect(() => {
    if (listRef.current && filteredCommands.length > 0) {
      const list = listRef.current;
      const updateScrollIndicators = () => {
        setShowScrollUp(list.scrollTop > 5); // Add small threshold
        setShowScrollDown(
          list.scrollTop + list.clientHeight < list.scrollHeight - 5, // Add small threshold
        );
      };

      updateScrollIndicators(); // Initial check

      const selectedItem = list.children[selectedIndex] as HTMLLIElement;
      if (selectedItem) {
        // Use 'nearest' to avoid unnecessary scrolling if already visible
        selectedItem.scrollIntoView({ block: "nearest", inline: "nearest" });
      }

      list.addEventListener("scroll", updateScrollIndicators);
      // Re-check on list length change too
      const resizeObserver = new ResizeObserver(updateScrollIndicators);
      resizeObserver.observe(list);

      return () => {
        list.removeEventListener("scroll", updateScrollIndicators);
        resizeObserver.unobserve(list);
      };
    } else {
      // Reset indicators if list is empty
      setShowScrollUp(false);
      setShowScrollDown(false);
    }
  }, [selectedIndex, filteredCommands]); // Depend on filteredCommands too

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
          onSelectCommand(filteredCommands[selectedIndex].id); // Pass ID
        } else if (
          inputValue.length > 0 &&
          filteredCommands.length === 0 &&
          !isLoading
        ) {
          // Optional: Handle case where user presses Enter on "No commands found"
          console.log(
            "Enter pressed with no matching commands for:",
            inputValue,
          );
        }
        event.preventDefault();
      } else if (event.key === "ArrowDown") {
        setSelectedIndex(
          (prev) =>
            Math.min(prev + 1, Math.max(0, filteredCommands.length - 1)), // Ensure not -1 if list is empty
        );
        event.preventDefault();
      } else if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        event.preventDefault();
      }
    },
    [
      onClose,
      onSelectCommand,
      filteredCommands,
      selectedIndex,
      inputValue,
      isLoading,
    ],
  );

  const handleItemClick = (index: number) => {
    setSelectedIndex(index);
    onSelectCommand(filteredCommands[index].id); // Pass ID
  };

  return (
    <div
      className="w-[600px] absolute top-10 left-1/3 max-w-[90vw] bg-gray-900 border border-gray-700 rounded-lg shadow-lg flex flex-col overflow-hidden font-mono"
      onClick={(e) => e.stopPropagation()} // Prevent clicks on the backdrop from closing
    >
      <div className="flex items-center space-x-2 px-3 py-2 border-b border-gray-700 relative">
        <LuTerminal className="text-gray-400 h-4 w-4 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          className="flex-grow px-1 py-1 text-sm bg-transparent text-gray-300 focus:outline-none" // Adjusted padding
          placeholder="Enter command..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {/* Scroll indicators absolutely positioned within the input container */}
        {showScrollUp && (
          <LuChevronUp className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 h-4 w-4 pointer-events-none" />
        )}
        {showScrollDown && (
          <LuChevronDown className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 h-4 w-4 pointer-events-none" />
        )}
      </div>

      {/* Command List Area */}
      <div className="relative">
        {" "}
        {/* Container for list and fade */}
        {isLoading ? (
          <div className="px-4 py-3 text-gray-500">Loading commands...</div>
        ) : filteredCommands.length > 0 ? (
          <ul
            className="list-none m-0 p-0 max-h-[400px] overflow-y-auto" // Changed overflow to auto
            ref={listRef}
          >
            {filteredCommands.map((cmd, index) => (
              <li
                key={cmd.id}
                className={`px-4 py-2 cursor-pointer border-b border-gray-800 last:border-b-0 ${
                  // Slightly lighter border
                  index === selectedIndex
                    ? "bg-gray-700" // Brighter selection
                    : "hover:bg-gray-800" // Standard hover
                } transition-colors duration-100`}
                onClick={() => handleItemClick(index)}
                onMouseEnter={() => setSelectedIndex(index)} // Keep hover selection tracking
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-200 text-sm">
                    {cmd.name}
                    {!cmd.isUserDefined && (
                      <span className="text-xs text-blue-400 ml-2">
                        (Built-in)
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5">
                    {/* Slightly darker description */}
                    {cmd.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          inputValue.length > 0 && (
            <div className="px-4 py-3 text-gray-500">
              No commands found matching "{inputValue}"
            </div>
          )
        )}
        {/* Fade effect - only show if list is scrollable */}
        {filteredCommands.length > 5 && ( // Example threshold for showing fade
          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
        )}
      </div>
    </div>
  );
};
