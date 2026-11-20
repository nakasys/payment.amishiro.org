"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatYen } from "@/lib/format";
import { FLAG_LABELS } from "@/lib/invoice-rules";
import type { Recipient, YearAmount } from "@/lib/types";

export function RecipientTable({ rows, fiscalYear }: { rows: Recipient[]; fiscalYear: number }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "amount" | "sheet">("sheet");
  const [status, setStatus] = useState<"all" | "active" | "suspended" | "review">("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (status === "active" && row.status !== "active") return false;
      if (status === "suspended" && row.status !== "suspended") return false;
      if (status === "review" && row.reviewFlags.length === 0) return false;
      if (!needle) return true;
      return [row.name, row.buildingName, row.managementCompany, row.address, row.sourceSheet, row.addressee]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
    const amountOf = (row: Recipient) =>
      row.yearAmounts.find((year: YearAmount) => year.fiscalYear === fiscalYear)?.amountYen ?? -1;
    return filtered.sort((a, b) => {
      if (sort === "amount") return amountOf(b) - amountOf(a);
      if (sort === "name") return a.name.localeCompare(b.name, "ja");
      return a.sourceSheet.localeCompare(b.sourceSheet, "ja", { numeric: true });
    });
  }, [fiscalYear, query, rows, sort, status]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="名称・住所・シート名"
          className="min-w-56 rounded-md border border-[var(--line)] bg-white px-3 py-2"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
        >
          <option value="all">すべて</option>
          <option value="active">請求対象</option>
          <option value="suspended">停止</option>
          <option value="review">要確認</option>
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
        >
          <option value="sheet">シート順</option>
          <option value="name">名前順</option>
          <option value="amount">金額順</option>
        </select>
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
              <th className="px-3 py-2 font-medium">確認</th>
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
                    <p className="text-xs text-[var(--muted)]">{row.managementCompany || row.sourceSheet}</p>
                  </td>
                  <td className="px-3 py-3">{row.buildingName}</td>
                  <td className="px-3 py-3">{formatYen(amount)}</td>
                  <td className="px-3 py-3">{row.status === "active" ? "請求対象" : "停止"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.reviewFlags.length === 0 ? (
                        <span className="text-[var(--muted)]">なし</span>
                      ) : (
                        row.reviewFlags.map((flag) => (
                          <span key={flag} className="rounded bg-[#f8e6e2] px-2 py-0.5 text-xs text-[var(--seal)]">
                            {FLAG_LABELS[flag] ?? flag}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
