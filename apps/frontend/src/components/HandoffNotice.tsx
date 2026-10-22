import React from "react";
import { UserCheck, Clock, MessageSquare } from "lucide-react";

interface HandoffNoticeProps {
  onReset: () => void;
}

export const HandoffNotice: React.FC<HandoffNoticeProps> = ({ onReset }) => {
  return (
    <div className="mx-4 my-3 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs shadow-sm animate-in fade-in duration-200">
      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
        <UserCheck className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5 font-semibold text-amber-300">
          <Clock className="w-3.5 h-3.5" />
          <span>Connected with Human Support</span>
        </div>
        <p className="mt-1 text-[11px] text-amber-200/80 leading-relaxed">
          This conversation is now monitored by our support specialists. You can continue sending your questions below and our team will answer you directly here.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <MessageSquare className="w-3 h-3" />
            Live chat active
          </span>
          <button
            onClick={onReset}
            className="text-[11px] font-medium text-amber-400/80 hover:text-amber-300 underline underline-offset-2"
          >
            Switch back to AI
          </button>
        </div>
      </div>
    </div>
  );
};
