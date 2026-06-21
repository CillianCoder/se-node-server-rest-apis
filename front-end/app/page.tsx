import ReservationDashboard from "@/components/reservation-dashboard";
import { apiClient } from "@/lib/api";
import type { ApiResponse, HealthPayload, Reservation } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = "demo_user";

export default async function Home() {
  const [
    itemsResult,
    healthResult,
    reservedResult,
    confirmedResult,
    cancelledResult,
    expiredResult,
  ] = await Promise.allSettled([
    apiClient.getItems(),
    apiClient.getHealth(),
    apiClient.getReservationsByUser(DEMO_USER_ID, "reserved"),
    apiClient.getReservationsByUser(DEMO_USER_ID, "confirmed"),
    apiClient.getReservationsByUser(DEMO_USER_ID, "cancelled"),
    apiClient.getReservationsByUser(DEMO_USER_ID, "expired"),
  ]);

  const initialItems =
    itemsResult.status === "fulfilled" && itemsResult.value.ok ? itemsResult.value.data : [];

  const readReservations = (result: PromiseSettledResult<ApiResponse<Reservation[]>>): Reservation[] => {
    if (result.status !== "fulfilled" || !result.value.ok) {
      return [];
    }

    return result.value.data;
  };

  return (
    <ReservationDashboard
      initialItems={initialItems}
      initialHealth={
        healthResult.status === "fulfilled"
          ? (healthResult.value as ApiResponse<HealthPayload>)
          : ({
              ok: false,
              error: {
                code: "UNAVAILABLE",
                message: "Backend health check unavailable",
              },
            } as ApiResponse<HealthPayload>)
      }
      initialReservations={{
        reserved: readReservations(reservedResult),
        confirmed: readReservations(confirmedResult),
        cancelled: readReservations(cancelledResult),
        expired: readReservations(expiredResult),
      }}
    />
  );
}
