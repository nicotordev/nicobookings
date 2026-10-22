import React, { useState } from "react";
import { Sidebar, type NavTab } from "./Sidebar";
import { Topbar } from "./Topbar";
import { OverviewView } from "./OverviewView";
import { BookingsView } from "./BookingsView";
import { CustomersView } from "./CustomersView";
import { ServicesView } from "./ServicesView";
import { HandoffsView } from "./HandoffsView";

export const DashboardLayout: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>("overview");

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar currentTab={currentTab} />

        <main className="flex-1 p-8 overflow-y-auto">
          {currentTab === "overview" && <OverviewView />}
          {currentTab === "bookings" && <BookingsView />}
          {currentTab === "customers" && <CustomersView />}
          {currentTab === "services" && <ServicesView />}
          {currentTab === "handoffs" && <HandoffsView />}
        </main>

        <footer className="px-8 py-4 border-t border-slate-800/60 text-slate-500 text-[11px] flex items-center justify-between">
          <span>© 2026 NicoBookings • All rights reserved</span>
          <span>Admin Portal v1.0.0</span>
        </footer>
      </div>
    </div>
  );
};
