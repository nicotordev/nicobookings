import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Filter,
  Check,
  Ban,
  CalendarCheck,
} from "lucide-react";
import type { Booking, BookingStatus } from "../types/admin";
import { adminApi } from "../services/api";

export const BookingsView: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getBookings({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      setBookings(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load bookings.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    setUpdatingId(id);
    try {
      await adminApi.updateBookingStatus(id, newStatus);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b)),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update booking status.";
      alert(msg);
    } finally {
      setUpdatingId(null);
    }
  };

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
            <CalendarCheck className="w-3 h-3" />
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Bookings & Appointments
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage, confirm, and update customer appointment schedules
          </p>
        </div>

        <button
          onClick={() => loadBookings()}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadBookings()} className="underline font-medium hover:text-rose-200">
            Try Again
          </button>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, service, phone or email..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs shrink-0">
            {["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white font-medium shadow-sm"
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
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Service</th>
                <th className="px-6 py-3.5">Schedule</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading && bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span>Loading appointments from backend...</span>
                    </div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    No bookings found. As customers book via the AI chat, appointments will appear here.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
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
                            {b.customerEmail || b.customerPhone || "No contact info"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-200 font-medium block">{b.serviceName}</span>
                      <span className="text-[11px] text-slate-500">{b.durationMins || 60} mins</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-300 block">{b.dateTime}</span>
                      {b.notes && (
                        <span className="text-[11px] text-slate-500 block truncate max-w-xs" title={b.notes}>
                          Note: {b.notes}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(b.status)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-200">
                      {b.amount}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === "PENDING" && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, "CONFIRMED")}
                            disabled={updatingId === b.id}
                            title="Confirm Booking"
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(b.status === "CONFIRMED" || b.status === "PENDING") && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, "COMPLETED")}
                            disabled={updatingId === b.id}
                            title="Mark Completed"
                            className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 transition-colors disabled:opacity-50"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {b.status !== "CANCELLED" && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, "CANCELLED")}
                            disabled={updatingId === b.id}
                            title="Cancel Booking"
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
