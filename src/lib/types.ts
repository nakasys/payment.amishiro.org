export type ReviewFlag =
  | "unknown_amount"
  | "unknown_address"
  | "unknown_postal_code"
  | "old_year"
  | "duplicate_candidate"
  | "needs_review"
  | "withdrawn";

export type RecipientStatus = "active" | "suspended";

export interface BankAccount {
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  accountHolderKana: string;
}

export interface ContactInfo {
  name: string;
  phone: string;
}

export interface IssuerInfo {
  organizationName: string;
  chairmanName: string;
  treasurerName: string;
  postalCode: string;
  address: string;
}

export interface YearLine {
  label: string;
  amountYen: number;
  note?: string;
}

export interface YearAmount {
  fiscalYear: number;
  label: string;
  amountYen: number | null;
  description: string;
  lines: YearLine[];
  dueDate: string | null;
  dueText: string | null;
  sourceSheet: string;
}

export interface Recipient {
  id: string;
  name: string;
  managementCompany: string;
  buildingName: string;
  postalCode: string;
  address: string;
  addressee: string;
  honorific: "" | "御中" | "様";
  department: string;
  description: string;
  notes: string;
  sourceSheet: string;
  sourceFileName: string;
  sourceRaw: Record<string, string>;
  status: RecipientStatus;
  reviewFlags: ReviewFlag[];
  yearAmounts: YearAmount[];
  bankOverride: Partial<BankAccount> | null;
  contactOverride: Partial<ContactInfo> | null;
  issuerOverride: Partial<IssuerInfo> | null;
  legacyInvoiceNo: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  organizationName: string;
  chairmanName: string;
  treasurerName: string;
  contactName: string;
  phone: string;
  postalCode: string;
  address: string;
  bank: BankAccount;
  reviewNotes: string;
  fiscalYear: number;
  fiscalYearLabel: string;
  periodStart: string;
  periodEnd: string;
  subject: string;
  defaultDueDate: string | null;
  nextInvoiceSeq: number;
  updatedAt: string;
}

export interface InvoiceSnapshot {
  invoiceNumber: string;
  issuedOn: string;
  recipientName: string;
  honorific: string;
  buildingName: string;
  addressee: string;
  subject: string;
  periodStart: string;
  periodEnd: string;
  fiscalYearLabel: string;
  lines: { label: string; amountYen: number }[];
  amountYen: number | null;
  bank: BankAccount;
  dueDate: string | null;
  issuer: IssuerInfo;
  contact: ContactInfo;
  description: string;
}

export interface Invoice {
  id: string;
  recipientId: string;
  fiscalYear: number;
  invoiceNumber: string;
  issuedOn: string;
  status: "issued" | "void";
  amountYen: number;
  snapshot: InvoiceSnapshot;
  createdAt: string;
}

export interface Payment {
  id: string;
  recipientId: string;
  invoiceId: string | null;
  fiscalYear: number;
  paidOn: string;
  amountYen: number;
  note: string;
  createdAt: string;
}

export interface LabelSettings {
  columns: number;
  rows: number;
  marginTopMm: number;
  marginLeftMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
  pitchXMm: number;
  pitchYMm: number;
  fontSizePt: number;
}

export interface ImportLog {
  id: string;
  fileName: string;
  importedAt: string;
  added: number;
  updated: number;
  skipped: number;
}

export interface AppState {
  settings: Settings;
  labelSettings: LabelSettings;
  recipients: Recipient[];
  invoices: Invoice[];
  payments: Payment[];
  importLogs: ImportLog[];
}

export interface InvoiceViewModel {
  preview: boolean;
  blocked: boolean;
  reasons: string[];
  snapshot: InvoiceSnapshot;
}

export interface LabelCard {
  recipientId: string;
  postalCode: string;
  addressLines: string[];
  addressee: string;
  honorific: string;
  department: string;
  missing: string[];
}
