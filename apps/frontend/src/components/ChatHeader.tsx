import React from "react";
import { Bot, RotateCcw, Sparkles } from "lucide-react";

interface ChatHeaderProps {
  contractorName: string;
  isHandedOff: boolean;
  onReset: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  contractorName,
  isHandedOff,
  onReset,
}) => {
  return (
    <header className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
              isHandedOff ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
            }`}
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-semibold text-white tracking-tight">
              {contractorName}
            </h1>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {isHandedOff
              ? "Human support requested"
              : "Online • Typically replies instantly"}
          </p>
        </div>
      </div>

      <button
        onClick={onReset}
        title="Start new conversation"
        className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700/60"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </header>
  );
};
