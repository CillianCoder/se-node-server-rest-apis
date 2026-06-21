export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};

export type ApiResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiError;
    };

export type Item = {
  id: string;
  name: string;
  availableQty: number;
};

export type ReservationStatus = "reserved" | "confirmed" | "cancelled" | "expired";

export type Reservation = {
  id: string;
  userId: string;
  itemId: string;
  qty: number;
  status: ReservationStatus;
  expiresAt?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type HealthResponse = ApiResponse<{
  status: "healthy" | "unhealthy";
  timestamp: string;
}>;

export type HealthPayload = {
  status: "healthy" | "unhealthy";
  timestamp: string;
};
