"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import ShopNav from "@/components/shop-nav";
import { apiClient } from "@/lib/api";
import type { ApiResponse, HealthPayload, Item, Reservation } from "@/lib/types";

const DEMO_USER_ID = "demo_user";
const RESERVATION_POLL_MS = 15000;
const CLOCK_TICK_MS = 1000;

type ReservationBuckets = {
  reserved: Reservation[];
  confirmed: Reservation[];
  cancelled: Reservation[];
  expired: Reservation[];
};

type Props = {
  initialItems: Item[];
  initialHealth: ApiResponse<HealthPayload>;
  initialReservations: ReservationBuckets;
};

type Message = { kind: "success" | "error"; text: string } | null;
type BusyAction =
  | { kind: "refresh" }
  | { kind: "reserve" }
  | { kind: "confirm"; id: string }
  | { kind: "cancel"; id: string }
  | { kind: "expire" };

function createKey() {
  return globalThis.crypto?.randomUUID?.() ?? `idem_${Date.now()}`;
}

function formatExactTime(value?: number): string {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
    hour12: false,
  }).format(new Date(value));
}

function formatIsoTime(value?: number): string {
  if (!value) return "N/A";
  return new Date(value).toISOString();
}

function formatCountdown(expiresAt?: number, now = Date.now()): string {
  if (!expiresAt) return "N/A";
  if (!now) return "N/A";

  const remainingMs = expiresAt - now;
  if (remainingMs <= 0) return "Expired";

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const displayMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${displayMinutes}m ${seconds}s`;
  }

  return `${displayMinutes}m ${seconds}s`;
}

function getStatusTone(status: Reservation["status"]) {
  switch (status) {
    case "reserved":
      return "border-sky-400/20 bg-sky-400/10 text-sky-100";
    case "confirmed":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
    case "cancelled":
      return "border-amber-400/20 bg-amber-400/10 text-amber-100";
    case "expired":
      return "border-rose-400/20 bg-rose-400/10 text-rose-100";
  }
}

function getStatusLabel(status: Reservation["status"]) {
  switch (status) {
    case "reserved":
      return "Active";
    case "confirmed":
      return "Confirmed";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
  }
}

function sortByCreatedDesc<T extends { createdAt?: number }>(rows: T[]) {
  return [...rows].sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0));
}

export default function ReservationDashboard({
  initialItems,
  initialHealth,
  initialReservations,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [health, setHealth] = useState(initialHealth);
  const [reservations, setReservations] = useState(initialReservations);
  const [selectedItemId, setSelectedItemId] = useState(
    initialItems.find((item) => item.availableQty > 0)?.id ?? initialItems[0]?.id ?? ""
  );
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const initialTimestamp = initialHealth.ok ? Date.parse(initialHealth.data.timestamp) : 0;
  const [now, setNow] = useState(initialTimestamp);
  const [lastSyncedAt, setLastSyncedAt] = useState(initialTimestamp);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId),
    [items, selectedItemId]
  );
  const activeReservations = useMemo(
    () => sortByCreatedDesc(reservations.reserved),
    [reservations.reserved]
  );
  const completedReservations = useMemo(
    () =>
      sortByCreatedDesc([
        ...reservations.confirmed,
        ...reservations.cancelled,
        ...reservations.expired,
      ]),
    [reservations]
  );

  const healthIsHealthy = health.ok && health.data.status === "healthy";
  const healthLabel = healthIsHealthy ? "Healthy" : "Unavailable";
  const healthTone = healthIsHealthy ? "text-emerald-300" : "text-rose-300";
  const healthTimestamp = health.ok ? health.data.timestamp : "Backend not reachable";

  const availableItemCount = items.filter((item) => item.availableQty > 0).length;
  const activeCount = activeReservations.length;
  const completedCount = completedReservations.length;
  const totalStock = items.reduce((sum, item) => sum + item.availableQty, 0);
  const maxQty = Math.min(5, selectedItem?.availableQty ?? 0);

  const quantityError = !selectedItem
    ? "Pick a product to reserve."
    : selectedItem.availableQty === 0
      ? "This product is out of stock."
      : qty < 1
        ? "Quantity must be at least 1."
        : qty > maxQty
          ? `Quantity cannot exceed ${maxQty}.`
          : null;

  async function syncDashboard(silent = false) {
    const [itemsResult, healthResult, reservedResult, confirmedResult, cancelledResult, expiredResult] =
      await Promise.allSettled([
        apiClient.getItems(),
        apiClient.getHealth(),
        apiClient.getReservationsByUser(DEMO_USER_ID, "reserved"),
        apiClient.getReservationsByUser(DEMO_USER_ID, "confirmed"),
        apiClient.getReservationsByUser(DEMO_USER_ID, "cancelled"),
        apiClient.getReservationsByUser(DEMO_USER_ID, "expired"),
      ]);

    if (itemsResult.status === "fulfilled" && itemsResult.value.ok) {
      setItems(itemsResult.value.data);
    }

    if (healthResult.status === "fulfilled") {
      setHealth(healthResult.value);
      if (healthResult.value.ok) {
        const syncedAt = Date.parse(healthResult.value.data.timestamp);
        setNow(syncedAt);
        setLastSyncedAt(syncedAt);
      }
    }

    setReservations({
      reserved:
        reservedResult.status === "fulfilled" && reservedResult.value.ok
          ? reservedResult.value.data
          : [],
      confirmed:
        confirmedResult.status === "fulfilled" && confirmedResult.value.ok
          ? confirmedResult.value.data
          : [],
      cancelled:
        cancelledResult.status === "fulfilled" && cancelledResult.value.ok
          ? cancelledResult.value.data
          : [],
      expired:
        expiredResult.status === "fulfilled" && expiredResult.value.ok
          ? expiredResult.value.data
          : [],
    });

    if (!silent) {
      setMessage({ kind: "success", text: "Dashboard synced with the backend." });
    }
  }

  async function runAction(action: BusyAction, handler: () => Promise<void>) {
    setBusy(action);
    setMessage(null);
    try {
      await handler();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleReserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (quantityError) {
      setMessage({ kind: "error", text: quantityError });
      return;
    }

    if (!selectedItem) {
      setMessage({ kind: "error", text: "Please select an item first." });
      return;
    }

    await runAction({ kind: "reserve" }, async () => {
      const result = await apiClient.reserve(
        { userId: DEMO_USER_ID, itemId: selectedItem.id, qty },
        createKey()
      );

      if (!result.ok) {
        throw new Error(result.error.message);
      }

      setQty(1);
      setMessage({
        kind: "success",
        text: `Reservation ${result.data.id} created for ${selectedItem.name}.`,
      });
      await syncDashboard(true);
    });
  }

  async function handleReservationAction(kind: "confirm" | "cancel", reservation: Reservation) {
    await runAction({ kind, id: reservation.id }, async () => {
      const result =
        kind === "confirm"
          ? await apiClient.confirm(
              { userId: DEMO_USER_ID, reservationId: reservation.id },
              createKey()
            )
          : await apiClient.cancel({
              userId: DEMO_USER_ID,
              reservationId: reservation.id,
            });

      if (!result.ok) {
        throw new Error(result.error.message);
      }

      const statusText = result.ok ? result.data.status : kind;
      setMessage({
        kind: "success",
        text:
          kind === "confirm"
            ? `Reservation ${reservation.id} ${statusText}.`
            : `Reservation ${reservation.id} ${statusText}.`,
      });
      await syncDashboard(true);
    });
  }

  async function handleExpirationSweep() {
    await runAction({ kind: "expire" }, async () => {
      const result = await apiClient.expireReservations();
      if (!result.ok) {
        throw new Error(result.error.message);
      }

      setMessage({ kind: "success", text: result.data.message });
      await syncDashboard(true);
    });
  }

  useEffect(() => {
    const initialSync = window.setTimeout(() => {
      void syncDashboard(true);
    }, 0);

    const tick = window.setInterval(
      () => setNow((current) => (current > 0 ? current + CLOCK_TICK_MS : current)),
      CLOCK_TICK_MS
    );
    const poll = window.setInterval(() => {
      void syncDashboard(true);
    }, RESERVATION_POLL_MS);

    return () => {
      window.clearTimeout(initialSync);
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[2rem] border border-white/10 bg-[var(--card)] p-7 shadow-2xl shadow-sky-950/30 backdrop-blur-xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.35em] text-sky-200/70">Reservation Studio</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Demo-user reservation lifecycle dashboard.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
                Track active holds, confirm or cancel before expiry, and watch cancelled and expired
                reservations return stock back into inventory.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <div className="text-slate-400">API health</div>
              <div className={healthTone}>{healthLabel}</div>
              <div className="mt-1 text-xs text-slate-400">{healthTimestamp}</div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ShopNav />
            <button
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10 disabled:opacity-50"
              onClick={() => runAction({ kind: "refresh" }, () => syncDashboard(false))}
              disabled={busy?.kind === "refresh"}
            >
              {busy?.kind === "refresh" ? "Syncing..." : "Sync dashboard"}
            </button>
            <button
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10 disabled:opacity-50"
              onClick={() => void handleExpirationSweep()}
              disabled={busy?.kind === "expire"}
            >
              {busy?.kind === "expire" ? "Running sweep..." : "Run expiration sweep"}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Use refresh when you want the latest API state, or run the sweep to test expiry and
            stock restoration.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {[
            ["Demo user", DEMO_USER_ID],
            ["Active reservations", `${activeCount}`],
            ["Completed history", `${completedCount}`],
            ["In-stock items", `${availableItemCount}`],
            ["Total stock", `${totalStock}`],
            ["Last sync", lastSyncedAt ? formatExactTime(lastSyncedAt) : "Syncing..."],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</div>
              <div className="mt-3 text-lg font-semibold text-white">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.kind === "success"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-rose-400/30 bg-rose-400/10 text-rose-100"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-[rgba(10,19,35,0.86)] p-7 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-xl font-semibold text-white">Inventory snapshot</h2>
              <div className="text-sm text-slate-400">{items.length} products</div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Quick overview of live stock before you open a product detail page.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.3em] text-slate-400">
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">State</th>
                    <th className="px-3 py-2">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="rounded-2xl bg-white/5">
                      <td className="px-3 py-4">
                        <div className="text-base font-semibold text-white">{item.name}</div>
                        <div className="font-mono text-xs text-slate-500">{item.id}</div>
                      </td>
                      <td className="px-3 py-4 text-lg font-semibold text-white">{item.availableQty}</td>
                      <td className="px-3 py-4">
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-200">
                          {item.availableQty === 0
                            ? "Sold out"
                            : item.availableQty <= 2
                              ? "Low stock"
                              : "Ready"}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <Link
                          href={`/shop/${item.id}`}
                          className="text-sm font-medium text-sky-200 transition hover:text-sky-100"
                        >
                          View product
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form
            className="rounded-[2rem] border border-white/10 bg-[rgba(10,19,35,0.86)] p-7 backdrop-blur-xl"
            onSubmit={handleReserve}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">New hold</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Reserve for demo_user</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  This form mirrors the backend contract and keeps the quantity bounded by stock.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm text-sky-100">
                Max {maxQty || 0}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">User</div>
                <div className="mt-1 font-mono text-sm text-white">{DEMO_USER_ID}</div>
              </div>

              <label className="grid gap-2 text-sm text-slate-200">
                Product
                <select
                  className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none"
                  value={selectedItemId}
                  onChange={(event) => setSelectedItemId(event.target.value)}
                >
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.availableQty})
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-slate-200">
                Quantity
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 text-lg text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => setQty((current) => Math.max(1, current - 1))}
                    disabled={!selectedItem || selectedItem.availableQty === 0}
                  >
                    -
                  </button>
                  <input
                    className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none"
                    type="number"
                    min={1}
                    max={maxQty || 1}
                    step={1}
                    value={qty}
                    onChange={(event) => setQty(Number(event.target.value))}
                    disabled={!selectedItem || selectedItem.availableQty === 0}
                  />
                  <button
                    type="button"
                    className="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 text-lg text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => setQty((current) => Math.min(maxQty || 1, current + 1))}
                    disabled={!selectedItem || selectedItem.availableQty === 0}
                  >
                    +
                  </button>
                </div>
                <div className="text-xs text-slate-400">
                  {selectedItem
                    ? `Validation keeps qty between 1 and ${Math.min(5, selectedItem.availableQty)}.`
                    : "Choose a product to reserve."}
                </div>
              </label>

              {quantityError ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {quantityError}
                </div>
              ) : null}

              <button
                type="submit"
                className="rounded-full bg-sky-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy?.kind === "reserve" || Boolean(quantityError)}
              >
                {busy?.kind === "reserve" ? "Reserving..." : "Create reservation"}
              </button>

              {selectedItem ? (
                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-slate-300">
                  <div className="font-medium text-white">{selectedItem.name}</div>
                  <div className="mt-1">
                    Stock changes will update when reservations are confirmed, cancelled, or auto
                    expired.
                  </div>
                </div>
              ) : null}
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-[rgba(10,19,35,0.86)] p-7 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Active queue</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Reserved holds</h2>
              </div>
              <div className="text-sm text-slate-400">{activeReservations.length} active</div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Confirm or cancel while the item is active. Expired rows stay visible until the sweep
              restores stock.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.3em] text-slate-400">
                    <th className="px-3 py-2">Reservation</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Expires</th>
                    <th className="px-3 py-2">Remaining</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReservations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-sm text-slate-400">
                        No active reservations for {DEMO_USER_ID} right now.
                      </td>
                    </tr>
                  ) : (
                    activeReservations.map((reservation) => {
                      const remaining = formatCountdown(reservation.expiresAt, now);
                      const isExpired = remaining === "Expired";
                      const isConfirming =
                        busy?.kind === "confirm" && busy.id === reservation.id;
                      const isCancelling =
                        busy?.kind === "cancel" && busy.id === reservation.id;

                      return (
                        <tr key={reservation.id} className="rounded-2xl bg-white/5">
                          <td className="px-3 py-4 align-top">
                            <div className="font-semibold text-white">{reservation.id}</div>
                            <div className="mt-1 text-xs text-slate-500">{reservation.userId}</div>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <Link
                              href={`/shop/${reservation.itemId}`}
                              className="font-medium text-sky-200 transition hover:text-sky-100"
                            >
                              {items.find((item) => item.id === reservation.itemId)?.name ??
                                reservation.itemId}
                            </Link>
                            <div className="font-mono text-xs text-slate-500">
                              {reservation.itemId}
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top text-white">{reservation.qty}</td>
                          <td className="px-3 py-4 align-top text-sm text-slate-300">
                            <div>{formatExactTime(reservation.createdAt)}</div>
                            <div className="mt-1 font-mono text-xs text-slate-500">
                              {formatIsoTime(reservation.createdAt)}
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top text-sm text-slate-300">
                            <div>{formatExactTime(reservation.expiresAt)}</div>
                            <div className="mt-1 font-mono text-xs text-slate-500">
                              {formatIsoTime(reservation.expiresAt)}
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <div
                              className={`inline-flex rounded-full border px-3 py-1 text-xs ${isExpired ? "border-rose-400/20 bg-rose-400/10 text-rose-100" : "border-sky-400/20 bg-sky-400/10 text-sky-100"}`}
                            >
                              {remaining}
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-400/15 disabled:opacity-40"
                                onClick={() => handleReservationAction("confirm", reservation)}
                                disabled={isExpired || isConfirming || isCancelling}
                              >
                                {isConfirming ? "Confirming..." : "Confirm"}
                              </button>
                              <button
                                className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-400/15 disabled:opacity-40"
                                onClick={() => handleReservationAction("cancel", reservation)}
                                disabled={isExpired || isConfirming || isCancelling}
                              >
                                {isCancelling ? "Cancelling..." : "Cancel"}
                              </button>
                            </div>
                            {isExpired ? (
                              <div className="mt-2 text-xs text-rose-200">
                                Waiting for the backend expiration sweep.
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[rgba(10,19,35,0.86)] p-7 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Reservation history</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Confirmed, cancelled, and expired
                </h2>
              </div>
              <div className="text-sm text-slate-400">{completedReservations.length} records</div>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Cancelled and expired reservations return stock to inventory. Confirmed reservations
              stay allocated and show the completed lifecycle in this archive.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.3em] text-slate-400">
                    <th className="px-3 py-2">Reservation</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {completedReservations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-sm text-slate-400">
                        No completed reservations yet.
                      </td>
                    </tr>
                  ) : (
                    completedReservations.map((reservation) => (
                      <tr key={reservation.id} className="rounded-2xl bg-white/5">
                        <td className="px-3 py-4 align-top">
                          <div className="font-semibold text-white">{reservation.id}</div>
                          <div className="mt-1 text-xs text-slate-500">{reservation.userId}</div>
                        </td>
                        <td className="px-3 py-4 align-top text-sky-200">
                          {items.find((item) => item.id === reservation.itemId)?.name ??
                            reservation.itemId}
                          <div className="font-mono text-xs text-slate-500">{reservation.itemId}</div>
                        </td>
                        <td className="px-3 py-4 align-top text-white">{reservation.qty}</td>
                        <td className="px-3 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs ${getStatusTone(
                              reservation.status
                            )}`}
                          >
                            {getStatusLabel(reservation.status)}
                          </span>
                        </td>
                        <td className="px-3 py-4 align-top text-sm text-slate-300">
                          <div>{formatExactTime(reservation.createdAt)}</div>
                          <div className="mt-1 font-mono text-xs text-slate-500">
                            {formatIsoTime(reservation.createdAt)}
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top text-sm text-slate-300">
                          <div>{formatExactTime(reservation.expiresAt)}</div>
                          <div className="mt-1 font-mono text-xs text-slate-500">
                            {formatIsoTime(reservation.expiresAt)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
