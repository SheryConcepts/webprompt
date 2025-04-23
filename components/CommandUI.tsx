import React, { useState, useEffect, useRef, useCallback } from "react";
import { getAllCommands, searchCommands, Command } from "@/lib/commands";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showScrollUp, setShowScrollUp] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    (async () => {
      if (inputValue.length > 0) {
        console.log(await searchCommands(inputValue));
        setFilteredCommands(await searchCommands(inputValue));
      } else {
        setFilteredCommands([]);
      }
      setSelectedIndex(0);
    })();
  }, [inputValue]);

  useEffect(() => {
    if (listRef.current) {
      const list = listRef.current;
      const handleScroll = () => {
        setShowScrollUp(list.scrollTop > 0);
        setShowScrollDown(
          list.scrollTop + list.clientHeight < list.scrollHeight,
        );
      };

      handleScroll(); // Initial check
      list.addEventListener("scroll", handleScroll);
      const selectedItem = list.children[selectedIndex] as HTMLLIElement;
      selectedItem?.scrollIntoView({ block: "nearest" });

      return () => list.removeEventListener("scroll", handleScroll); // Cleanup
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
          onSelectCommand(filteredCommands[selectedIndex].id);
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
    onSelectCommand(filteredCommands[index].id);
  };

  return (
    <div
      className="w-[600px] absolute top-10 left-1/3 max-w-[90vw] bg-gray-900 border border-gray-700 rounded-lg shadow-lg flex flex-col overflow-hidden font-mono"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center space-x-2 px-3 py-2 border-b border-gray-700 relative">
        {" "}
        {/* Relative positioning */}
        <LuTerminal className="text-gray-400 h-4 w-4" />
        <input
          ref={inputRef}
          type="text"
          className="w-full px-0 py-2 text-sm bg-transparent text-gray-300 focus:outline-none"
          placeholder="Enter command..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {showScrollUp && (
          <LuChevronUp className="absolute right-3 text-gray-500 h-4 w-4" />
        )}
        {showScrollDown && (
          <LuChevronDown className="absolute right-3 text-gray-500 h-4 w-4" />
        )}
      </div>

      {filteredCommands.length > 0 && (
        <div className="relative">
          <ul
            className="list-none m-0 p-0 max-h-[400px] overflow-y-hidden"
            ref={listRef}
          >
            {filteredCommands.map((cmd, index) => (
              <li
                key={cmd.id}
                className={`px-4 py-2 cursor-pointer border-b border-gray-700 last:border-b-0 ${
                  index === selectedIndex
                    ? "bg-gray-800"
                    : "hover:bg-gray-800/50"
                } transition-colors duration-100 ${index === filteredCommands.length - 1 ? "pb-10" : ""}`}
                onClick={() => handleItemClick(index)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-200 text-sm">
                    {cmd.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {cmd.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-gray-900 pointer-events-none"></div>
        </div>
      )}
      {filteredCommands.length === 0 && inputValue.length > 0 && (
        <div className="px-4 py-3 text-gray-500">No commands found</div>
      )}
    </div>
  );
};
