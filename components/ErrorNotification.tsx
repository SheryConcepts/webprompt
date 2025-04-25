import  { useEffect, useState } from "react";

export default function ErrorNotification({ error }: { error: string }) {
  const [visible, setVisible] = useState(!!error);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!visible) return null;

  // TODO: impl. error toasts
  return null;

  // return (
  //   <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
  //     <div className="flex items-center">
  //       <span className="mr-2">⚠️</span>
  //       <span>{error} from ui</span>
  //     </div>
  //   </div>
  // );
}