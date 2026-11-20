import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { assertCanAccess } from "@/lib/access";
import { buildPreviewModel } from "@/lib/invoice-rules";
import { getRepository } from "@/lib/store";
import { todayISO } from "@/lib/format";
import { InvoiceDocument } from "@/pdf/documents";
import type { InvoiceViewModel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await assertCanAccess();
  } catch {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const download = params.get("download") === "1";
  const issuedOn = params.get("issuedOn") || todayISO();
  const repo = await getRepository();
  const state = await repo.getState();
  let models: InvoiceViewModel[] = [];

  const invoiceIds = params.get("invoices")?.split(",").filter(Boolean) ?? [];
  const recipientIds = params.get("recipients")?.split(",").filter(Boolean) ?? [];
  if (invoiceIds.length) {
    models = state.invoices
      .filter((invoice) => invoiceIds.includes(invoice.id) && invoice.status === "issued")
      .map((invoice) => ({ preview: false, blocked: false, reasons: [], snapshot: invoice.snapshot }));
  } else {
    models = state.recipients
      .filter((recipient) => recipientIds.includes(recipient.id))
      .map((recipient) => buildPreviewModel(recipient, state.settings, issuedOn));
  }
  if (models.length === 0) {
    return NextResponse.json({ error: "出力する請求書がありません" }, { status: 404 });
  }

  const buffer = await renderToBuffer(<InvoiceDocument models={models} />);
  const filename = invoiceIds.length ? "町会費請求書.pdf" : "町会費請求書_プレビュー.pdf";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
