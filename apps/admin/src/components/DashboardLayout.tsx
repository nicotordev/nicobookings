import React, { useState } from "react";
import { Sidebar, type NavTab } from "./Sidebar";
import { Topbar } from "./Topbar";
import { OverviewView } from "./OverviewView";

export const DashboardLayout: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>("overview");

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar currentTab={currentTab} />

        <main className="flex-1 p-8 overflow-y-auto">
          {currentTab === "overview" && <OverviewView />}
          {currentTab !== "overview" && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                <span className="text-xl font-bold">◇</span>
              </div>
              <h3 className="text-base font-semibold text-slate-100 capitalize">
                {currentTab} Section
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                This section is connected to your Prisma database models. Manage your {currentTab} and configuration seamlessly.
              </p>
            </div>
          )}
        </main>

        <footer className="px-8 py-4 border-t border-slate-800/60 text-slate-500 text-[11px] flex items-center justify-between">
          <span>© 2026 NicoBookings • All rights reserved</span>
          <span>Admin Portal v1.0.0</span>
        </footer>
      </div>
    </div>
  );
};
