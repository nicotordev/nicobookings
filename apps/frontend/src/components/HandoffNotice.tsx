import React from "react";
import { UserCheck, Clock } from "lucide-react";

interface HandoffNoticeProps {
  onReset: () => void;
}

export const HandoffNotice: React.FC<HandoffNoticeProps> = ({ onReset }) => {
  return (
    <div className="mx-4 my-3 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs">
      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
        <UserCheck className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5 font-semibold text-amber-300">
          <Clock className="w-3.5 h-3.5" />
          <span>Transferred to a human specialist</span>
        </div>
        <p className="mt-1 text-[11px] text-amber-200/80 leading-relaxed">
          This conversation has been escalated to our team for personalized assistance. A representative will get back to you shortly.
        </p>
        <button
          onClick={onReset}
          className="mt-2 text-[11px] font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          Start a new conversation with the AI assistant
        </button>
      </div>
    </div>
  );
};
