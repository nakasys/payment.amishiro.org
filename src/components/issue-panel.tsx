"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatYen, todayISO } from "@/lib/format";
import { issueInvoicesAction } from "@/server/actions";

export interface IssueRow {
  id: string;
  name: string;
  buildingName: string;
  amount: number | null;
  reasons: string[];
}

export function IssuePanel({ rows }: { rows: IssueRow[] }) {
  const router = useRouter();
  const [issuedOn, setIssuedOn] = useState(todayISO());
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const readyIds = useMemo(() => rows.filter((row) => row.reasons.length === 0).map((row) => row.id), [rows]);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  const previewHref = `/invoices/preview?ids=${selected.join(",")}&date=${issuedOn}`;

  async function issue() {
    setPending(true);
    setMessage("");
    const result = await issueInvoicesAction(selected, issuedOn);
    setPending(false);
    if (!result.ok) {
      if ("blocked" in result && result.blocked) {
        setMessage(result.blocked.map((item) => `${item.name}: ${item.reasons.join("、")}`).join("\n"));
      } else if ("error" in result) setMessage(result.error);
      return;
    }
    router.push(`/invoices/preview?invoices=${result.invoiceIds.join(",")}`);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">発行日</span>
          <input type="date" value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2" />
        </label>
        <button type="button" className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm" onClick={() => setSelected(readyIds)}>
          発行できる請求先を選択
        </button>
        <button type="button" className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm" onClick={() => setSelected(rows.map((row) => row.id))}>
          表示中をすべて選択
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#f7f1e7]">
            <tr>
              <th className="px-3 py-2" />
              <th className="px-3 py-2 font-medium">請求先</th>
              <th className="px-3 py-2 font-medium">金額</th>
              <th className="px-3 py-2 font-medium">正式発行</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} />
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-[var(--muted)]">{row.buildingName}</p>
                </td>
                <td className="px-3 py-3">{formatYen(row.amount)}</td>
                <td className="px-3 py-3 text-xs">{row.reasons.length ? row.reasons.join(" / ") : "発行できます"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={selected.length ? previewHref : undefined} className={`rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm ${selected.length ? "" : "pointer-events-none opacity-40"}`}>
          選択分をプレビュー
        </a>
        <button type="button" disabled={pending || selected.length === 0} onClick={issue} className="rounded-md bg-[var(--seal)] px-4 py-2 text-sm text-white disabled:opacity-50">
          {pending ? "発行中" : "正式発行してPDFを表示"}
        </button>
      </div>
      {message ? <pre className="mt-3 whitespace-pre-wrap text-sm text-[var(--seal)]">{message}</pre> : null}
    </div>
  );
}
