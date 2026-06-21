import Link from "next/link";
import { notFound } from "next/navigation";
import ShopNav from "@/components/shop-nav";
import ProductReserveForm from "@/components/product-reserve-form";
import { apiClient } from "@/lib/api";

export const dynamic = "force-dynamic";

function availabilityLabel(qty: number) {
  if (qty === 0) return "Out of stock";
  if (qty === 1) return "Only 1 left";
  if (qty <= 3) return "Limited stock";
  return "In stock";
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [itemResult, itemsResult] = await Promise.all([apiClient.getItem(id), apiClient.getItems()]);

  if (!itemResult.ok) {
    notFound();
  }

  const item = itemResult.data;
  const otherItems = itemsResult.ok ? itemsResult.data.filter((entry) => entry.id !== item.id) : [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-[rgba(10,19,35,0.86)] p-6 shadow-2xl shadow-sky-950/25 backdrop-blur-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-200/70">Product detail</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {item.name}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Real backend item loaded from SQLite. Use the form on this page to reserve stock for
              the fixed demo account.
            </p>
          </div>
          <ShopNav />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Availability", availabilityLabel(item.availableQty)],
              ["Stock", `${item.availableQty} units`],
              ["Item ID", item.id],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-black/15 p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</div>
                <div className="mt-3 text-base font-medium text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/15 p-5">
            <h2 className="text-lg font-semibold text-white">Why this page matters</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This is the single-product pathway: it mirrors a shop site detail page, keeps the
              reservation action close to the product, and uses backend validation limits for
              quantity selection.
            </p>
          </div>

          <div className="mt-6">
            <Link
              href="/shop"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
            >
              Back to inventory
            </Link>
          </div>
        </article>

        <ProductReserveForm item={item} />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[rgba(10,19,35,0.86)] p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Other products</h2>
          <p className="text-sm text-slate-400">Quick links to the rest of the inventory</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {otherItems.slice(0, 6).map((entry) => (
            <Link
              key={entry.id}
              href={`/shop/${entry.id}`}
              className="rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-sky-300/30 hover:bg-white/[0.08]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white">{entry.name}</div>
                  <div className="mt-1 font-mono text-xs text-slate-500">{entry.id}</div>
                </div>
                <div className="rounded-full bg-black/20 px-3 py-1 text-sm text-sky-100">
                  {entry.availableQty}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
