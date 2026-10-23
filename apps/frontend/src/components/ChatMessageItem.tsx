import React from "react";
import type { ChatMessage } from "../types/chat";
import { Bot, User, AlertCircle, ShieldCheck } from "lucide-react";

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isUser = message.role === "user";
  const isStaff = message.metadata?.author === "staff";
  const isSystem = message.role === "system" || message.metadata?.author === "system";

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(message.timestamp);

  if (isSystem) {
    return (
      <div className="flex justify-center my-3 px-4">
        <div className="px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 text-center shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={isUser ? "message-user" : isStaff ? "message-staff" : "message-assistant"}
      className={`flex gap-3 px-4 py-2 ${
        isUser ? "flex-row-reverse" : "flex-row"
      } animate-in fade-in slide-in-from-bottom-2 duration-200`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white ${
          isUser
            ? "bg-gradient-to-tr from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/20"
            : isStaff
            ? "bg-gradient-to-tr from-sky-500 to-cyan-500 shadow-md shadow-sky-500/20 text-white"
            : "bg-slate-800 border border-slate-700/60 text-indigo-400"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : isStaff ? (
          <ShieldCheck className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      <div
        className={`flex flex-col max-w-[82%] sm:max-w-[75%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {isStaff && (
          <span className="text-[10px] text-sky-400 font-semibold mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Support Specialist ({message.metadata?.staffUsername || "Human Agent"})
          </span>
        )}

        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm shadow-md shadow-indigo-600/10"
              : isStaff
              ? "bg-slate-900 border border-sky-500/30 text-white rounded-tl-sm shadow-sm"
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
