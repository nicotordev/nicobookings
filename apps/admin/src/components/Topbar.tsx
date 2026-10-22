import React, { useState, useEffect } from "react";
import { Bell, Activity } from "lucide-react";
import type { NavTab } from "./Sidebar";

interface TopbarProps {
  currentTab: NavTab;
}

export const Topbar: React.FC<TopbarProps> = ({ currentTab }) => {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkApi = async () => {
      try {
        const res = await fetch("/api/health");
        if (isMounted) setApiOnline(res.ok);
      } catch {
        if (isMounted) setApiOnline(false);
      }
    };

    checkApi();
    const interval = setInterval(checkApi, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const tabLabels: Record<NavTab, string> = {
    overview: "Overview",
    bookings: "Bookings",
    customers: "Customers",
    services: "Services",
    handoffs: "AI Handoffs",
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500">Workspace</span>
        <span className="text-slate-600">/</span>
        <span className="text-slate-200 font-medium">{tabLabels[currentTab]}</span>
      </div>

      {/* Topbar Actions */}
      <div className="flex items-center gap-4">
        {/* API Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <span
            className={`w-2 h-2 rounded-full ${
              apiOnline === true
                ? "bg-emerald-400 animate-pulse"
                : apiOnline === false
                ? "bg-rose-500"
                : "bg-amber-400"
            }`}
          />
          <span className="text-slate-300 text-[11px]">
            {apiOnline === true
              ? "API Connected"
              : apiOnline === false
              ? "API Offline"
              : "Connecting..."}
          </span>
        </div>

        {/* Notifications */}
        <button
          title="Notifications"
          className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
        </button>
      </div>
    </header>
  );
};
