import Link from "next/link";
import { PageTitle, Panel } from "@/components/shell";
import { formatYen } from "@/lib/format";
import { summarize } from "@/lib/stats";
import { getRepository } from "@/lib/store";

export default async function DashboardPage() {
  const state = await (await getRepository()).getState();
  const stats = summarize(state);
  const holderMissing = !state.settings.bank.accountHolder && !state.settings.bank.accountHolderKana;
  const cards = [
    ["請求先件数", `${stats.recipientCount} 件（対象 ${stats.activeCount}）`],
    ["請求予定総額", formatYen(stats.plannedTotal)],
    ["請求書発行済み", `${stats.issuedCount} 件`],
    ["未発行", `${stats.unissuedCount} 件`],
    ["入金済み金額", formatYen(stats.paidTotal)],
    ["未入金額", formatYen(stats.unpaidTotal)],
  ];
  return (
    <div>
      <PageTitle
        title="ダッシュボード"
        description={`${state.settings.fiscalYearLabel}（${state.settings.periodStart} 〜 ${state.settings.periodEnd}）`}
      />
      {holderMissing ? (
        <p className="mb-4 rounded-lg border border-[#efd3a4] bg-[#fff6e8] px-4 py-3 text-sm">
          口座名義が空欄のため、正式な請求書は発行できません。
          <Link href="/settings" className="ml-2 underline">基本設定で確認する</Link>
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <Panel key={label}>
            <p className="text-sm text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </Panel>
        ))}
      </div>
      <Panel className="mt-4">
        <p className="text-sm">
          金額未確定 {stats.unknownAmountCount} 件 / 確認フラグあり {stats.reviewCount} 件。未確認の請求先はプレビューのみで、正式発行はできません。
        </p>
      </Panel>
    </div>
  );
}
