export interface AuthUser {
  username: string;
  role: string;
}

export type BookingStatus = "CONFIRMED" | "PENDING" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceName: string;
  servicePriceCents?: number;
  durationMins?: number;
  dateTime: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  amount: string;
  notes?: string;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  lastBookingAt: string | null;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  amount: string;
  durationMins: number;
  isActive: boolean;
  totalBookings?: number;
}

export type HandoffStatus = "OPEN" | "ASSIGNED" | "RESOLVED";

export interface HumanHandoffItem {
  id: string;
  conversationId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  channel: "WEB" | "SMS";
  reason: string;
  status: HandoffStatus;
  assignedTo: string | null;
  notes: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface OverviewMetrics {
  totalBookings: number;
  totalRevenue: number;
  totalRevenueFormatted: string;
  totalCustomers: number;
  pendingRequests: number;
}

export interface OverviewResponse {
  metrics: OverviewMetrics;
  recentBookings: Booking[];
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    author?: string;
    staffUsername?: string;
    event?: string;
  } | null;
  timestamp: string;
}

export interface ConversationDetail {
  id: string;
  status: string;
  channel: string;
  summary: string | null;
  handoffReason: string | null;
  lastMessageAt: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  activeHandoff: HumanHandoffItem | null;
  messages: ConversationMessage[];
}
