import type {
  Booking,
  BookingStatus,
  Customer,
  HumanHandoffItem,
  OverviewResponse,
  Service,
} from "../types/admin";

const BASE_URL = "/api";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData?.error) {
        errorDetail = errData.error;
      }
    } catch {
      // Non-json response
    }
    throw new Error(errorDetail);
  }

  return response.json() as Promise<T>;
}

export const adminApi = {
  // Overview
  async getOverview(): Promise<OverviewResponse> {
    return request<OverviewResponse>("/admin/overview");
  },

  // Bookings
  async getBookings(params?: { status?: string; search?: string }): Promise<Booking[]> {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== "ALL") {
      searchParams.set("status", params.status);
    }
    if (params?.search) {
      searchParams.set("search", params.search);
    }
    const query = searchParams.toString();
    const data = await request<{ bookings: Booking[] }>(`/admin/bookings${query ? `?${query}` : ""}`);
    return data.bookings;
  },

  async updateBookingStatus(id: string, status: BookingStatus, notes?: string): Promise<Booking> {
    const data = await request<{ booking: Booking }>(`/admin/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    });
    return data.booking;
  },

  // Customers
  async getCustomers(search?: string): Promise<Customer[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const data = await request<{ customers: Customer[] }>(`/admin/customers${query}`);
    return data.customers;
  },

  // Services
  async getServices(): Promise<Service[]> {
    const data = await request<{ services: Service[] }>("/admin/services");
    return data.services;
  },

  async createService(payload: {
    name: string;
    description?: string;
    priceCents: number;
    durationMins: number;
  }): Promise<Service> {
    const data = await request<{ service: Service }>("/admin/services", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data.service;
  },

  async updateService(
    id: string,
    payload: Partial<{
      name: string;
      description: string;
      priceCents: number;
      durationMins: number;
      isActive: boolean;
    }>,
  ): Promise<Service> {
    const data = await request<{ service: Service }>(`/admin/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return data.service;
  },

  async deactivateService(id: string): Promise<void> {
    await request<{ success: boolean }>(`/admin/services/${id}`, {
      method: "DELETE",
    });
  },

  // Human Handoffs
  async getHandoffs(status?: string): Promise<HumanHandoffItem[]> {
    const query = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
    const data = await request<{ handoffs: HumanHandoffItem[] }>(`/admin/handoffs${query}`);
    return data.handoffs;
  },

  async updateHandoff(
    id: string,
    payload: { status?: "OPEN" | "ASSIGNED" | "RESOLVED"; notes?: string; assignedTo?: string },
  ): Promise<HumanHandoffItem> {
    const data = await request<{ handoff: HumanHandoffItem }>(`/admin/handoffs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return data.handoff;
  },

  // Live Conversation taking and replies
  async getConversation(id: string): Promise<import("../types/admin").ConversationDetail> {
    const data = await request<{ conversation: import("../types/admin").ConversationDetail }>(
      `/admin/conversations/${id}`,
    );
    return data.conversation;
  },

  async sendReply(id: string, message: string): Promise<import("../types/admin").ConversationMessage> {
    const data = await request<{ message: import("../types/admin").ConversationMessage }>(
      `/admin/conversations/${id}/reply`,
      {
        method: "POST",
        body: JSON.stringify({ message }),
      },
    );
    return data.message;
  },

  async takeConversation(id: string): Promise<{ success: boolean; assignedTo: string }> {
    return request<{ success: boolean; assignedTo: string }>(`/admin/conversations/${id}/take`, {
      method: "POST",
    });
  },

  async resolveConversation(id: string, staffNotes?: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/admin/conversations/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ staffNotes }),
    });
  },
};
