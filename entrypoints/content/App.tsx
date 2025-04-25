import { CommandUI } from "@/components/CommandUI";

interface AppProps {
  onClose: () => void;
  onSelectCommand: (command: string) => void;
  error?: string;
}

export default function App({ onClose, onSelectCommand, error }: AppProps) {
  return (
    <div
      onClick={() => onClose()}
      className="w-full h-full flex justify-center pt-28"
    >
      <CommandUI 
        onSelectCommand={onSelectCommand} 
        onClose={onClose}
        error={error}
      />
    </div>
  );
}
