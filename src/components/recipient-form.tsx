"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FLAG_LABELS, blockingReasons } from "@/lib/invoice-rules";
import { deleteRecipientAction, saveRecipientAction } from "@/server/actions";
import type { Recipient, ReviewFlag, Settings } from "@/lib/types";

const flagKeys = Object.keys(FLAG_LABELS) as ReviewFlag[];

export function RecipientForm({ recipient, settings, isNew }: { recipient: Recipient; settings: Settings; isNew?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(recipient);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const reasons = blockingReasons(value, settings);

  function patch(partial: Partial<Recipient>) {
    setValue((current) => ({ ...current, ...partial }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const result = await saveRecipientAction(value);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("保存しました");
    router.replace(`/recipients/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <section className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 md:grid-cols-2">
        <Field label="請求先名">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={value.name} onChange={(event) => patch({ name: event.target.value })} />
        </Field>
        <Field label="管理会社">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={value.managementCompany} onChange={(event) => patch({ managementCompany: event.target.value })} />
        </Field>
        <Field label="対象物件">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={value.buildingName} onChange={(event) => patch({ buildingName: event.target.value })} />
        </Field>
        <Field label="宛名">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={value.addressee} onChange={(event) => patch({ addressee: event.target.value })} />
        </Field>
        <Field label="敬称">
          <select className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={value.honorific} onChange={(event) => patch({ honorific: event.target.value as Recipient["honorific"] })}>
            <option value="御中">御中</option>
            <option value="様">様</option>
            <option value="">なし</option>
          </select>
        </Field>
        <Field label="担当部署">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={value.department} onChange={(event) => patch({ department: event.target.value })} />
        </Field>
        <Field label="郵便番号">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={value.postalCode} onChange={(event) => patch({ postalCode: event.target.value })} />
        </Field>
        <Field label="請求対象">
          <select className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={value.status} onChange={(event) => patch({ status: event.target.value as Recipient["status"] })}>
            <option value="active">請求対象</option>
            <option value="suspended">停止</option>
          </select>
        </Field>
        <Field label="送付先住所" className="md:col-span-2">
          <textarea className="min-h-20 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={value.address} onChange={(event) => patch({ address: event.target.value })} />
        </Field>
        <Field label="摘要" className="md:col-span-2">
          <textarea className="min-h-20 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={value.description} onChange={(event) => patch({ description: event.target.value })} />
        </Field>
        <Field label="備考" className="md:col-span-2">
          <textarea className="min-h-24 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={value.notes} onChange={(event) => patch({ notes: event.target.value })} />
        </Field>
      </section>

      <section className="rounded-xl border border-[var(--line)] bg-white p-4">
        <h2 className="mb-3 font-semibold">確認フラグ</h2>
        <div className="flex flex-wrap gap-3">
          {flagKeys.map((flag) => (
            <label key={flag} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={value.reviewFlags.includes(flag)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...value.reviewFlags, flag]
                    : value.reviewFlags.filter((item) => item !== flag);
                  patch({ reviewFlags: next });
                }}
              />
              {FLAG_LABELS[flag]}
            </label>
          ))}
        </div>
        {reasons.length ? (
          <ul className="mt-3 list-disc pl-5 text-sm text-[var(--seal)]">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[#2f6b45]">この内容なら正式発行できます。</p>
        )}
      </section>

      <section className="rounded-xl border border-[var(--line)] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">年度別請求金額</h2>
          <button
            type="button"
            className="text-sm underline"
            onClick={() =>
              patch({
                yearAmounts: [
                  ...value.yearAmounts,
                  {
                    fiscalYear: settings.fiscalYear,
                    label: settings.fiscalYearLabel,
                    amountYen: null,
                    description: "",
                    lines: [],
                    dueDate: null,
                    dueText: null,
                    sourceSheet: "",
                  },
                ],
              })
            }
          >
            年度を追加
          </button>
        </div>
        <div className="space-y-4">
          {value.yearAmounts.map((year, index) => (
            <div key={`${year.fiscalYear}-${index}`} className="rounded-lg border border-[var(--line)] p-3">
              <div className="grid gap-2 md:grid-cols-4">
                <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" type="number" value={year.fiscalYear} onChange={(event) => updateYear(index, { fiscalYear: Number(event.target.value) })} />
                <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={year.label} onChange={(event) => updateYear(index, { label: event.target.value })} />
                <input
                  className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                  inputMode="numeric"
                  placeholder="金額（空欄は未確定）"
                  value={year.amountYen ?? ""}
                  onChange={(event) =>
                    updateYear(index, { amountYen: event.target.value === "" ? null : Number(event.target.value) })
                  }
                />
                <input
                  className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                  type="date"
                  value={year.dueDate ?? ""}
                  onChange={(event) => updateYear(index, { dueDate: event.target.value || null })}
                />
              </div>
              <div className="mt-3 space-y-2">
                {year.lines.map((line, lineIndex) => (
                  <div key={lineIndex} className="grid grid-cols-[1fr_140px_auto] gap-2">
                    <input
                      className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                      value={line.label}
                      onChange={(event) => updateLine(index, lineIndex, { label: event.target.value })}
                    />
                    <input
                      className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                      inputMode="numeric"
                      value={line.amountYen}
                      onChange={(event) => updateLine(index, lineIndex, { amountYen: Number(event.target.value) })}
                    />
                    <button type="button" className="text-sm" onClick={() => removeLine(index, lineIndex)}>
                      削除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm underline"
                  onClick={() =>
                    updateYear(index, { lines: [...year.lines, { label: "", amountYen: 0 }] })
                  }
                >
                  明細を追加
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <OverrideFields value={value} onChange={patch} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-[var(--seal)] px-4 py-2 text-white disabled:opacity-60">
          {pending ? "保存中" : "保存する"}
        </button>
        {!isNew ? (
          <button
            type="button"
            className="text-sm text-[var(--seal)] underline"
            onClick={async () => {
              const result = await deleteRecipientAction(value.id);
              if (result && !result.ok) {
                setMessage(result.error);
                return;
              }
              router.push("/recipients");
              router.refresh();
            }}
          >
            削除する
          </button>
        ) : null}
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
    </form>
  );

  function updateYear(index: number, partial: Partial<Recipient["yearAmounts"][number]>) {
    patch({
      yearAmounts: value.yearAmounts.map((year, yearIndex) => (yearIndex === index ? { ...year, ...partial } : year)),
    });
  }

  function updateLine(yearIndex: number, lineIndex: number, partial: Partial<Recipient["yearAmounts"][number]["lines"][number]>) {
    const year = value.yearAmounts[yearIndex];
    updateYear(yearIndex, {
      lines: year.lines.map((line, index) => (index === lineIndex ? { ...line, ...partial } : line)),
    });
  }

  function removeLine(yearIndex: number, lineIndex: number) {
    const year = value.yearAmounts[yearIndex];
    updateYear(yearIndex, { lines: year.lines.filter((_, index) => index !== lineIndex) });
  }
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function OverrideFields({ value, onChange }: { value: Recipient; onChange: (partial: Partial<Recipient>) => void }) {
  const bank = value.bankOverride ?? {};
  const contact = value.contactOverride ?? {};
  const issuer = value.issuerOverride ?? {};
  return (
    <section className="rounded-xl border border-[var(--line)] bg-white p-4">
      <h2 className="font-semibold">個別設定</h2>
      <p className="mb-3 text-sm text-[var(--muted)]">空欄の項目は基本設定を使います。</p>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="個別の銀行名">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={bank.bankName ?? ""} onChange={(event) => onChange({ bankOverride: { ...bank, bankName: event.target.value } })} />
        </Field>
        <Field label="支店">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={bank.branchName ?? ""} onChange={(event) => onChange({ bankOverride: { ...bank, branchName: event.target.value } })} />
        </Field>
        <Field label="口座種別">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={bank.accountType ?? ""} onChange={(event) => onChange({ bankOverride: { ...bank, accountType: event.target.value } })} />
        </Field>
        <Field label="口座番号">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={bank.accountNumber ?? ""} onChange={(event) => onChange({ bankOverride: { ...bank, accountNumber: event.target.value } })} />
        </Field>
        <Field label="口座名義">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={bank.accountHolder ?? ""} onChange={(event) => onChange({ bankOverride: { ...bank, accountHolder: event.target.value } })} />
        </Field>
        <Field label="口座名義カナ">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={bank.accountHolderKana ?? ""} onChange={(event) => onChange({ bankOverride: { ...bank, accountHolderKana: event.target.value } })} />
        </Field>
        <Field label="個別の問い合わせ担当">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={contact.name ?? ""} onChange={(event) => onChange({ contactOverride: { ...contact, name: event.target.value } })} />
        </Field>
        <Field label="個別の電話番号">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={contact.phone ?? ""} onChange={(event) => onChange({ contactOverride: { ...contact, phone: event.target.value } })} />
        </Field>
        <Field label="個別の会長名">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={issuer.chairmanName ?? ""} onChange={(event) => onChange({ issuerOverride: { ...issuer, chairmanName: event.target.value } })} />
        </Field>
        <Field label="個別の会計部長名">
          <input className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2" value={issuer.treasurerName ?? ""} onChange={(event) => onChange({ issuerOverride: { ...issuer, treasurerName: event.target.value } })} />
        </Field>
      </div>
    </section>
  );
}
