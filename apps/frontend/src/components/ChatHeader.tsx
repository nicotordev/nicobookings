import React, { useState } from "react";
import { Bot, RotateCcw, Sparkles, User, Check, X } from "lucide-react";
import type { CustomerProfile } from "../types/chat";

interface ChatHeaderProps {
  contractorName: string;
  isHandedOff: boolean;
  customer?: CustomerProfile;
  onUpdateCustomer?: (profile: CustomerProfile) => void;
  onReset: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  contractorName,
  isHandedOff,
  customer,
  onUpdateCustomer,
  onReset,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(customer?.name || "");
  const [email, setEmail] = useState(customer?.email?.startsWith("guest_") ? "" : customer?.email || "");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateCustomer) {
      onUpdateCustomer({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: customer?.phone,
      });
    }
    setIsEditing(false);
  };

  const hasIdentity = customer?.name && customer.name !== "Guest Customer";

  return (
    <header className="px-5 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                isHandedOff ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
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
                ? "Live support specialist connected"
                : "Online • Typically replies instantly"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Frictionless identity pill */}
          <button
            onClick={() => {
              setName(customer?.name && customer.name !== "Guest Customer" ? customer.name : "");
              setEmail(customer?.email?.startsWith("guest_") ? "" : customer?.email || "");
              setIsEditing(!isEditing);
            }}
            title={hasIdentity ? "Click to view/edit your identity" : "Click to identify yourself"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
              hasIdentity
                ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/25"
                : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="max-w-[100px] truncate">
              {hasIdentity ? customer?.name : "Identify"}
            </span>
          </button>

          <button
            onClick={onReset}
            title="Start new conversation"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700/60"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline lightweight identity dialog */}
      {isEditing && (
        <form onSubmit={handleSave} className="mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">Your details (optional)</span>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
            >
              <Check className="w-3 h-3" />
              Save
            </button>
          </div>
        </form>
      )}
    </header>
  );
};
