import { PageTitle } from "@/components/shell";
import { RecipientTable } from "@/components/recipient-table";
import { getRepository } from "@/lib/store";

export default async function RecipientsPage() {
  const state = await (await getRepository()).getState();
  return (
    <div>
      <PageTitle title="請求先一覧" description="検索、並べ替え、編集ができます。金額が空欄の請求先は未確定のままです。" />
      <RecipientTable rows={state.recipients} fiscalYear={state.settings.fiscalYear} />
    </div>
  );
}
