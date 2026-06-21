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
        {items.map((item) => (
          <article
            key={item.id}
            className="group rounded-[1.75rem] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-sky-300/30 hover:bg-white/[0.08]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Product</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{item.name}</h2>
              </div>
              <div className="rounded-full bg-black/20 px-3 py-1 text-sm text-sky-100">
                {item.availableQty} left
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-slate-300">
              <span>{priceTag(item.availableQty)}</span>
              <span className="font-mono text-xs text-slate-500">{item.id}</span>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Link
                href={`/shop/${item.id}`}
                className="rounded-full bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
              >
                View product
              </Link>
              <span className="text-xs text-slate-500">Reserve with demo_user</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
