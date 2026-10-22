import React, { useState, useEffect, useRef } from "react";
import type { ChatMessage } from "./types/chat";
import { sendChatMessage } from "./services/api";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessageItem } from "./components/ChatMessageItem";
import { ChatInput } from "./components/ChatInput";
import { SuggestedPrompts } from "./components/SuggestedPrompts";
import { HandoffNotice } from "./components/HandoffNotice";
import { Bot } from "lucide-react";

export const App: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialContractor = urlParams.get("contractor") || "NicoBookings";

  const [conversationId, setConversationId] = useState<string>(() => {
    const fromUrl = urlParams.get("conversationId");
    if (fromUrl) return fromUrl;
    const stored = sessionStorage.getItem("nicobookings_conversation_id");
    if (stored) return stored;
    const created = "conv_" + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem("nicobookings_conversation_id", created);
    return created;
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHandedOff, setIsHandedOff] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText ?? input).trim();
    if (!textToSend || isLoading || isHandedOff) return;

    const userMessage: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendChatMessage(conversationId, textToSend);

      if (response.conversationId && response.conversationId !== conversationId) {
        setConversationId(response.conversationId);
        sessionStorage.setItem("nicobookings_conversation_id", response.conversationId);
      }

      const assistantMessage: ChatMessage = {
        id: "msg_" + Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: response.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.humanHandoff) {
        setIsHandedOff(true);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred while processing your request.";
      const errorChatMsg: ChatMessage = {
        id: "err_" + Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorChatMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConversation = () => {
    const newId = "conv_" + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem("nicobookings_conversation_id", newId);
    setConversationId(newId);
    setMessages([]);
    setIsHandedOff(false);
  };

  return (
    <div className="flex justify-center min-h-screen bg-slate-950 text-slate-100 sm:p-4">
      <main className="flex flex-col w-full max-w-xl bg-slate-900 sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden min-h-screen sm:min-h-[700px] sm:max-h-[880px]">
        <ChatHeader
          contractorName={initialContractor}
          isHandedOff={isHandedOff}
          onReset={handleResetConversation}
        />

        <div className="flex-1 overflow-y-auto px-1 py-4 space-y-1">
          {messages.length === 0 ? (
            <SuggestedPrompts onSelect={(prompt) => handleSend(prompt)} />
          ) : (
            messages.map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} />
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-3 px-4 py-2 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center text-indigo-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-900 border border-slate-800 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
              </div>
            </div>
          )}

          {isHandedOff && <HandoffNotice onReset={handleResetConversation} />}

          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => handleSend()}
          isLoading={isLoading}
          disabled={isHandedOff}
        />
      </main>
    </div>
  );
};
