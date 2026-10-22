import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Plus,
  RefreshCw,
  Loader2,
  Clock,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Pencil,
  X,
} from "lucide-react";
import type { Service } from "../types/admin";
import { adminApi } from "../services/api";

export const ServicesView: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("30");
  const [newDuration, setNewDuration] = useState("45");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const loadServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getServices();
      setServices(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load services.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleToggleActive = async (service: Service) => {
    try {
      const updated = await adminApi.updateService(service.id, {
        isActive: !service.isActive,
      });
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, isActive: updated.isActive } : s)),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle service status.";
      alert(msg);
    }
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setEditName(service.name);
    setEditDesc(service.description || "");
    setEditPrice((service.priceCents / 100).toString());
    setEditDuration(service.durationMins.toString());
    setEditIsActive(service.isActive);
  };

  const handleCloseEdit = () => {
    setEditingService(null);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSubmitting(true);
    try {
      const priceCents = Math.round(parseFloat(newPrice || "0") * 100);
      const durationMins = parseInt(newDuration || "60", 10);

      const created = await adminApi.createService({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        priceCents,
        durationMins,
      });

      setServices((prev) => [...prev, created]);
      setIsCreateModalOpen(false);
      setNewName("");
      setNewDesc("");
      setNewPrice("30");
      setNewDuration("45");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create service.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !editName.trim()) return;

    setSubmitting(true);
    try {
      const priceCents = Math.round(parseFloat(editPrice || "0") * 100);
      const durationMins = parseInt(editDuration || "60", 10);

      const updated = await adminApi.updateService(editingService.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        priceCents,
        durationMins,
        isActive: editIsActive,
      });

      setServices((prev) =>
        prev.map((s) => (s.id === editingService.id ? updated : s)),
      );
      handleCloseEdit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update service.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Services & Pricing Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure services, durations, and pricing offered by the AI booking agent
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadServices()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Service
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadServices()} className="underline font-medium hover:text-rose-200">
            Try Again
          </button>
        </div>
      )}

      {/* Services Grid */}
      {isLoading && services.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
          <span className="text-xs">Loading services from backend...</span>
        </div>
      ) : services.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900/80 border border-slate-800 text-center text-slate-500">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-slate-400">No services found</p>
          <p className="text-xs text-slate-500 mt-1">
            Click "Add Service" to create your first bookable appointment service.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                service.isActive
                  ? "bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-sm"
                  : "bg-slate-950/60 border-slate-800/40 opacity-70"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-white text-sm tracking-tight">
                    {service.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(service)}
                      title="Edit Service"
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800/60 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(service)}
                      title={service.isActive ? "Deactivate service" : "Activate service"}
                      className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                      {service.isActive ? (
                        <ToggleRight className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 min-h-[36px] line-clamp-2 mb-4">
                  {service.description || "No description provided."}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-300 font-medium">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{service.durationMins}m</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{service.amount}</span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    service.isActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                  }`}
                >
                  {service.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Create New Service</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Available for automatic booking by the AI agent
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Consultation"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Details and requirements for this appointment..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    required
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Edit Service</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update service details, pricing, and availability
                </p>
              </div>
              <button
                onClick={handleCloseEdit}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Consultation"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Details and requirements for this appointment..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    required
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="block text-slate-200 font-medium">Active Status</span>
                  <span className="block text-[11px] text-slate-500">
                    Customers and AI agent can book this service
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {editIsActive ? (
                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-600" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
