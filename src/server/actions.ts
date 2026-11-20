"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCanAccess } from "@/lib/access";
import { blankRecipient } from "@/lib/defaults";
import { parseBillingWorkbook } from "@/lib/excel/parse-workbook";
import { blockingReasons, buildSnapshot, formatInvoiceNumber } from "@/lib/invoice-rules";
import { getRepository } from "@/lib/store";
import type {
  BankAccount,
  ContactInfo,
  Invoice,
  IssuerInfo,
  LabelSettings,
  Payment,
  Recipient,
  ReviewFlag,
  Settings,
  YearAmount,
} from "@/lib/types";

const FLAGS: ReviewFlag[] = [
  "unknown_amount",
  "unknown_address",
  "unknown_postal_code",
  "old_year",
  "duplicate_candidate",
  "needs_review",
  "withdrawn",
];

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalDate(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function refresh(paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

function sanitizeYears(years: YearAmount[]): YearAmount[] {
  return years
    .map((year) => {
      const lines = (year.lines ?? [])
        .map((line) => ({
          label: String(line.label ?? "").trim(),
          amountYen: Math.round(Number(line.amountYen)),
          note: line.note?.trim() || undefined,
        }))
        .filter((line) => line.label && Number.isFinite(line.amountYen) && line.amountYen > 0);
      const rawAmount = year.amountYen as number | string | null;
      const amount =
        rawAmount == null || rawAmount === ""
          ? null
          : Math.round(Number(rawAmount));
      return {
        fiscalYear: Math.round(Number(year.fiscalYear)),
        label: String(year.label ?? "").trim(),
        amountYen: amount != null && Number.isFinite(amount) ? amount : null,
        description: String(year.description ?? "").trim() || lines.map((line) => line.label).join("\n"),
        lines,
        dueDate: optionalDate(String(year.dueDate ?? "")),
        dueText: year.dueText?.trim() || null,
        sourceSheet: String(year.sourceSheet ?? ""),
      };
    })
    .filter((year) => Number.isFinite(year.fiscalYear) && year.fiscalYear > 1900);
}

function cleanPartial<T extends object>(value: T | null | undefined): T | null {
  if (!value) return null;
  const entries = Object.entries(value).filter(([, item]) => typeof item === "string" && item.trim());
  if (entries.length === 0) return null;
  return Object.fromEntries(entries.map(([key, item]) => [key, String(item).trim()])) as T;
}

export async function saveRecipientAction(input: Recipient) {
  await assertCanAccess();
  const repo = await getRepository();
  const state = await repo.getState();
  const existing = state.recipients.find((recipient) => recipient.id === input.id);
  const now = new Date().toISOString();
  const honorific = input.honorific === "様" || input.honorific === "御中" ? input.honorific : "";
  const recipient: Recipient = {
    ...(existing ?? blankRecipient()),
    ...input,
    id: existing?.id ?? input.id,
    name: input.name.trim(),
    managementCompany: input.managementCompany.trim(),
    buildingName: input.buildingName.trim(),
    postalCode: input.postalCode.trim(),
    address: input.address.trim(),
    addressee: input.addressee.trim(),
    honorific,
    department: input.department.trim(),
    description: input.description.trim(),
    notes: input.notes.trim(),
    status: input.status === "suspended" ? "suspended" : "active",
    reviewFlags: [...new Set(input.reviewFlags.filter((flag) => FLAGS.includes(flag)))],
    yearAmounts: sanitizeYears(input.yearAmounts),
    bankOverride: cleanPartial<Partial<BankAccount>>(input.bankOverride),
    contactOverride: cleanPartial<Partial<ContactInfo>>(input.contactOverride),
    issuerOverride: cleanPartial<Partial<IssuerInfo>>(input.issuerOverride),
    sourceSheet: existing?.sourceSheet ?? input.sourceSheet ?? "",
    sourceFileName: existing?.sourceFileName ?? "",
    sourceRaw: existing?.sourceRaw ?? {},
    legacyInvoiceNo: existing?.legacyInvoiceNo ?? input.legacyInvoiceNo ?? "",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (!recipient.name && !recipient.addressee) {
    return { ok: false as const, error: "請求先名または宛名を入力してください" };
  }
  await repo.saveRecipient(recipient);
  refresh(["/recipients", `/recipients/${recipient.id}`, "/dashboard", "/invoices", "/labels", "/payments"]);
  return { ok: true as const, id: recipient.id };
}

export async function deleteRecipientAction(id: string) {
  await assertCanAccess();
  const repo = await getRepository();
  const state = await repo.getState();
  if (state.invoices.some((invoice) => invoice.recipientId === id && invoice.status === "issued")) {
    return { ok: false as const, error: "発行済みの請求書があるため削除できません。請求対象を停止してください。" };
  }
  await repo.deleteRecipient(id);
  refresh(["/recipients", "/dashboard"]);
  return { ok: true as const };
}

export async function saveSettingsAction(formData: FormData) {
  await assertCanAccess();
  const repo = await getRepository();
  const current = (await repo.getState()).settings;
  const fiscalYear = Number(text(formData.get("fiscalYear")));
  const settings: Settings = {
    ...current,
    organizationName: text(formData.get("organizationName")),
    chairmanName: text(formData.get("chairmanName")),
    treasurerName: text(formData.get("treasurerName")),
    contactName: text(formData.get("contactName")),
    phone: text(formData.get("phone")),
    postalCode: text(formData.get("postalCode")),
    address: text(formData.get("address")),
    bank: {
      bankName: text(formData.get("bankName")),
      branchName: text(formData.get("branchName")),
      accountType: text(formData.get("accountType")),
      accountNumber: text(formData.get("accountNumber")),
      accountHolder: text(formData.get("accountHolder")),
      accountHolderKana: text(formData.get("accountHolderKana")),
    },
    reviewNotes: text(formData.get("reviewNotes")),
    fiscalYear: Number.isFinite(fiscalYear) ? fiscalYear : current.fiscalYear,
    fiscalYearLabel: text(formData.get("fiscalYearLabel")),
    periodStart: optionalDate(text(formData.get("periodStart"))) ?? current.periodStart,
    periodEnd: optionalDate(text(formData.get("periodEnd"))) ?? current.periodEnd,
    subject: text(formData.get("subject")),
    defaultDueDate: optionalDate(text(formData.get("defaultDueDate"))),
    updatedAt: new Date().toISOString(),
  };
  await repo.saveSettings(settings);
  refresh(["/settings", "/dashboard", "/invoices"]);
}

export async function saveLabelSettingsAction(settings: LabelSettings) {
  await assertCanAccess();
  const numbers = [
    settings.columns,
    settings.rows,
    settings.marginTopMm,
    settings.marginLeftMm,
    settings.labelWidthMm,
    settings.labelHeightMm,
    settings.pitchXMm,
    settings.pitchYMm,
    settings.fontSizePt,
  ];
  if (numbers.some((value) => !Number.isFinite(value) || value <= 0)) {
    return { ok: false as const, error: "ラベル寸法は正の数値で入力してください" };
  }
  if (settings.columns > 5 || settings.rows > 12) {
    return { ok: false as const, error: "列数は5まで、段数は12までです" };
  }
  await (await getRepository()).saveLabelSettings(settings);
  refresh(["/labels"]);
  return { ok: true as const };
}

export async function issueInvoicesAction(ids: string[], issuedOn: string) {
  await assertCanAccess();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedOn)) {
    return { ok: false as const, error: "発行日を指定してください" };
  }
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return { ok: false as const, error: "請求先を選択してください" };
  const repo = await getRepository();
  const state = await repo.getState();
  const blocked: { name: string; reasons: string[] }[] = [];
  const targets = uniqueIds.flatMap((id) => {
    const recipient = state.recipients.find((item) => item.id === id);
    if (!recipient) return [];
    const reasons = blockingReasons(recipient, state.settings);
    if (reasons.length) blocked.push({ name: recipient.name || recipient.addressee, reasons });
    return [recipient];
  });
  if (targets.length !== uniqueIds.length) {
    return { ok: false as const, error: "選択した請求先が見つかりません" };
  }
  if (blocked.length) return { ok: false as const, blocked };
  let sequence = state.settings.nextInvoiceSeq;
  const now = new Date().toISOString();
  const invoices: Invoice[] = targets.map((recipient) => {
    const invoiceNumber = formatInvoiceNumber(state.settings, sequence);
    sequence += 1;
    const snapshot = buildSnapshot(recipient, state.settings, issuedOn, invoiceNumber);
    return {
      id: randomUUID(),
      recipientId: recipient.id,
      fiscalYear: state.settings.fiscalYear,
      invoiceNumber,
      issuedOn,
      status: "issued",
      amountYen: snapshot.amountYen ?? 0,
      snapshot,
      createdAt: now,
    };
  });
  await repo.saveIssued(invoices, sequence);
  refresh(["/invoices", "/dashboard", "/payments", "/recipients"]);
  return { ok: true as const, invoiceIds: invoices.map((invoice) => invoice.id) };
}

export async function addPaymentAction(formData: FormData) {
  await assertCanAccess();
  const amount = Math.round(Number(text(formData.get("amountYen"))));
  const paidOn = text(formData.get("paidOn"));
  const recipientId = text(formData.get("recipientId"));
  if (!recipientId) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || !Number.isFinite(amount) || amount <= 0) {
    redirect(`/payments?error=invalid`);
  }
  const repo = await getRepository();
  const state = await repo.getState();
  const payment: Payment = {
    id: randomUUID(),
    recipientId,
    invoiceId: text(formData.get("invoiceId")) || null,
    fiscalYear: state.settings.fiscalYear,
    paidOn,
    amountYen: amount,
    note: text(formData.get("note")),
    createdAt: new Date().toISOString(),
  };
  await repo.savePayment(payment);
  refresh(["/payments", "/dashboard", `/recipients/${recipientId}`]);
  redirect("/payments");
}

export async function deletePaymentAction(formData: FormData) {
  await assertCanAccess();
  const id = text(formData.get("id"));
  if (!id) return;
  await (await getRepository()).deletePayment(id);
  refresh(["/payments", "/dashboard"]);
}

export async function previewImportAction(formData: FormData) {
  await assertCanAccess();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Excelファイルを選択してください" };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false as const, error: "ファイルサイズは20MBまでです" };
  }
  try {
    const parsed = await parseBillingWorkbook(Buffer.from(await file.arrayBuffer()), file.name);
    return {
      ok: true as const,
      fileName: file.name,
      recipients: parsed.recipients,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Excelを読み取れませんでした",
    };
  }
}

export async function commitImportAction(
  fileName: string,
  recipients: Recipient[],
  mode: "add" | "overwrite",
) {
  await assertCanAccess();
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { ok: false as const, error: "取り込む請求先がありません" };
  }
  await (await getRepository()).importRecipients(recipients, mode, fileName);
  refresh(["/recipients", "/dashboard", "/import", "/invoices"]);
  return { ok: true as const };
}
