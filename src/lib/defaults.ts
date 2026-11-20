import { randomUUID } from "node:crypto";
import type {
  AppState,
  LabelSettings,
  Recipient,
  Settings,
} from "@/lib/types";

export function emptyBank() {
  return {
    bankName: "",
    branchName: "",
    accountType: "",
    accountNumber: "",
    accountHolder: "",
    accountHolderKana: "",
  };
}

export function defaultSettings(now = new Date().toISOString()): Settings {
  return {
    organizationName: "麻布十番網代会",
    chairmanName: "中村大輔",
    treasurerName: "佐々木良一",
    contactName: "会長 中村大輔",
    phone: "080-9523-6118",
    postalCode: "",
    address: "",
    bank: emptyBank(),
    reviewNotes:
      "団体の郵便番号・住所、口座名義は元Excelから一意に確定できないため空欄です。請求書へは入れません。",
    fiscalYear: 2026,
    fiscalYearLabel: "令和8年度",
    periodStart: "2026-04-01",
    periodEnd: "2027-03-31",
    subject: "令和8年度 町会費",
    defaultDueDate: null,
    nextInvoiceSeq: 1,
    updatedAt: now,
  };
}

export function defaultLabelSettings(): LabelSettings {
  return {
    columns: 2,
    rows: 5,
    marginTopMm: 21.5,
    marginLeftMm: 18.6,
    labelWidthMm: 86.4,
    labelHeightMm: 50.8,
    pitchXMm: 86.4,
    pitchYMm: 50.8,
    fontSizePt: 9,
  };
}

export function blankRecipient(): Recipient {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    name: "",
    managementCompany: "",
    buildingName: "",
    postalCode: "",
    address: "",
    addressee: "",
    honorific: "御中",
    department: "",
    description: "",
    notes: "",
    sourceSheet: "",
    sourceFileName: "",
    sourceRaw: {},
    status: "active",
    reviewFlags: [],
    yearAmounts: [
      {
        fiscalYear: 2026,
        label: "令和8年度",
        amountYen: null,
        description: "",
        lines: [],
        dueDate: null,
        dueText: null,
        sourceSheet: "",
      },
    ],
    bankOverride: null,
    contactOverride: null,
    issuerOverride: null,
    legacyInvoiceNo: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function demoState(): AppState {
  const now = new Date().toISOString();
  const ready = blankRecipient();
  ready.name = "【デモ】サンプル管理組合";
  ready.addressee = "サンプル管理組合";
  ready.honorific = "御中";
  ready.buildingName = "サンプルマンション";
  ready.managementCompany = "サンプル管理株式会社";
  ready.postalCode = "106-0045";
  ready.address = "東京都港区麻布十番1-2-3 サンプルビル";
  ready.department = "管理担当";
  ready.description = "サンプルマンション";
  ready.notes = "画面とPDFの確認用です。実在の請求先ではありません。";
  ready.yearAmounts = [
    {
      fiscalYear: 2026,
      label: "令和8年度",
      amountYen: 12000,
      description: "サンプルマンション",
      lines: [{ label: "サンプルマンション", amountYen: 12000 }],
      dueDate: null,
      dueText: null,
      sourceSheet: "",
    },
  ];

  const incomplete = blankRecipient();
  incomplete.name = "【デモ】住所未確認マンション";
  incomplete.addressee = "住所未確認マンション管理組合";
  incomplete.buildingName = "住所未確認マンション";
  incomplete.honorific = "御中";
  incomplete.notes = "住所が無いため正式発行できないことを確認するデータです。";
  incomplete.reviewFlags = ["unknown_address", "needs_review"];
  incomplete.yearAmounts = [
    {
      fiscalYear: 2026,
      label: "令和8年度",
      amountYen: 8000,
      description: "住所未確認マンション",
      lines: [{ label: "住所未確認マンション", amountYen: 8000 }],
      dueDate: null,
      dueText: null,
      sourceSheet: "",
    },
  ];

  const settings = defaultSettings(now);
  settings.bank = {
    bankName: "（デモ）さわやか信用金庫",
    branchName: "麻布支店",
    accountType: "普通預金",
    accountNumber: "0000000",
    accountHolder: "デモ名義",
    accountHolderKana: "デモメイギ",
  };
  settings.reviewNotes =
    "これは開発用デモデータです。実在の口座・請求先ではありません。元Excelを取り込むと置き換わります。";

  return {
    settings,
    labelSettings: defaultLabelSettings(),
    recipients: [ready, incomplete],
    invoices: [],
    payments: [],
    importLogs: [],
  };
}
