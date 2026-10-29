import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

export const DesktopWindowFrame: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsElectron(true);
    }
  }, []);

  // Only render native frame controls if running within actual Electron window
  if (!isElectron) {
    return null;
  }

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = async () => {
    if (window.electronAPI) {
      await window.electronAPI.maximizeWindow();
      const max = await window.electronAPI.isMaximized();
      setIsMaximized(max);
    }
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <div className="window-drag-region h-7 bg-[#211E1C] text-stone-300 flex items-center justify-between px-3 select-none text-xs shrink-0 z-50">
      <div className="text-[11px] font-mono text-stone-400">CueMaster Windows Desktop</div>
      <div className="flex items-center window-no-drag -mr-3 h-full">
        <button
          onClick={handleMinimize}
          className="h-7 w-9 flex items-center justify-center hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors"
          title="Minimize"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-7 w-9 flex items-center justify-center hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? <Copy className="w-2.5 h-2.5 rotate-180" /> : <Square className="w-2.5 h-2.5" />}
        </button>
        <button
          onClick={handleClose}
          className="h-7 w-9 flex items-center justify-center hover:bg-rose-600 text-stone-400 hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
