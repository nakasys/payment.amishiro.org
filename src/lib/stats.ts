import { yearAmountFor } from "@/lib/invoice-rules";
import type { AppState } from "@/lib/types";

export interface DashboardStats {
  recipientCount: number;
  activeCount: number;
  plannedTotal: number;
  unknownAmountCount: number;
  issuedCount: number;
  unissuedCount: number;
  paidTotal: number;
  unpaidTotal: number;
  reviewCount: number;
}

export function summarize(state: AppState): DashboardStats {
  const fiscalYear = state.settings.fiscalYear;
  const active = state.recipients.filter((recipient) => recipient.status === "active");
  const issued = state.invoices.filter(
    (invoice) => invoice.status === "issued" && invoice.fiscalYear === fiscalYear,
  );
  const issuedByRecipient = new Map(issued.map((invoice) => [invoice.recipientId, invoice]));
  let plannedTotal = 0;
  let unknownAmountCount = 0;
  let unissuedCount = 0;
  let unpaidTotal = 0;

  for (const recipient of active) {
    const amount = yearAmountFor(recipient, fiscalYear)?.amountYen ?? null;
    if (amount == null) unknownAmountCount += 1;
    else plannedTotal += amount;
    const invoice = issuedByRecipient.get(recipient.id);
    if (amount != null && !invoice) unissuedCount += 1;
    const billed = invoice?.amountYen ?? amount;
    if (billed != null) {
      const paid = state.payments
        .filter((payment) => payment.recipientId === recipient.id && payment.fiscalYear === fiscalYear)
        .reduce((sum, payment) => sum + payment.amountYen, 0);
      unpaidTotal += Math.max(0, billed - paid);
    }
  }

  const paidTotal = state.payments
    .filter((payment) => payment.fiscalYear === fiscalYear)
    .reduce((sum, payment) => sum + payment.amountYen, 0);

  return {
    recipientCount: state.recipients.length,
    activeCount: active.length,
    plannedTotal,
    unknownAmountCount,
    issuedCount: issued.length,
    unissuedCount,
    paidTotal,
    unpaidTotal,
    reviewCount: state.recipients.filter((recipient) => recipient.reviewFlags.length > 0).length,
  };
}

export function paidAmount(state: AppState, recipientId: string, fiscalYear: number): number {
  return state.payments
    .filter((payment) => payment.recipientId === recipientId && payment.fiscalYear === fiscalYear)
    .reduce((sum, payment) => sum + payment.amountYen, 0);
}

export function paymentLabel(billed: number | null, paid: number): string {
  if (billed == null) return "金額未確定";
  if (paid <= 0) return "未入金";
  if (paid < billed) return "一部入金";
  if (paid === billed) return "入金済";
  return "過入金";
}
