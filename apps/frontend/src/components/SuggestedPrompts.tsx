import React from "react";
import { Calendar, Clock, DollarSign, HelpCircle } from "lucide-react";

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

const DEFAULT_PROMPTS = [
  {
    icon: DollarSign,
    label: "Services & Pricing",
    text: "What services do you offer and what are your rates?",
  },
  {
    icon: Clock,
    label: "Available Slots",
    text: "What time slots do you have available for tomorrow?",
  },
  {
    icon: Calendar,
    label: "Book Appointment",
    text: "I would like to schedule an appointment for this week.",
  },
  {
    icon: HelpCircle,
    label: "Cancel or Reschedule",
    text: "I need to check or cancel an existing booking.",
  },
];

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
        <Calendar className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-100">
        How can we help you today?
      </h3>
      <p className="text-xs text-slate-400 max-w-xs mt-1 mb-6">
        Choose a suggested option below or send your inquiry directly.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md">
        {DEFAULT_PROMPTS.map((p, idx) => {
          const Icon = p.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelect(p.text)}
              className="group flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-800/80 hover:border-indigo-500/40 text-left transition-all duration-200"
            >
              <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-indigo-600/20 text-slate-400 group-hover:text-indigo-400 transition-colors">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-medium text-slate-200 group-hover:text-indigo-300">
                  {p.label}
                </span>
                <span className="block text-[11px] text-slate-400 truncate">
                  {p.text}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
