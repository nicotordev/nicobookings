export interface AuthUser {
  username: string;
  role: string;
}

export type BookingStatus = "CONFIRMED" | "PENDING" | "CANCELLED" | "COMPLETED";

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  dateTime: string;
  status: BookingStatus;
  amount: string;
}

export interface MetricCardData {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  type: "bookings" | "revenue" | "customers" | "pending";
}
