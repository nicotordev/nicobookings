import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Clock,
} from "lucide-react";
import type { Customer } from "../types/admin";
import { adminApi } from "../services/api";

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getCustomers(search.trim() || undefined);
      setCustomers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load customers.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Never";
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(isoString));
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Customer Directory
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Profiles, booking frequency, and contact records
          </p>
        </div>

        <button
          onClick={() => loadCustomers()}
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
          <button onClick={() => loadCustomers()} className="underline font-medium hover:text-rose-200">
            Try Again
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, email, or phone..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Customer Name</th>
                <th className="px-6 py-3.5">Contact Details</th>
                <th className="px-6 py-3.5">Total Bookings</th>
                <th className="px-6 py-3.5">Last Appointment</th>
                <th className="px-6 py-3.5 text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading && customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span>Loading customers...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    No customers found. Clients interacting with the AI chat will be listed here.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-200">
                          {c.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {c.email && c.email !== "No email" && (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{c.email}</span>
                          </div>
                        )}
                        {c.phone && c.phone !== "No phone" && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {(!c.email || c.email === "No email") && (!c.phone || c.phone === "No phone") && (
                          <span className="text-slate-500 text-[11px]">No contact details</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        <Calendar className="w-3 h-3" />
                        {c.totalBookings} {c.totalBookings === 1 ? "booking" : "bookings"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatDate(c.lastBookingAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 text-[11px]">
                      {formatDate(c.createdAt)}
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
