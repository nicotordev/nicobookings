import React from "react";
import type { ChatMessage } from "../types/chat";
import { Bot, User, AlertCircle } from "lucide-react";

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isUser = message.role === "user";

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(message.timestamp);

  return (
    <div
      className={`flex gap-3 px-4 py-2 ${
        isUser ? "flex-row-reverse" : "flex-row"
      } animate-in fade-in slide-in-from-bottom-2 duration-200`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white ${
          isUser
            ? "bg-gradient-to-tr from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/20"
            : "bg-slate-800 border border-slate-700/60 text-indigo-400"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div
        className={`flex flex-col max-w-[82%] sm:max-w-[75%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm shadow-md shadow-indigo-600/10"
              : message.isError
              ? "bg-rose-950/40 border border-rose-500/30 text-rose-200 rounded-tl-sm flex items-center gap-2"
              : "bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm shadow-sm"
          }`}
        >
          {message.isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{message.content}</span>
        </div>

        <span className="text-[10px] text-slate-500 mt-1 px-1">
          {formattedTime}
        </span>
      </div>
    </div>
  );
};
