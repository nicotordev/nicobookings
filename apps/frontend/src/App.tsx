import React, { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage, CustomerProfile } from "./types/chat";
import { fetchConversationMessages, sendChatMessage } from "./services/api";
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
    if (fromUrl) {
      localStorage.setItem("nicobookings_conversation_id", fromUrl);
      return fromUrl;
    }
    const stored = localStorage.getItem("nicobookings_conversation_id");
    if (stored) return stored;
    const created = crypto.randomUUID();
    localStorage.setItem("nicobookings_conversation_id", created);
    return created;
  });

  // Frictionless customer identity
  const [customer, setCustomer] = useState<CustomerProfile | undefined>(() => {
    const name = urlParams.get("name");
    const email = urlParams.get("email");
    const phone = urlParams.get("phone");
    if (name || email || phone) {
      const fromUrl: CustomerProfile = {
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined,
      };
      localStorage.setItem("nicobookings_customer", JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = localStorage.getItem("nicobookings_customer");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return undefined;
      }
    }
    return undefined;
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

  // Load message history on initial load or conversation change
  useEffect(() => {
    if (!conversationId) return;
    fetchConversationMessages(conversationId)
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
        if (data.customer && (!customer?.name || customer.name === "Guest Customer")) {
          setCustomer(data.customer);
          localStorage.setItem("nicobookings_customer", JSON.stringify(data.customer));
        }
        if (data.status === "HUMAN_HANDOFF") {
          setIsHandedOff(true);
        }
      })
      .catch(() => {});
  }, [conversationId]);

  // Poll for replies when handed off to human support
  const pollMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await fetchConversationMessages(conversationId);
      if (data.messages && data.messages.length > 0) {
        setMessages((prev) => {
          // If message counts or contents differ, sync with latest
          if (data.messages.length > prev.length) {
            return data.messages;
          }
          return prev;
        });
      }

      if (data.customer && (!customer?.name || customer.name === "Guest Customer")) {
        setCustomer(data.customer);
        localStorage.setItem("nicobookings_customer", JSON.stringify(data.customer));
      }

      if (data.status === "ACTIVE" && isHandedOff) {
        setIsHandedOff(false);
      } else if (data.status === "HUMAN_HANDOFF" && !isHandedOff) {
        setIsHandedOff(true);
      }
    } catch {
      // Quiet fail on polling error
    }
  }, [conversationId, isHandedOff, customer]);

  useEffect(() => {
    if (!isHandedOff) return;
    const interval = setInterval(pollMessages, 3000);
    return () => clearInterval(interval);
  }, [isHandedOff, pollMessages]);

  const handleUpdateCustomer = (profile: CustomerProfile) => {
    setCustomer(profile);
    localStorage.setItem("nicobookings_customer", JSON.stringify(profile));
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText ?? input).trim();
    if (!textToSend || isLoading) return;

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
      const response = await sendChatMessage(conversationId, textToSend, customer);

      if (response.conversationId && response.conversationId !== conversationId) {
        setConversationId(response.conversationId);
        localStorage.setItem("nicobookings_conversation_id", response.conversationId);
      }

      if (response.customer) {
        setCustomer(response.customer);
        localStorage.setItem("nicobookings_customer", JSON.stringify(response.customer));
      }

      const assistantMessage: ChatMessage = {
        id: "msg_" + Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: response.reply,
        timestamp: new Date(),
        metadata: response.isStaffMode ? { author: "staff" } : null,
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
    const newId = crypto.randomUUID();
    localStorage.setItem("nicobookings_conversation_id", newId);
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
          customer={customer}
          onUpdateCustomer={handleUpdateCustomer}
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
          disabled={false}
          placeholder={isHandedOff ? "Message human support specialist..." : "Ask a question or book an appointment..."}
        />
      </main>
    </div>
  );
};
