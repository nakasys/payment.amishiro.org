import { PdfPreview } from "@/components/print-pdf-button";
import { PageTitle } from "@/components/shell";
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
    pdfHref = `/api/pdf/invoices?invoices=${ids.join(",")}`;
  } else {
    const ids = params.ids?.split(",").filter(Boolean) ?? [];
    models = state.recipients
      .filter((recipient) => ids.includes(recipient.id))
      .map((recipient) => buildPreviewModel(recipient, state.settings, issuedOn));
    pdfHref = `/api/pdf/invoices?recipients=${ids.join(",")}&issuedOn=${issuedOn}`;
  }

  return (
    <div>
      <PageTitle
        className="no-print"
        title="請求書プレビュー"
        description="請求書のPDFを表示しています。宛名ラベルと同じように、この画面から印刷できます。"
      />
      {models.length ? (
        <PdfPreview href={pdfHref} title="請求書プレビュー" />
      ) : (
        <p className="text-sm">請求先が選択されていません。</p>
      )}
    </div>
  );
}
