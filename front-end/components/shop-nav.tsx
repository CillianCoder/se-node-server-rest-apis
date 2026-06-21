import Link from "next/link";

export default function ShopNav() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/shop"
        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
      >
        Open shop inventory
      </Link>
      <Link
        href="/"
        className="rounded-full border border-white/10 bg-transparent px-4 py-2 text-sm text-slate-300 transition hover:border-sky-300/30 hover:text-white"
      >
        Dashboard
      </Link>
    </div>
  );
}
