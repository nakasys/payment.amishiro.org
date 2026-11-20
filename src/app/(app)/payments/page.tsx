import { PageTitle, Panel } from "@/components/shell";
import { formatDate, formatYen, todayISO } from "@/lib/format";
import { yearAmountFor } from "@/lib/invoice-rules";
import { paidAmount, paymentLabel } from "@/lib/stats";
import { getRepository } from "@/lib/store";
import { addPaymentAction, deletePaymentAction } from "@/server/actions";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const state = await (await getRepository()).getState();
  const year = state.settings.fiscalYear;
  return (
    <div className="space-y-6">
      <PageTitle title="入金管理" description={`${state.settings.fiscalYearLabel}の入金です。一部入金も記録できます。`} />
      {params.error ? <p className="text-sm text-[var(--seal)]">入金日と、1円以上の金額を入力してください。</p> : null}
      <Panel>
        <form action={addPaymentAction} className="grid gap-3 md:grid-cols-4">
          <select name="recipientId" required className="rounded-md border border-[var(--line)] px-3 py-2 md:col-span-2">
            {state.recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.name || recipient.addressee}
              </option>
            ))}
          </select>
          <input name="paidOn" type="date" required defaultValue={todayISO()} className="rounded-md border border-[var(--line)] px-3 py-2" />
          <input name="amountYen" inputMode="numeric" required placeholder="入金額" className="rounded-md border border-[var(--line)] px-3 py-2" />
          <input name="note" placeholder="備考" className="rounded-md border border-[var(--line)] px-3 py-2 md:col-span-3" />
          <button className="rounded-md bg-[var(--seal)] px-4 py-2 text-white">入金を記録</button>
        </form>
      </Panel>
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-[#f7f1e7]">
            <tr>
              <th className="px-3 py-2">請求先</th>
              <th className="px-3 py-2">請求額</th>
              <th className="px-3 py-2">入金額</th>
              <th className="px-3 py-2">未収</th>
              <th className="px-3 py-2">状況</th>
              <th className="px-3 py-2">履歴</th>
            </tr>
          </thead>
          <tbody>
            {state.recipients.map((recipient) => {
              const billed = yearAmountFor(recipient, year)?.amountYen ?? null;
              const paid = paidAmount(state, recipient.id, year);
              const balance = billed == null ? null : billed - paid;
              const history = state.payments.filter((payment) => payment.recipientId === recipient.id && payment.fiscalYear === year);
              return (
                <tr key={recipient.id} className="border-t border-[var(--line)] align-top">
                  <td className="px-3 py-3">{recipient.name}</td>
                  <td className="px-3 py-3">{formatYen(billed)}</td>
                  <td className="px-3 py-3">{formatYen(paid)}</td>
                  <td className="px-3 py-3">{formatYen(balance)}</td>
                  <td className="px-3 py-3">{paymentLabel(billed, paid)}</td>
                  <td className="px-3 py-3">
                    {history.map((payment) => (
                      <form key={payment.id} action={deletePaymentAction} className="mb-1 flex items-center gap-2">
                        <input type="hidden" name="id" value={payment.id} />
                        <span>
                          {formatDate(payment.paidOn)} {formatYen(payment.amountYen)} {payment.note}
                        </span>
                        <button className="text-xs text-[var(--seal)] underline">削除</button>
                      </form>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
