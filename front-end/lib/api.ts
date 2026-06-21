import type { ApiResponse, HealthPayload, Item, Reservation } from "@/lib/types";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";
const rootUrl = baseUrl.replace(/\/api\/v1$/, "");

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json") || contentType.includes("+json");

  if (!isJson) {
    const text = await response.text();
    return {
      ok: false,
      error: {
        code: "INVALID_RESPONSE",
        message:
          text.trim() ||
          `Unexpected response type from API: ${contentType || "unknown content-type"}.`,
        details: {
          status: response.status,
          contentType,
        },
      },
    } as ApiResponse<T>;
  }

  return (await response.json()) as ApiResponse<T>;
}

async function request<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const { headers: initHeaders, ...rest } = init ?? {};
  const method = (rest.method ?? "GET").toUpperCase();
  const headers = new Headers(initHeaders);

  if (method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      headers,
      ...rest,
    });
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message:
          error instanceof Error
            ? error.message
            : `Failed to reach the API at ${url}.`,
        details: {
          url,
          method,
        },
      },
    } as ApiResponse<T>;
  }

  return parseApiResponse<T>(response);
}

export const apiClient = {
  getHealth() {
    return request<HealthPayload>(`${rootUrl}/health`);
  },
  getItems() {
    return request<Item[]>(`${baseUrl}/items`);
  },
  getItem(id: string) {
    return request<Item>(`${baseUrl}/items/${encodeURIComponent(id)}`);
  },
  getReservationsByUser(userId: string, status?: string) {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<Reservation[]>(`${baseUrl}/reservations/user/${encodeURIComponent(userId)}${suffix}`);
  },
  getReservation(id: string) {
    return request<Reservation>(`${baseUrl}/reservations/${encodeURIComponent(id)}`);
  },
  reserve(payload: { userId: string; itemId: string; qty: number }, idempotencyKey: string) {
    return request<Reservation>(`${baseUrl}/reserve`, {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
  },
  confirm(payload: { userId: string; reservationId: string }, idempotencyKey: string) {
    return request<{ status: string }>(`${baseUrl}/confirm`, {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
  },
  cancel(payload: { userId: string; reservationId: string }) {
    return request<{ status: string }>(`${baseUrl}/cancel`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  expireReservations() {
    return request<{ expired: number; message: string }>(`${baseUrl}/expire/run`, {
      method: "POST",
    });
  },
};
