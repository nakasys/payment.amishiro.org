import { PageTitle } from "@/components/shell";
import { RecipientForm } from "@/components/recipient-form";
import { blankRecipient } from "@/lib/defaults";
import { getRepository } from "@/lib/store";

export default async function NewRecipientPage() {
  const state = await (await getRepository()).getState();
  const recipient = blankRecipient();
  recipient.yearAmounts[0].fiscalYear = state.settings.fiscalYear;
  recipient.yearAmounts[0].label = state.settings.fiscalYearLabel;
  return (
    <div>
      <PageTitle title="請求先の新規登録" />
      <RecipientForm recipient={recipient} settings={state.settings} isNew />
    </div>
  );
}
