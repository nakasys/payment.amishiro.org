import { PageTitle } from "@/components/shell";
import { IssuePanel, type IssueRow } from "@/components/issue-panel";
import { blockingReasons, compareBySourceSheet, yearAmountFor } from "@/lib/invoice-rules";
import { getRepository } from "@/lib/store";

export default async function InvoicesPage() {
  const state = await (await getRepository()).getState();
  const rows: IssueRow[] = [...state.recipients].sort(compareBySourceSheet).map((recipient) => ({
    id: recipient.id,
    name: recipient.name || recipient.addressee,
    buildingName: recipient.buildingName,
    amount: yearAmountFor(recipient, state.settings.fiscalYear)?.amountYen ?? null,
    reasons: blockingReasons(recipient, state.settings),
  }));
  return (
    <div>
      <PageTitle
        title="請求書発行"
        description="プレビューはいつでも表示できます。未確認の請求先を含む選択は正式発行できません。"
      />
      <IssuePanel rows={rows} />
    </div>
  );
}
