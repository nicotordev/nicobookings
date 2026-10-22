import React, { useState } from "react";
import {
  Calendar,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import type { Booking, BookingStatus } from "../types/admin";

const SAMPLE_BOOKINGS: Booking[] = [
  {
    id: "b_1",
    customerName: "Sophia Martinez",
    customerEmail: "sophia.martinez@email.com",
    serviceName: "Haircut & Styling",
    dateTime: "Oct 22, 10:30 AM",
    status: "CONFIRMED",
    amount: "$85.00",
  },
  {
    id: "b_2",
    customerName: "James Rodriguez",
    customerEmail: "james.rodriguez@email.com",
    serviceName: "Initial Consultation",
    dateTime: "Oct 22, 11:00 AM",
    status: "PENDING",
    amount: "$120.00",
  },
  {
    id: "b_3",
    customerName: "Camila Lopez",
    customerEmail: "camila.lopez@email.com",
    serviceName: "Facial Care Treatment",
    dateTime: "Oct 22, 01:15 PM",
    status: "CONFIRMED",
    amount: "$95.00",
  },
  {
    id: "b_4",
    customerName: "David Perez",
    customerEmail: "david.perez@email.com",
    serviceName: "Follow-up Session",
    dateTime: "Oct 22, 02:00 PM",
    status: "CANCELLED",
    amount: "$60.00",
  },
  {
    id: "b_5",
    customerName: "Valentina Garcia",
    customerEmail: "valentina.garcia@email.com",
    serviceName: "Initial Consultation",
    dateTime: "Oct 22, 03:30 PM",
    status: "CONFIRMED",
    amount: "$120.00",
  },
];

export const OverviewView: React.FC = () => {
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const filteredBookings = SAMPLE_BOOKINGS.filter((b) => {
    const matchesFilter = filter === "ALL" || b.status === filter;
    const matchesSearch =
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      b.customerEmail.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Confirmed
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Cancelled
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
            {formattedDate}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Dashboard Overview
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time activity and booking metrics for your business
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-400 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            Last 30 days
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Total Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">248</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2">
            <TrendingUp className="w-3 h-3" />
            <span>+12.8% vs last month</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">$18,420</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2">
            <TrendingUp className="w-3 h-3" />
            <span>+8.2% vs last month</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">New Clients</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">36</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2">
            <TrendingUp className="w-3 h-3" />
            <span>+4.6% vs last month</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Pending Requests</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">12</div>
          <div className="text-[11px] text-amber-400/80 mt-2">
            Requires action
          </div>
        </div>
      </div>

      {/* Bookings Section */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Appointments</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live customer appointments booked via the AI assistant or website
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search appointments..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              {["ALL", "CONFIRMED", "PENDING", "CANCELLED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                    filter === st
                      ? "bg-indigo-600 text-white font-medium"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {st.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Service</th>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No bookings found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                          {b.customerName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-slate-200 block">
                            {b.customerName}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {b.customerEmail}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">
                      {b.serviceName}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {b.dateTime}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(b.status)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-200">
                      {b.amount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
