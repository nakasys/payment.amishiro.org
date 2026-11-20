import { PageTitle } from "@/components/shell";
import { getRepository } from "@/lib/store";
import { saveSettingsAction } from "@/server/actions";

export default async function SettingsPage() {
  const settings = (await (await getRepository()).getState()).settings;
  const bank = settings.bank;
  return (
    <div>
      <PageTitle title="基本設定" description="空欄の項目は請求書に確定情報として出しません。発行済み請求書の内容は変わりません。" />
      <form action={saveSettingsAction} className="grid max-w-3xl gap-3 rounded-xl border border-[var(--line)] bg-white p-4 md:grid-cols-2">
        <Field name="organizationName" label="団体名" defaultValue={settings.organizationName} />
        <Field name="chairmanName" label="会長" defaultValue={settings.chairmanName} />
        <Field name="treasurerName" label="会計部長" defaultValue={settings.treasurerName} />
        <Field name="contactName" label="問い合わせ担当" defaultValue={settings.contactName} />
        <Field name="phone" label="電話番号" defaultValue={settings.phone} />
        <Field name="postalCode" label="団体の郵便番号" defaultValue={settings.postalCode} />
        <label className="text-sm md:col-span-2">
          団体の住所
          <input name="address" defaultValue={settings.address} className="mt-1 w-full rounded-md border border-[var(--line)] px-3 py-2" />
        </label>
        <Field name="bankName" label="銀行名" defaultValue={bank.bankName} />
        <Field name="branchName" label="支店" defaultValue={bank.branchName} />
        <Field name="accountType" label="口座種別" defaultValue={bank.accountType} />
        <Field name="accountNumber" label="口座番号" defaultValue={bank.accountNumber} />
        <Field name="accountHolder" label="口座名義" defaultValue={bank.accountHolder} />
        <Field name="accountHolderKana" label="口座名義カナ" defaultValue={bank.accountHolderKana} />
        <Field name="fiscalYearLabel" label="対象年度の表示" defaultValue={settings.fiscalYearLabel} />
        <Field name="fiscalYear" label="対象年度（西暦）" defaultValue={String(settings.fiscalYear)} />
        <Field name="periodStart" label="対象期間の開始" type="date" defaultValue={settings.periodStart} />
        <Field name="periodEnd" label="対象期間の終了" type="date" defaultValue={settings.periodEnd} />
        <Field name="subject" label="件名" defaultValue={settings.subject} />
        <Field name="defaultDueDate" label="共通の支払期限" type="date" defaultValue={settings.defaultDueDate ?? ""} />
        <label className="text-sm md:col-span-2">
          確認メモ
          <textarea name="reviewNotes" defaultValue={settings.reviewNotes} className="mt-1 min-h-36 w-full rounded-md border border-[var(--line)] px-3 py-2" />
        </label>
        <button className="rounded-md bg-[var(--seal)] px-4 py-2 text-white md:col-span-2 md:w-fit">保存する</button>
      </form>
    </div>
  );
}

function Field({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue: string; type?: string }) {
  return (
    <label className="text-sm">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} className="mt-1 w-full rounded-md border border-[var(--line)] px-3 py-2" />
    </label>
  );
}
