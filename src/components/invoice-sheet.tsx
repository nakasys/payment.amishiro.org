import { formatDate, formatYen } from "@/lib/format";
import { bankLines } from "@/lib/invoice-rules";
import type { InvoiceViewModel } from "@/lib/types";

export function InvoiceSheet({ model }: { model: InvoiceViewModel }) {
  const { snapshot } = model;
  const addressee = [snapshot.addressee || snapshot.recipientName, snapshot.honorific]
    .filter(Boolean)
    .join("　");
  return (
    <article className="sheet">
      {model.preview ? (
        <div className="watermark">{model.blocked ? "確認用" : "プレビュー"}</div>
      ) : null}
      <div className="flex items-start justify-between gap-6">
        <div className="w-16" />
        <h1>請求書</h1>
        <dl className="w-48 text-sm leading-6">
          <div className="flex justify-between gap-3">
            <dt>請求番号</dt>
            <dd>{snapshot.invoiceNumber}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>発行日</dt>
            <dd>{formatDate(snapshot.issuedOn)}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-8 text-xl font-semibold">{addressee}</p>
      {snapshot.buildingName ? (
        <p className="mt-2 text-sm">対象マンション　{snapshot.buildingName}</p>
      ) : null}

      <table className="mt-6 w-full border-collapse text-sm">
        <tbody>
          <tr className="border-y border-[#1c1915]">
            <th className="w-28 bg-[#f7f3ec] px-3 py-2 text-left font-medium">件名</th>
            <td className="px-3 py-2">{snapshot.subject}</td>
          </tr>
          <tr className="border-b border-[#1c1915]">
            <th className="bg-[#f7f3ec] px-3 py-2 text-left font-medium">対象期間</th>
            <td className="px-3 py-2">
              {formatDate(snapshot.periodStart)}〜{formatDate(snapshot.periodEnd)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-6 flex items-end justify-between border-2 border-[#1c1915] px-4 py-3">
        <span className="text-sm">ご請求金額</span>
        <strong className="text-3xl tracking-wide">{formatYen(snapshot.amountYen)}</strong>
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-[#1c1915] bg-[#f7f3ec]">
            <th className="px-3 py-2 text-left font-medium">摘要</th>
            <th className="w-36 px-3 py-2 text-right font-medium">金額</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.lines.length === 0 ? (
            <tr className="border-b border-[#d9d0c4]">
              <td className="px-3 py-3">明細未確定</td>
              <td className="px-3 py-3 text-right">金額未確定</td>
            </tr>
          ) : (
            snapshot.lines.map((line) => (
              <tr key={line.label} className="border-b border-[#d9d0c4]">
                <td className="px-3 py-2">{line.label}</td>
                <td className="px-3 py-2 text-right">{formatYen(line.amountYen)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <section className="mt-6 text-sm leading-7">
        <h2 className="font-semibold">お振込先</h2>
        {bankLines(snapshot.bank).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>

      <footer className="mt-10 grid grid-cols-2 gap-6 text-sm leading-7">
        <section>
          <h2 className="font-semibold">【本請求に関するお問い合わせ先】</h2>
          <p>
            {snapshot.issuer.organizationName}　{snapshot.contact.name}
          </p>
          <p>TEL：{snapshot.contact.phone || "未設定"}</p>
        </section>
        <section className="text-right">
          <p className="text-base font-semibold">{snapshot.issuer.organizationName}</p>
          <p>会長　{snapshot.issuer.chairmanName}</p>
          <p>会計部長　{snapshot.issuer.treasurerName}</p>
          {snapshot.issuer.address ? (
            <p className="mt-2 text-xs">
              {snapshot.issuer.postalCode} {snapshot.issuer.address}
            </p>
          ) : null}
        </section>
      </footer>
      {model.blocked ? (
        <p className="mt-6 text-xs text-[var(--seal)]">正式発行できません。{model.reasons.join(" / ")}</p>
      ) : null}
    </article>
  );
}
