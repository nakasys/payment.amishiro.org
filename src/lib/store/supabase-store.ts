import type {
  AppState,
  Invoice,
  LabelSettings,
  Payment,
  Recipient,
  Settings,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

function asSettings(row: Record<string, unknown>): Settings {
  return {
    organizationName: String(row.organization_name ?? ""),
    chairmanName: String(row.chairman_name ?? ""),
    treasurerName: String(row.treasurer_name ?? ""),
    contactName: String(row.contact_name ?? ""),
    phone: String(row.phone ?? ""),
    postalCode: String(row.postal_code ?? ""),
    address: String(row.address ?? ""),
    bank: {
      bankName: String(row.bank_name ?? ""),
      branchName: String(row.bank_branch ?? ""),
      accountType: String(row.account_type ?? ""),
      accountNumber: String(row.account_number ?? ""),
      accountHolder: String(row.account_holder ?? ""),
      accountHolderKana: String(row.account_holder_kana ?? ""),
    },
    reviewNotes: String(row.review_notes ?? ""),
    fiscalYear: Number(row.fiscal_year),
    fiscalYearLabel: String(row.fiscal_year_label ?? ""),
    periodStart: String(row.period_start).slice(0, 10),
    periodEnd: String(row.period_end).slice(0, 10),
    subject: String(row.subject ?? ""),
    defaultDueDate: row.default_due_date ? String(row.default_due_date).slice(0, 10) : null,
    nextInvoiceSeq: Number(row.next_invoice_seq ?? 1),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function settingsRow(settings: Settings) {
  return {
    id: 1,
    organization_name: settings.organizationName,
    chairman_name: settings.chairmanName,
    treasurer_name: settings.treasurerName,
    contact_name: settings.contactName,
    phone: settings.phone,
    postal_code: settings.postalCode,
    address: settings.address,
    bank_name: settings.bank.bankName,
    bank_branch: settings.bank.branchName,
    account_type: settings.bank.accountType,
    account_number: settings.bank.accountNumber,
    account_holder: settings.bank.accountHolder,
    account_holder_kana: settings.bank.accountHolderKana,
    review_notes: settings.reviewNotes,
    fiscal_year: settings.fiscalYear,
    fiscal_year_label: settings.fiscalYearLabel,
    period_start: settings.periodStart,
    period_end: settings.periodEnd,
    subject: settings.subject,
    default_due_date: settings.defaultDueDate,
    next_invoice_seq: settings.nextInvoiceSeq,
    updated_at: new Date().toISOString(),
  };
}

function asLabel(row: Record<string, unknown>): LabelSettings {
  return {
    columns: Number(row.columns),
    rows: Number(row.rows),
    marginTopMm: Number(row.margin_top_mm),
    marginLeftMm: Number(row.margin_left_mm),
    labelWidthMm: Number(row.label_width_mm),
    labelHeightMm: Number(row.label_height_mm),
    pitchXMm: Number(row.pitch_x_mm),
    pitchYMm: Number(row.pitch_y_mm),
    fontSizePt: Number(row.font_size_pt),
  };
}

function labelRow(settings: LabelSettings) {
  return {
    id: 1,
    columns: settings.columns,
    rows: settings.rows,
    margin_top_mm: settings.marginTopMm,
    margin_left_mm: settings.marginLeftMm,
    label_width_mm: settings.labelWidthMm,
    label_height_mm: settings.labelHeightMm,
    pitch_x_mm: settings.pitchXMm,
    pitch_y_mm: settings.pitchYMm,
    font_size_pt: settings.fontSizePt,
    updated_at: new Date().toISOString(),
  };
}

function asRecipient(row: Record<string, unknown>): Recipient {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    managementCompany: String(row.management_company ?? ""),
    buildingName: String(row.building_name ?? ""),
    postalCode: String(row.postal_code ?? ""),
    address: String(row.address ?? ""),
    addressee: String(row.addressee ?? ""),
    honorific: (row.honorific as Recipient["honorific"]) || "",
    department: String(row.department ?? ""),
    description: String(row.description ?? ""),
    notes: String(row.notes ?? ""),
    sourceSheet: String(row.source_sheet ?? ""),
    sourceFileName: String(row.source_file_name ?? ""),
    sourceRaw: (row.source_raw as Record<string, string>) ?? {},
    status: row.status === "suspended" ? "suspended" : "active",
    reviewFlags: (row.review_flags as Recipient["reviewFlags"]) ?? [],
    yearAmounts: (row.year_amounts as Recipient["yearAmounts"]) ?? [],
    bankOverride: (row.bank_override as Recipient["bankOverride"]) ?? null,
    contactOverride: (row.contact_override as Recipient["contactOverride"]) ?? null,
    issuerOverride: (row.issuer_override as Recipient["issuerOverride"]) ?? null,
    legacyInvoiceNo: String(row.legacy_invoice_no ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function recipientRow(recipient: Recipient) {
  return {
    id: recipient.id,
    name: recipient.name,
    management_company: recipient.managementCompany,
    building_name: recipient.buildingName,
    postal_code: recipient.postalCode,
    address: recipient.address,
    addressee: recipient.addressee,
    honorific: recipient.honorific,
    department: recipient.department,
    description: recipient.description,
    notes: recipient.notes,
    source_sheet: recipient.sourceSheet,
    source_file_name: recipient.sourceFileName,
    source_raw: recipient.sourceRaw,
    status: recipient.status,
    review_flags: recipient.reviewFlags,
    year_amounts: recipient.yearAmounts,
    bank_override: recipient.bankOverride,
    contact_override: recipient.contactOverride,
    issuer_override: recipient.issuerOverride,
    legacy_invoice_no: recipient.legacyInvoiceNo,
    created_at: recipient.createdAt,
    updated_at: new Date().toISOString(),
  };
}

async function db() {
  return createClient();
}

async function must<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export const supabaseRepository = {
  async getState(): Promise<AppState> {
    const supabase = await db();
    const [settings, labels, recipients, invoices, payments, logs] = await Promise.all([
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("label_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("recipients").select("*").order("source_sheet"),
      supabase.from("invoices").select("*").order("created_at"),
      supabase.from("payments").select("*").order("paid_on"),
      supabase.from("import_logs").select("*").order("imported_at", { ascending: false }),
    ]);
    for (const result of [settings, labels, recipients, invoices, payments, logs]) {
      if (result.error) throw new Error(result.error.message);
    }
    if (!settings.data || !labels.data) {
      throw new Error("基本設定が未作成です。マイグレーション後に初期行を投入してください。");
    }
    return {
      settings: asSettings(settings.data),
      labelSettings: asLabel(labels.data),
      recipients: (recipients.data ?? []).map((row) => asRecipient(row)),
      invoices: (invoices.data ?? []).map((row) => ({
        id: String(row.id),
        recipientId: String(row.recipient_id),
        fiscalYear: Number(row.fiscal_year),
        invoiceNumber: String(row.invoice_number),
        issuedOn: String(row.issued_on).slice(0, 10),
        status: row.status === "void" ? "void" : "issued",
        amountYen: Number(row.amount_yen),
        snapshot: row.snapshot,
        createdAt: String(row.created_at),
      })),
      payments: (payments.data ?? []).map((row) => ({
        id: String(row.id),
        recipientId: String(row.recipient_id),
        invoiceId: row.invoice_id ? String(row.invoice_id) : null,
        fiscalYear: Number(row.fiscal_year),
        paidOn: String(row.paid_on).slice(0, 10),
        amountYen: Number(row.amount_yen),
        note: String(row.note ?? ""),
        createdAt: String(row.created_at),
      })),
      importLogs: (logs.data ?? []).map((row) => ({
        id: String(row.id),
        fileName: String(row.file_name),
        importedAt: String(row.imported_at),
        added: Number(row.added),
        updated: Number(row.updated),
        skipped: Number(row.skipped),
      })),
    };
  },
  async saveSettings(settings: Settings) {
    const supabase = await db();
    await must(await supabase.from("app_settings").upsert(settingsRow(settings)));
  },
  async saveLabelSettings(settings: LabelSettings) {
    const supabase = await db();
    await must(await supabase.from("label_settings").upsert(labelRow(settings)));
  },
  async saveRecipient(recipient: Recipient) {
    const supabase = await db();
    await must(await supabase.from("recipients").upsert(recipientRow(recipient)));
  },
  async deleteRecipient(id: string) {
    const supabase = await db();
    await must(await supabase.from("recipients").delete().eq("id", id));
  },
  async saveIssued(invoices: Invoice[], nextInvoiceSeq: number) {
    const supabase = await db();
    await must(
      await supabase.from("invoices").insert(
        invoices.map((invoice) => ({
          id: invoice.id,
          recipient_id: invoice.recipientId,
          fiscal_year: invoice.fiscalYear,
          invoice_number: invoice.invoiceNumber,
          issued_on: invoice.issuedOn,
          status: invoice.status,
          amount_yen: invoice.amountYen,
          snapshot: invoice.snapshot,
          created_at: invoice.createdAt,
        })),
      ),
    );
    await must(
      await supabase
        .from("app_settings")
        .update({ next_invoice_seq: nextInvoiceSeq, updated_at: new Date().toISOString() })
        .eq("id", 1),
    );
  },
  async savePayment(payment: Payment) {
    const supabase = await db();
    await must(
      await supabase.from("payments").insert({
        id: payment.id,
        recipient_id: payment.recipientId,
        invoice_id: payment.invoiceId,
        fiscal_year: payment.fiscalYear,
        paid_on: payment.paidOn,
        amount_yen: payment.amountYen,
        note: payment.note,
        created_at: payment.createdAt,
      }),
    );
  },
  async deletePayment(id: string) {
    const supabase = await db();
    await must(await supabase.from("payments").delete().eq("id", id));
  },
  async importRecipients(rows: Recipient[], mode: "add" | "overwrite", fileName: string) {
    const state = await this.getState();
    let added = 0;
    let updated = 0;
    let skipped = 0;
    const supabase = await db();
    if (mode === "add") {
      const sheets = new Set(state.recipients.map((recipient) => recipient.sourceSheet).filter(Boolean));
      const inserting = rows.filter((row) => {
        if (row.sourceSheet && sheets.has(row.sourceSheet)) {
          skipped += 1;
          return false;
        }
        added += 1;
        return true;
      });
      if (inserting.length) {
        await must(await supabase.from("recipients").insert(inserting.map(recipientRow)));
      }
    } else {
      for (const row of rows) {
        const previous = state.recipients.find(
          (recipient) => recipient.sourceSheet && recipient.sourceSheet === row.sourceSheet,
        );
        if (previous) {
          await must(
            await supabase.from("recipients").upsert(
              recipientRow({ ...row, id: previous.id, createdAt: previous.createdAt }),
            ),
          );
          updated += 1;
        } else {
          await must(await supabase.from("recipients").insert(recipientRow(row)));
          added += 1;
        }
      }
    }
    await must(
      await supabase.from("import_logs").insert({
        file_name: fileName,
        added,
        updated,
        skipped,
      }),
    );
  },
};
