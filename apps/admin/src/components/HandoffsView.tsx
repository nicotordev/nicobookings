import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Headphones,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  UserCheck,
  Filter,
  Check,
  MessageSquare,
  Send,
  X,
  Bot,
  User,
  ShieldCheck,
} from "lucide-react";
import type { ConversationDetail, HandoffStatus, HumanHandoffItem } from "../types/admin";
import { adminApi } from "../services/api";

export const HandoffsView: React.FC = () => {
  const [handoffs, setHandoffs] = useState<HumanHandoffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Conversation modal state
  const [selectedHandoff, setSelectedHandoff] = useState<HumanHandoffItem | null>(null);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadHandoffs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getHandoffs(statusFilter !== "ALL" ? statusFilter : undefined);
      setHandoffs(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load handoffs.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadHandoffs();
  }, [loadHandoffs]);

  // Load conversation details when a handoff is selected
  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const data = await adminApi.getConversation(conversationId);
      setConversation(data);
    } catch (err) {
      console.error("Failed to load conversation details:", err);
    }
  }, []);

  const handleOpenConversation = async (handoff: HumanHandoffItem) => {
    setSelectedHandoff(handoff);
    setLoadingConv(true);
    try {
      await loadConversation(handoff.conversationId);
    } finally {
      setLoadingConv(false);
    }
  };

  const handleCloseConversation = () => {
    setSelectedHandoff(null);
    setConversation(null);
    setReplyText("");
  };

  // Auto poll conversation messages when modal is open
  useEffect(() => {
    if (!selectedHandoff) return;

    const interval = setInterval(() => {
      loadConversation(selectedHandoff.conversationId);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedHandoff, loadConversation]);

  // Scroll to bottom when conversation messages change
  useEffect(() => {
    if (conversation?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages]);

  const handleTakeConversation = async (conversationId: string) => {
    try {
      const result = await adminApi.takeConversation(conversationId);
      // Update local state
      setHandoffs((prev) =>
        prev.map((h) =>
          h.conversationId === conversationId
            ? { ...h, status: "ASSIGNED", assignedTo: result.assignedTo }
            : h,
        ),
      );
      if (selectedHandoff?.conversationId === conversationId) {
        setSelectedHandoff((prev) => (prev ? { ...prev, status: "ASSIGNED", assignedTo: result.assignedTo } : prev));
      }
      await loadConversation(conversationId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign conversation.";
      alert(msg);
    }
  };

  const handleResolveConversation = async (conversationId: string) => {
    try {
      await adminApi.resolveConversation(conversationId);
      // Update local state
      setHandoffs((prev) =>
        prev.map((h) =>
          h.conversationId === conversationId
            ? { ...h, status: "RESOLVED" }
            : h,
        ),
      );
      if (selectedHandoff?.conversationId === conversationId) {
        setSelectedHandoff((prev) => (prev ? { ...prev, status: "RESOLVED" } : prev));
      }
      await loadConversation(conversationId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resolve conversation.";
      alert(msg);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHandoff || !replyText.trim() || sendingReply) return;

    const text = replyText.trim();
    setSendingReply(true);
    try {
      const newMsg = await adminApi.sendReply(selectedHandoff.conversationId, text);
      setReplyText("");
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, newMsg],
            }
          : prev,
      );
      // Auto-assign handoff locally if was open
      setHandoffs((prev) =>
        prev.map((h) =>
          h.conversationId === selectedHandoff.conversationId && h.status === "OPEN"
            ? { ...h, status: "ASSIGNED" }
            : h,
        ),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reply.";
      alert(msg);
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: HandoffStatus) => {
    setUpdatingId(id);
    try {
      await adminApi.updateHandoff(id, { status: newStatus });
      setHandoffs((prev) =>
        prev.map((h) => (h.id === id ? { ...h, status: newStatus } : h)),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update handoff status.";
      alert(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: HandoffStatus) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Open
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <UserCheck className="w-3 h-3" />
            Assigned
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            AI Escalations & Human Handoffs
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Take over live conversations from the AI, reply directly to clients, and resolve escalations
          </p>
        </div>

        <button
          onClick={() => loadHandoffs()}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadHandoffs()} className="underline font-medium hover:text-rose-200">
            Try Again
          </button>
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          {["ALL", "OPEN", "ASSIGNED", "RESOLVED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                statusFilter === st
                  ? "bg-indigo-600 text-white font-medium shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {st.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Escalation Reason</th>
                <th className="px-6 py-3.5">Channel</th>
                <th className="px-6 py-3.5">Requested At</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading && handoffs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span>Loading handoff requests...</span>
                    </div>
                  </td>
                </tr>
              ) : handoffs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Headphones className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    No human handoff requests found. The AI agent handles inquiries autonomously.
                  </td>
                </tr>
              ) : (
                handoffs.map((h) => (
                  <tr
                    key={h.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => handleOpenConversation(h)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                          {h.customerName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-slate-200 block">
                            {h.customerName}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {h.customerEmail !== "N/A" ? h.customerEmail : h.customerPhone}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-slate-200 font-medium">{h.reason}</p>
                        {h.assignedTo && (
                          <p className="text-[11px] text-sky-400">
                            Assigned to: {h.assignedTo}
                          </p>
                        )}
                        {h.notes && (
                          <p className="text-[11px] text-slate-400 italic">
                            Staff Note: {h.notes}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        <MessageSquare className="w-3 h-3 text-indigo-400" />
                        {h.channel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatDate(h.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(h.status)}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenConversation(h)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 text-indigo-300 hover:bg-indigo-600/25 border border-indigo-500/30 transition-all font-medium text-xs shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat / Reply</span>
                        </button>

                        {h.status !== "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(h.id, "RESOLVED")}
                            disabled={updatingId === h.id}
                            title="Mark as Resolved"
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Conversation Modal & Reply Interface */}
      {selectedHandoff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl h-[90vh] max-h-[820px] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                  {selectedHandoff.customerName.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm truncate">
                      {selectedHandoff.customerName}
                    </h3>
                    {getStatusBadge(selectedHandoff.status)}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {selectedHandoff.customerEmail !== "N/A" ? selectedHandoff.customerEmail : selectedHandoff.customerPhone} • {selectedHandoff.reason}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {selectedHandoff.status === "OPEN" && (
                  <button
                    onClick={() => handleTakeConversation(selectedHandoff.conversationId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-all shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Take Over</span>
                  </button>
                )}

                {selectedHandoff.status !== "RESOLVED" && (
                  <button
                    onClick={() => handleResolveConversation(selectedHandoff.conversationId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve & Re-enable AI</span>
                  </button>
                )}

                <button
                  onClick={handleCloseConversation}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-slate-950/20">
              {loadingConv ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
                  <span className="text-xs">Loading conversation history...</span>
                </div>
              ) : conversation?.messages.length === 0 ? (
                <div className="text-center text-slate-500 py-12 text-xs">
                  No messages recorded in this conversation thread yet.
                </div>
              ) : (
                conversation?.messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const isStaff = msg.metadata?.author === "staff";
                  const isSystem = msg.role === "system" || msg.metadata?.author === "system";

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400">
                          {msg.content}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2.5 ${isUser ? "justify-start" : "justify-end"}`}
                    >
                      {isUser && (
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 text-xs">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div
                        className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          isUser
                            ? "bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700/60"
                            : isStaff
                            ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-tr-sm shadow-sky-600/10"
                            : "bg-slate-900 text-slate-200 rounded-tr-sm border border-indigo-500/20"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75">
                          {isUser ? (
                            <span>{selectedHandoff.customerName}</span>
                          ) : isStaff ? (
                            <span className="flex items-center gap-1 font-semibold text-sky-200">
                              <ShieldCheck className="w-3 h-3" />
                              Staff Agent ({msg.metadata?.staffUsername || "Support"})
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-indigo-300">
                              <Bot className="w-3 h-3" />
                              AI Booking Assistant
                            </span>
                          )}
                          <span>•</span>
                          <span>{formatDate(msg.timestamp)}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {!isUser && (
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                            isStaff
                              ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                              : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          }`}
                        >
                          {isStaff ? <ShieldCheck className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handleSendReply} className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type your reply to customer as support specialist..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={sendingReply}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sendingReply}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/25 disabled:opacity-40"
              >
                {sendingReply ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
