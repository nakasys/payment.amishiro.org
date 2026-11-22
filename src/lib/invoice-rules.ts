import type {
  BankAccount,
  ContactInfo,
  InvoiceSnapshot,
  InvoiceViewModel,
  IssuerInfo,
  LabelCard,
  Recipient,
  Settings,
} from "@/lib/types";
import { splitAddressLines } from "@/lib/format";

function pick(override: string | undefined, fallback: string): string {
  const value = override?.trim();
  return value ? value : fallback;
}

export function yearAmountFor(recipient: Recipient, fiscalYear: number) {
  return recipient.yearAmounts.find((year) => year.fiscalYear === fiscalYear) ?? null;
}

export function resolveBank(recipient: Recipient, settings: Settings): BankAccount {
  const override = recipient.bankOverride ?? {};
  return {
    bankName: pick(override.bankName, settings.bank.bankName),
    branchName: pick(override.branchName, settings.bank.branchName),
    accountType: pick(override.accountType, settings.bank.accountType),
    accountNumber: pick(override.accountNumber, settings.bank.accountNumber),
    accountHolder: pick(override.accountHolder, settings.bank.accountHolder),
    accountHolderKana: pick(override.accountHolderKana, settings.bank.accountHolderKana),
  };
}

export function resolveIssuer(recipient: Recipient, settings: Settings): IssuerInfo {
  const override = recipient.issuerOverride ?? {};
  return {
    organizationName: pick(override.organizationName, settings.organizationName),
    chairmanName: pick(override.chairmanName, settings.chairmanName),
    treasurerName: pick(override.treasurerName, settings.treasurerName),
    postalCode: pick(override.postalCode, settings.postalCode),
    address: pick(override.address, settings.address),
  };
}

export function resolveContact(recipient: Recipient, settings: Settings): ContactInfo {
  const override = recipient.contactOverride ?? {};
  return {
    name: pick(override.name, settings.contactName),
    phone: pick(override.phone, settings.phone),
  };
}

export function formatInvoiceNumber(settings: Settings, sequence: number): string {
  const match = settings.fiscalYearLabel.match(/令和\s*(\d+)/);
  const prefix = match ? `R${match[1]}` : `FY${settings.fiscalYear}`;
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

export function blockingReasons(recipient: Recipient, settings: Settings): string[] {
  const reasons: string[] = [];
  if (recipient.status !== "active") reasons.push("請求対象外です");
  const year = yearAmountFor(recipient, settings.fiscalYear);
  if (!year || year.amountYen == null) {
    reasons.push(`${settings.fiscalYearLabel}の請求金額が未確定です`);
  } else if (year.lines.length > 0) {
    const sum = year.lines.reduce((total, line) => total + line.amountYen, 0);
    if (sum !== year.amountYen) reasons.push("明細の合計と請求金額が一致しません");
  }
  if (!recipient.name.trim() && !recipient.addressee.trim()) reasons.push("請求先名が未入力です");
  if (
    recipient.address.trim() &&
    !recipient.postalCode.trim() &&
    !/手渡し|持参/.test(recipient.address)
  ) {
    reasons.push("郵便番号が未確定です");
  }
  const bank = resolveBank(recipient, settings);
  if (!bank.bankName || !bank.branchName || !bank.accountType || !bank.accountNumber) {
    reasons.push("振込先（銀行・支店・種別・口座番号）が未確定です");
  }
  if (!bank.accountHolder && !bank.accountHolderKana) reasons.push("口座名義が未確定です");
  const issuer = resolveIssuer(recipient, settings);
  const contact = resolveContact(recipient, settings);
  if (!issuer.organizationName || !issuer.chairmanName || !issuer.treasurerName) {
    reasons.push("発行者情報が未設定です");
  }
  if (!contact.name || !contact.phone) reasons.push("問い合わせ先が未設定です");
  if (recipient.reviewFlags.includes("withdrawn")) reasons.push("脱会としてマークされています");
  if (recipient.reviewFlags.includes("old_year") && (!year || year.amountYen == null)) {
    reasons.push("旧年度の情報のみで、今年度の金額がありません");
  }
  return reasons;
}

export function buildSnapshot(
  recipient: Recipient,
  settings: Settings,
  issuedOn: string,
  invoiceNumber: string,
): InvoiceSnapshot {
  const year = yearAmountFor(recipient, settings.fiscalYear);
  const lines =
    year?.lines.filter((line) => line.amountYen > 0).map((line) => ({
      label: line.label,
      amountYen: line.amountYen,
    })) ?? [];
  const dueDate = year?.dueDate || settings.defaultDueDate;
  return {
    invoiceNumber,
    issuedOn,
    recipientName: recipient.name,
    honorific: recipient.honorific,
    buildingName: recipient.buildingName,
    addressee: recipient.addressee || recipient.name,
    subject: settings.subject,
    periodStart: settings.periodStart,
    periodEnd: settings.periodEnd,
    fiscalYearLabel: settings.fiscalYearLabel,
    lines:
      lines.length > 0
        ? lines
        : year?.amountYen
          ? [{ label: recipient.description || settings.subject, amountYen: year.amountYen }]
          : [],
    amountYen: year?.amountYen ?? null,
    bank: resolveBank(recipient, settings),
    dueDate,
    issuer: resolveIssuer(recipient, settings),
    contact: resolveContact(recipient, settings),
    description: recipient.description,
  };
}

export function buildPreviewModel(
  recipient: Recipient,
  settings: Settings,
  issuedOn: string,
): InvoiceViewModel {
  const reasons = blockingReasons(recipient, settings);
  return {
    preview: true,
    blocked: reasons.length > 0,
    reasons,
    snapshot: buildSnapshot(recipient, settings, issuedOn, "未採番"),
  };
}

export function bankLines(bank: BankAccount): string[] {
  const holder = [bank.accountHolder, bank.accountHolderKana].filter(Boolean).join("　");
  return [
    [bank.bankName, bank.branchName].filter(Boolean).join("　") || "銀行名未確定",
    [bank.accountType, bank.accountNumber].filter(Boolean).join("　") || "口座番号未確定",
    holder ? `口座名義　${holder}` : "口座名義　要確認",
  ];
}

export function buildLabelCard(recipient: Recipient): LabelCard {
  const missing: string[] = [];
  if (!recipient.postalCode) missing.push("郵便番号");
  if (!recipient.address) missing.push("住所");
  if (!recipient.addressee && !recipient.name) missing.push("宛名");
  const addressee = recipient.addressee || recipient.name;
  const honorific =
    recipient.honorific && !addressee.endsWith(recipient.honorific) ? recipient.honorific : "";
  return {
    recipientId: recipient.id,
    postalCode: recipient.postalCode,
    addressLines: splitAddressLines(recipient.address),
    addressee,
    honorific,
    department: recipient.department,
    missing,
  };
}

export const FLAG_LABELS: Record<string, string> = {
  unknown_amount: "金額不明",
  unknown_address: "住所不明",
  unknown_postal_code: "郵便番号不明",
  old_year: "旧年度",
  duplicate_candidate: "重複の可能性",
  needs_review: "要確認",
  withdrawn: "脱会",
};
