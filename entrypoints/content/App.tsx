import React from "react";
import { CommandUI } from "@/components/CommandUI";

interface AppProps {
  onClose: () => void;
  onSelectCommand: (command: string) => void;
}

export default function App({ onClose, onSelectCommand }: AppProps) {
  return (
    <div
      onClick={() => onClose()}
      className="w-full h-full flex justify-center pt-28"
    >
      <CommandUI
        // Pass the new handler function
        onSelectCommand={onSelectCommand}
        onClose={onClose}
      />
    </div>
  );
}
