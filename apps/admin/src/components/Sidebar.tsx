import React from "react";
import { LayoutDashboard, Calendar, Users, Sparkles, LogOut, Headphones } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export type NavTab = "overview" | "bookings" | "customers" | "services" | "handoffs";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: "overview" as NavTab, label: "Overview", icon: LayoutDashboard },
    { id: "bookings" as NavTab, label: "Bookings", icon: Calendar },
    { id: "customers" as NavTab, label: "Customers", icon: Users },
    { id: "services" as NavTab, label: "Services", icon: Sparkles },
    { id: "handoffs" as NavTab, label: "AI Handoffs", icon: Headphones },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-indigo-600/30">
          N
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight text-white block">
            Nico<span className="text-indigo-400">Bookings</span>
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            Admin Console
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-6 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
              {user?.username?.substring(0, 2).toUpperCase() || "AD"}
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-medium text-slate-200 truncate">
                {user?.username || "Admin"}
              </span>
              <span className="block text-[10px] text-slate-500 capitalize">
                {user?.role || "Administrator"}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
