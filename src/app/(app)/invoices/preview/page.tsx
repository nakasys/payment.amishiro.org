import { PageTitle } from "@/components/shell";
import { InvoiceSheet } from "@/components/invoice-sheet";
import { buildPreviewModel } from "@/lib/invoice-rules";
import { getRepository } from "@/lib/store";
import { todayISO } from "@/lib/format";
import type { InvoiceViewModel } from "@/lib/types";

export default async function InvoicePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; date?: string; invoices?: string }>;
}) {
  const params = await searchParams;
  const state = await (await getRepository()).getState();
  const issuedOn = params.date || todayISO();
  let models: InvoiceViewModel[] = [];
  let pdfHref = "";
  if (params.invoices) {
    const ids = params.invoices.split(",").filter(Boolean);
    models = state.invoices
      .filter((invoice) => ids.includes(invoice.id))
      .map((invoice) => ({ preview: false, blocked: false, reasons: [], snapshot: invoice.snapshot }));
    pdfHref = `/api/pdf/invoices?invoices=${ids.join(",")}&download=1`;
  } else {
    const ids = params.ids?.split(",").filter(Boolean) ?? [];
    models = state.recipients
      .filter((recipient) => ids.includes(recipient.id))
      .map((recipient) => buildPreviewModel(recipient, state.settings, issuedOn));
    pdfHref = `/api/pdf/invoices?recipients=${ids.join(",")}&issuedOn=${issuedOn}&download=1`;
  }

  return (
    <div>
      <PageTitle title="請求書プレビュー" description="画面のレイアウトを確認してから、同じ内容のPDFを出力できます。" />
      <div className="no-print mb-4 flex gap-3">
        {models.length ? (
          <a href={pdfHref} className="rounded-md bg-[var(--seal)] px-4 py-2 text-sm text-white">
            PDFをダウンロード
          </a>
        ) : (
          <p className="text-sm">請求先が選択されていません。</p>
        )}
      </div>
      <div className="space-y-8 overflow-x-auto">
        {models.map((model, index) => (
          <InvoiceSheet key={`${model.snapshot.invoiceNumber}-${index}`} model={model} />
        ))}
      </div>
    </div>
  );
}
