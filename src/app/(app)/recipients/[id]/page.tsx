import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle, Panel } from "@/components/shell";
import { RecipientForm } from "@/components/recipient-form";
import { formatDate, formatYen } from "@/lib/format";
import { paidAmount, paymentLabel } from "@/lib/stats";
import { yearAmountFor } from "@/lib/invoice-rules";
import { getRepository } from "@/lib/store";

export default async function RecipientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await (await getRepository()).getState();
  const recipient = state.recipients.find((item) => item.id === id);
  if (!recipient) notFound();
  const year = yearAmountFor(recipient, state.settings.fiscalYear);
  const paid = paidAmount(state, recipient.id, state.settings.fiscalYear);
  const invoices = state.invoices.filter((invoice) => invoice.recipientId === recipient.id);
  const payments = state.payments.filter((payment) => payment.recipientId === recipient.id);
  return (
    <div className="space-y-6">
      <PageTitle title={recipient.name || "請求先"} description={recipient.sourceSheet ? `元シート: ${recipient.sourceSheet}` : "手入力"} />
      <Panel>
        <p className="text-sm">
          {state.settings.fiscalYearLabel}の請求 {formatYen(year?.amountYen ?? null)} / 入金 {formatYen(paid)} / {paymentLabel(year?.amountYen ?? null, paid)}
        </p>
        <Link href={`/invoices/preview?ids=${recipient.id}`} className="mt-2 inline-block text-sm underline">
          請求書プレビュー
        </Link>
      </Panel>
      <RecipientForm recipient={recipient} settings={state.settings} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-2 font-semibold">請求履歴</h2>
          {invoices.length === 0 ? <p className="text-sm text-[var(--muted)]">発行済みの請求書はありません。</p> : null}
          <ul className="space-y-2 text-sm">
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <Link href={`/invoices/preview?invoices=${invoice.id}`} className="underline">
                  {invoice.invoiceNumber}
                </Link>
                <span className="text-[var(--muted)]">　{formatDate(invoice.issuedOn)}　{formatYen(invoice.amountYen)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h2 className="mb-2 font-semibold">入金履歴</h2>
          {payments.length === 0 ? <p className="text-sm text-[var(--muted)]">入金はありません。</p> : null}
          <ul className="space-y-2 text-sm">
            {payments.map((payment) => (
              <li key={payment.id}>
                {formatDate(payment.paidOn)}　{formatYen(payment.amountYen)}　{payment.note}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel>
        <h2 className="mb-2 font-semibold">元Excelのセル</h2>
        <details>
          <summary className="cursor-pointer text-sm">保持しているセルを表示</summary>
          <pre className="mt-3 max-h-80 overflow-auto text-xs leading-5">
            {Object.entries(recipient.sourceRaw)
              .map(([key, cell]) => `${key}\t${cell}`)
              .join("\n") || "元データはありません"}
          </pre>
        </details>
      </Panel>
    </div>
  );
}
