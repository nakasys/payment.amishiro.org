"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatYen } from "@/lib/format";
import { FLAG_LABELS } from "@/lib/invoice-rules";
import { commitImportAction, previewImportAction } from "@/server/actions";
import type { Recipient } from "@/lib/types";

export function ImportPanel() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Recipient[] | null>(null);
  const [mode, setMode] = useState<"add" | "overwrite">("add");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--line)] bg-white p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setMessage("");
          const result = await previewImportAction(new FormData(event.currentTarget));
          setPending(false);
          if (!result.ok) {
            setMessage(result.error);
            setRows(null);
            return;
          }
          setFileName(result.fileName);
          setRows(result.recipients);
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">請求書Excel</span>
          <input name="file" type="file" accept=".xlsx" required className="text-sm" />
        </label>
        <button className="rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-white" disabled={pending}>
          {pending ? "解析中" : "内容を確認"}
        </button>
      </form>
      {message ? <p className="text-sm text-[var(--seal)]">{message}</p> : null}
      {rows ? (
        <div>
          <p className="mb-2 text-sm">{fileName} から {rows.length} 件を読み取りました。元のExcelファイルは変更しません。</p>
          <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f7f1e7]">
                <tr>
                  <th className="px-3 py-2">シート</th>
                  <th className="px-3 py-2">請求先</th>
                  <th className="px-3 py-2">金額</th>
                  <th className="px-3 py-2">確認</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--line)]">
                    <td className="px-3 py-2">{row.sourceSheet}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{formatYen(row.yearAmounts[0]?.amountYen ?? null)}</td>
                    <td className="px-3 py-2 text-xs">{row.reviewFlags.map((flag) => FLAG_LABELS[flag] ?? flag).join(" / ") || "なし"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <label>
              <input type="radio" checked={mode === "add"} onChange={() => setMode("add")} /> 未登録のシートだけ追加
            </label>
            <label>
              <input type="radio" checked={mode === "overwrite"} onChange={() => setMode("overwrite")} /> 同じシートはExcelの値で上書き
            </label>
            <button
              type="button"
              className="rounded-md bg-[var(--seal)] px-4 py-2 text-white"
              onClick={async () => {
                const result = await commitImportAction(fileName, rows, mode);
                if (!result.ok) {
                  setMessage(result.error);
                  return;
                }
                router.push("/recipients");
                router.refresh();
              }}
            >
              取り込む
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
