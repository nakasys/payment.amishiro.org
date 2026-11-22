"use client";

import { useState } from "react";

export function PdfPreview({ href, title }: { href: string; title: string }) {
  const [printable, setPrintable] = useState(false);
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <a href={href} target="_blank" className="rounded-md bg-[var(--seal)] px-4 py-2 text-sm text-white">
          PDFを開く
        </a>
        <a href={`${href}&download=1`} className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm">
          ダウンロード
        </a>
        <button
          type="button"
          disabled={!printable}
          className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm disabled:opacity-60"
          onClick={() => window.print()}
        >
          {printable ? "印刷" : "印刷の準備中"}
        </button>
      </div>
      <iframe
        title={title}
        src={href}
        onLoad={() => setPrintable(true)}
        className="h-[860px] w-full rounded-xl border border-[var(--line)] bg-white print:rounded-none print:border-0"
      />
    </>
  );
}
