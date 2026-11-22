"use client";

import { useMemo, useState } from "react";
import { saveLabelSettingsAction } from "@/server/actions";
import type { LabelSettings } from "@/lib/types";

export interface LabelRow {
  id: string;
  name: string;
  address: string;
  missing: string[];
}

const fields: { key: keyof LabelSettings; label: string }[] = [
  { key: "columns", label: "列数" },
  { key: "rows", label: "段数" },
  { key: "marginTopMm", label: "上余白 mm" },
  { key: "marginLeftMm", label: "左余白 mm" },
  { key: "labelWidthMm", label: "ラベル幅 mm" },
  { key: "labelHeightMm", label: "ラベル高さ mm" },
  { key: "pitchXMm", label: "横ピッチ mm" },
  { key: "pitchYMm", label: "縦ピッチ mm" },
  { key: "fontSizePt", label: "文字サイズ pt" },
];

export function LabelStudio({ rows, initial }: { rows: LabelRow[]; initial: LabelSettings }) {
  const [settings, setSettings] = useState(initial);
  const [selected, setSelected] = useState(rows.map((row) => row.id));
  const [start, setStart] = useState(0);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [printable, setPrintable] = useState(false);

  const href = useMemo(() => {
    const params = new URLSearchParams();
    params.set("recipients", selected.join(","));
    params.set("start", String(start));
    for (const field of fields) params.set(field.key, String(settings[field.key]));
    return `/api/pdf/labels?${params.toString()}`;
  }, [selected, settings, start]);
  const [seenHref, setSeenHref] = useState(href);
  if (seenHref !== href) {
    setSeenHref(href);
    setPrintable(false);
  }

  return (
    <div className="grid gap-4 print:block lg:grid-cols-[320px_1fr]">
      <div className="no-print space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--line)] bg-white p-3">
          {fields.map((field) => (
            <label key={field.key} className="text-xs">
              {field.label}
              <input
                type="number"
                step="0.1"
                value={settings[field.key]}
                onChange={(event) => setSettings({ ...settings, [field.key]: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-[var(--line)] px-2 py-1"
              />
            </label>
          ))}
          <label className="text-xs">
            開始位置（0が左上）
            <input type="number" min={0} value={start} onChange={(event) => setStart(Number(event.target.value))} className="mt-1 w-full rounded-md border border-[var(--line)] px-2 py-1" />
          </label>
        </div>
        <div className="max-h-72 overflow-auto rounded-xl border border-[var(--line)] bg-white p-3 text-sm">
          {rows.map((row) => (
            <label key={row.id} className="mb-2 flex gap-2">
              <input
                type="checkbox"
                checked={selected.includes(row.id)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id),
                  )
                }
              />
              <span>
                {row.name}
                {row.missing.length ? <span className="text-[var(--seal)]">（{row.missing.join("・")}未登録）</span> : null}
              </span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm disabled:opacity-60"
            onClick={async () => {
              setPending(true);
              setMessage("");
              setSaved(false);
              const result = await saveLabelSettingsAction(settings);
              setPending(false);
              setSaved(result.ok);
              setMessage(result.ok ? "保存しました" : result.error);
            }}
          >
            {pending ? "保存中" : "用紙設定を保存"}
          </button>
          <a href={href} target="_blank" className="rounded-md bg-[var(--seal)] px-3 py-2 text-sm text-white">
            PDFを開く
          </a>
          <a href={`${href}&download=1`} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
            ダウンロード
          </a>
          <button
            type="button"
            disabled={!printable || selected.length === 0}
            className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm disabled:opacity-60"
            onClick={() => window.print()}
          >
            {printable ? "印刷" : "印刷の準備中"}
          </button>
        </div>
        {message ? <p className={`text-sm ${saved ? "text-[#2f6b45]" : "text-[var(--seal)]"}`}>{message}</p> : null}
      </div>
      <iframe
        title="宛名ラベルプレビュー"
        src={href}
        onLoad={() => setPrintable(true)}
        className="h-[860px] w-full rounded-xl border border-[var(--line)] bg-white print:rounded-none print:border-0"
      />
    </div>
  );
}
