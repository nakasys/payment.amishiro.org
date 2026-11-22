import { PageTitle } from "@/components/shell";
import { LabelStudio } from "@/components/label-studio";
import { buildLabelCard } from "@/lib/invoice-rules";
import { getRepository } from "@/lib/store";

export default async function LabelsPage() {
  const state = await (await getRepository()).getState();
  const rows = state.recipients
    .filter((recipient) => recipient.status === "active")
    .map((recipient) => {
      const card = buildLabelCard(recipient);
      return { id: recipient.id, name: recipient.name || recipient.addressee, address: recipient.address, missing: card.missing };
    });
  return (
    <div>
      <PageTitle className="no-print" title="宛名ラベル" description="初期値はA4の2列×5段です。お使いのラベル用紙に合わせて余白とピッチを調整できます。" />
      <LabelStudio rows={rows} initial={state.labelSettings} />
    </div>
  );
}
