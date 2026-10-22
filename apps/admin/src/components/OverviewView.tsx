import React, { useState, useEffect, useCallback } from "react";
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
  RefreshCw,
  Loader2,
} from "lucide-react";
import type { Booking, BookingStatus, OverviewMetrics } from "../types/admin";
import { adminApi } from "../services/api";

export const OverviewView: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getOverview();
      setMetrics(data.metrics);
      setRecentBookings(data.recentBookings);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard data.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredBookings = recentBookings.filter((b) => {
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
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
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
            Real-time activity and booking metrics from your database
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
            Refresh
          </button>
          <div className="text-xs text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected to Backend
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadData()}
            className="underline font-medium hover:text-rose-200"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Total Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading && !metrics ? (
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            ) : (
              metrics?.totalBookings ?? 0
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2">
            <TrendingUp className="w-3 h-3" />
            <span>Lifetime bookings</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading && !metrics ? (
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            ) : (
              metrics?.totalRevenueFormatted ?? "$0.00"
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2">
            <TrendingUp className="w-3 h-3" />
            <span>Confirmed & Completed</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Registered Clients</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading && !metrics ? (
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            ) : (
              metrics?.totalCustomers ?? 0
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2">
            <TrendingUp className="w-3 h-3" />
            <span>Active client profiles</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Pending Requests</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading && !metrics ? (
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            ) : (
              metrics?.pendingRequests ?? 0
            )}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-2">
            Bookings + AI handoffs needing review
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
              Live customer appointments booked via the AI assistant or admin console
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
              {["ALL", "CONFIRMED", "PENDING", "COMPLETED", "CANCELLED"].map((st) => (
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
              {isLoading && recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-xs">Loading appointments...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
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
