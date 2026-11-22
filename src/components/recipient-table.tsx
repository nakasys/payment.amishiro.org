import Link from "next/link";
import { formatYen } from "@/lib/format";
import { compareBySourceSheet } from "@/lib/invoice-rules";
import type { Recipient } from "@/lib/types";

export function RecipientTable({ rows, fiscalYear }: { rows: Recipient[]; fiscalYear: number }) {
  const visible = [...rows].sort(compareBySourceSheet);

  return (
    <div>
      <div className="mb-4">
        <Link href="/recipients/new" className="rounded-md bg-[var(--seal)] px-4 py-2 text-sm text-white">
          新規登録
        </Link>
      </div>
      <p className="mb-2 text-sm text-[var(--muted)]">{visible.length} 件</p>
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-[#f7f1e7] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">請求先</th>
              <th className="px-3 py-2 font-medium">物件</th>
              <th className="px-3 py-2 font-medium">金額</th>
              <th className="px-3 py-2 font-medium">状態</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const amount = row.yearAmounts.find((year) => year.fiscalYear === fiscalYear)?.amountYen ?? null;
              return (
                <tr key={row.id} className="border-t border-[var(--line)]">
                  <td className="px-3 py-3">
                    <Link href={`/recipients/${row.id}`} className="font-medium underline-offset-2 hover:underline">
                      {row.name || "（名称未設定）"}
                    </Link>
                    {row.managementCompany ? (
                      <p className="text-xs text-[var(--muted)]">{row.managementCompany}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">{row.buildingName}</td>
                  <td className="px-3 py-3">{formatYen(amount)}</td>
                  <td className="px-3 py-3">{row.status === "active" ? "請求対象" : "停止"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
