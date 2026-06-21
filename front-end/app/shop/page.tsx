import Link from "next/link";
import ShopNav from "@/components/shop-nav";
import { apiClient } from "@/lib/api";

export const dynamic = "force-dynamic";

function priceTag(quantity: number) {
  if (quantity === 0) return "Sold out";
  if (quantity <= 2) return "Low stock";
  if (quantity <= 5) return "Ready to reserve";
  return "Well stocked";
}

export default async function ShopPage() {
  const itemsResult = await apiClient.getItems();
  const items = itemsResult.ok ? itemsResult.data : [];
  const inStockCount = items.filter((item) => item.availableQty > 0).length;
  const totalStock = items.reduce((sum, item) => sum + item.availableQty, 0);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-[rgba(10,19,35,0.86)] p-6 shadow-2xl shadow-sky-950/25 backdrop-blur-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-200/70">Shop inventory</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Browse products like a production storefront.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              This pathway uses the real seeded database inventory and links each product to its
              single-item detail page for reservation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                {items.length} products
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                {inStockCount} available
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                {totalStock} total units
              </div>
            </div>
          </div>
          <ShopNav />
        </div>
      </section>

      {!itemsResult.ok ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {itemsResult.error.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-300 md:col-span-2 xl:col-span-3">
            No inventory items were returned by the API. Check that the backend is running and the
            database is seeded.
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="group rounded-[1.75rem] border border-white/10 bg-white/5 p-6 transition duration-200 hover:-translate-y-1 hover:border-sky-300/30 hover:bg-white/[0.08]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Product</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{item.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Real backend item with live stock updates and reservation lifecycle support.
                  </p>
                </div>
                <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Stock</div>
                  <div className="mt-1 text-2xl font-semibold text-sky-100">{item.availableQty}</div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-200">
                  {priceTag(item.availableQty)}
                </span>
                <span className="font-mono text-xs text-slate-500">{item.id}</span>
              </div>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/25">
                <div
                  className={`h-full rounded-full ${
                    item.availableQty === 0
                      ? "bg-rose-400"
                      : item.availableQty <= 2
                        ? "bg-amber-400"
                        : "bg-sky-400"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(8, item.availableQty * 12))}%` }}
                />
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <Link
                  href={`/shop/${item.id}`}
                  className="rounded-full bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
                >
                  View product
                </Link>
                <span className="text-xs text-slate-500">Reserve with demo_user</span>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
