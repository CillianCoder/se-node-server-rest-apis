"use client";

import { useMemo, useState, type FormEvent } from "react";
import { apiClient } from "@/lib/api";
import type { Item, Reservation } from "@/lib/types";

function createKey() {
  return globalThis.crypto?.randomUUID?.() ?? `idem_${Date.now()}`;
}

type Props = {
  item: Item;
};

type SubmissionState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; reservation: Reservation }
  | { kind: "error"; message: string };

export default function ProductReserveForm({ item }: Props) {
  const maxQty = useMemo(() => Math.min(5, item.availableQty), [item.availableQty]);
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });

  const quantityError =
    qty < 1
      ? "Quantity must be at least 1."
      : qty > maxQty
        ? `Quantity cannot exceed ${maxQty}.`
        : null;
  const errorMessage = quantityError ?? (state.kind === "error" ? state.message : null);

  async function handleReserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (quantityError) {
      setState({ kind: "error", message: quantityError });
      return;
    }

    setState({ kind: "loading" });

    try {
      const result = await apiClient.reserve(
        { userId: "demo_user", itemId: item.id, qty },
        createKey()
      );

      if (!result.ok) {
        setState({ kind: "error", message: result.error.message });
        return;
      }

      setState({ kind: "success", reservation: result.data });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to create reservation.",
      });
    }
  }

  const isSoldOut = item.availableQty === 0;

  return (
    <form className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl" onSubmit={handleReserve}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Reserve now</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Hold stock for demo_user</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm text-sky-100">
          Max {maxQty}
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">User</div>
          <div className="mt-1 font-mono text-sm text-white">demo_user</div>
        </div>

        <label className="grid gap-2 text-sm text-slate-200">
          Quantity
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 text-lg text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setQty((current) => Math.max(1, current - 1))}
              disabled={isSoldOut}
            >
              -
            </button>
            <input
              className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none"
              type="number"
              min={1}
              max={maxQty}
              step={1}
              value={qty}
              onChange={(event) => setQty(Number(event.target.value))}
              disabled={isSoldOut}
            />
            <button
              type="button"
              className="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 text-lg text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setQty((current) => Math.min(maxQty, current + 1))}
              disabled={isSoldOut}
            >
              +
            </button>
          </div>
          <div className="text-xs text-slate-400">
            {isSoldOut ? "This product is out of stock." : "Validation keeps the quantity within backend limits."}
          </div>
        </label>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        {state.kind === "success" ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            Reservation {state.reservation.id} created for {state.reservation.qty} item
            {state.reservation.qty === 1 ? "" : "s"}.
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        className="mt-6 w-full rounded-full bg-sky-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={state.kind === "loading" || isSoldOut}
      >
        {state.kind === "loading" ? "Reserving..." : "Reserve item"}
      </button>
    </form>
  );
}
