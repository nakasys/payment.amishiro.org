import Link from "next/link";

const links = [
  ["ダッシュボード", "/dashboard"],
  ["請求先", "/recipients"],
  ["請求書発行", "/invoices"],
  ["宛名ラベル", "/labels"],
  ["入金管理", "/payments"],
  ["Excel取込", "/import"],
  ["基本設定", "/settings"],
];

export function Shell({ demo, children }: { demo: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="no-print border-b border-[var(--line)] bg-[#221c18] text-[#f6f1e8] md:min-h-screen md:border-b-0 md:border-r">
        <div className="px-5 py-6">
          <p className="text-xs tracking-[0.18em] text-[#d7b4a3]">AZABU-JUBAN</p>
          <p className="mt-1 text-lg font-semibold">麻布十番網代会</p>
          <p className="text-sm text-[#cfc4b6]">町会費請求管理</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 md:block md:space-y-1">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="block whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-white/10"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>
        {demo ? (
          <p className="border-b border-[#efd3a4] bg-[#fff6e8] px-6 py-2 text-sm text-[#7a4b12]">
            開発用デモモードです。データはこの端末の data/store.json に保存されます。本番環境では無効です。
          </p>
        ) : null}
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, description, className = "" }: { title: string; description?: string; className?: string }) {
  return (
    <header className={`mb-6 ${className}`}>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
    </header>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-sm ${className}`}>
      {children}
    </section>
  );
}
