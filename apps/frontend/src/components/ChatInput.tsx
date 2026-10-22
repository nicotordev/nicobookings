import React, { useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  isLoading,
  disabled,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140,
      )}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !disabled && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="p-3 bg-slate-900/90 backdrop-blur-md border-t border-slate-800/80 sticky bottom-0 z-20">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isLoading && !disabled && input.trim()) {
            onSend();
          }
        }}
        className="flex items-end gap-2 bg-slate-950 border border-slate-800 focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/30 rounded-2xl p-1.5 transition-all"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Conversation handed off to human agent..." : "Type your message or inquiry..."}
          disabled={disabled || isLoading}
          rows={1}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 resize-none outline-none max-h-36 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading || disabled}
          className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white disabled:opacity-40 disabled:hover:from-indigo-600 hover:from-indigo-500 hover:to-violet-500 transition-all shadow-md shadow-indigo-600/20 shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
      <p className="text-[10px] text-center text-slate-600 mt-2">
        NicoBookings Assistant • Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};
