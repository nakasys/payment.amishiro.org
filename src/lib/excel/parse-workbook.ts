import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { defaultSettings } from "@/lib/defaults";
import { normalizeName, parseJapaneseDate, parseYen } from "@/lib/format";
import type { Recipient, ReviewFlag, Settings, YearLine } from "@/lib/types";

interface RawCell {
  text: string;
  formula?: string;
}

type CellMap = Map<string, RawCell>;

interface LabelBlock {
  lines: string[];
  notes: string[];
  postalCode: string;
  address: string;
  nameLines: string[];
}

export interface ParseResult {
  recipients: Recipient[];
  settings: Settings;
  sheetCount: number;
}

function columnName(index: number): string {
  let name = "";
  let n = index;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function formatDate(value: Date): string {
  const year = value.getFullYear();
  if (!Number.isFinite(year) || year < 1990) return "";
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function resultText(result: unknown): string {
  if (typeof result === "string") return result.replace(/\r\n/g, "\n").trim();
  if (typeof result === "number" && Number.isFinite(result)) {
    if (Math.abs(result - Math.round(result)) < 1e-6) return String(Math.round(result));
    return String(result);
  }
  if (result instanceof Date) return formatDate(result);
  return "";
}

function cellToRaw(cell: ExcelJS.Cell): RawCell {
  const value = cell.value;
  if (value && typeof value === "object" && "formula" in value) {
    return {
      text: resultText("result" in value ? value.result : null),
      formula: String(value.formula),
    };
  }
  if (value == null) return { text: "" };
  if (value instanceof Date) return { text: formatDate(value) };
  if (typeof value === "number") return { text: resultText(value) };
  if (typeof value === "string") return { text: value.replace(/\r\n/g, "\n").trim() };
  if (typeof value === "boolean") return { text: value ? "TRUE" : "FALSE" };
  if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return {
      text: value.richText
        .map((part) => part.text ?? "")
        .join("")
        .replace(/\r\n/g, "\n")
        .trim(),
    };
  }
  return { text: "" };
}

function noteToText(cell: ExcelJS.Cell): string {
  const note = cell.note;
  if (!note) return "";
  if (typeof note === "string") return note.trim();
  if (typeof note === "object" && "texts" in note && Array.isArray(note.texts)) {
    return note.texts
      .map((part) => ("text" in part ? part.text : ""))
      .join("")
      .trim();
  }
  return "";
}

function readSheet(sheet: ExcelJS.Worksheet): { cells: CellMap; comments: string[] } {
  const cells: CellMap = new Map();
  const comments: string[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const raw = cellToRaw(cell);
      if (raw.text || raw.formula) cells.set(`${columnName(colNumber)}${rowNumber}`, raw);
      const comment = noteToText(cell);
      if (comment) comments.push(comment);
    });
  });
  return { cells, comments };
}

function resolveFormulas(sheets: { name: string; cells: CellMap }[]) {
  const byName = new Map(sheets.map((sheet) => [sheet.name, sheet.cells]));
  for (let pass = 0; pass < 4; pass += 1) {
    for (const sheet of sheets) {
      for (const cell of sheet.cells.values()) {
        if (cell.text || !cell.formula) continue;
        const match = cell.formula.match(/^[+=]?'([^']+)'!\$?([A-Z]+)\$?(\d+)$/);
        if (!match) continue;
        const referred = byName.get(match[1])?.get(`${match[2]}${match[3]}`)?.text;
        if (referred) cell.text = referred;
      }
    }
  }
}

function textMap(cells: CellMap): Map<string, string> {
  const map = new Map<string, string>();
  for (const [ref, cell] of cells) {
    if (cell.text) map.set(ref, cell.text);
  }
  return map;
}

function entries(cells: Map<string, string>) {
  return [...cells.entries()].map(([ref, value]) => ({
    ref,
    col: ref.replace(/[0-9]/g, ""),
    row: Number(ref.replace(/[^0-9]/g, "")),
    value,
  }));
}

function isInvoiceSheet(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed === "原本" || trimmed.includes("ラベル")) return false;
  if (trimmed.toLowerCase().startsWith("past")) return false;
  return true;
}

function isNote(value: string): boolean {
  return (
    value.startsWith("➝") ||
    value.startsWith("⇒") ||
    value.startsWith("→") ||
    value.includes("確認") ||
    value.includes("入金なし") ||
    value.includes("次年度") ||
    value.includes("読めな") ||
    value.includes("潰れて") ||
    value.includes("持参") ||
    value.includes("誰宛て") ||
    value.includes("日付いつ")
  );
}

function splitHonorific(raw: string): { name: string; honorific: "" | "御中" | "様" } {
  const value = raw.replace(/\u3000/g, " ").replace(/[ \t]+/g, " ").trim();
  if (value.endsWith("御中")) {
    return { name: value.slice(0, -2).trim(), honorific: "御中" };
  }
  if (value.endsWith("様")) {
    return { name: value.slice(0, -1).trim(), honorific: "様" };
  }
  return { name: value, honorific: "" };
}

function detectFiscal(texts: string[]): { year: number; label: string } | null {
  const feeLine = texts.find((text) => text.includes("町会費") && /R\s*\d+|令和\s*\d+/.test(text));
  const source =
    feeLine ?? texts.find((text) => /R\s*\d+\s*年度|令和\s*\d+\s*年度/.test(text));
  if (!source) return null;
  const match = source.match(/R\s*(\d{1,2})/) ?? source.match(/令和\s*(\d{1,2})/);
  if (!match) return null;
  const era = Number(match[1]);
  return { year: 2018 + era, label: `令和${era}年度` };
}

function sheetTitle(name: string): string {
  return name.replace(/^[\d.\-]+/, "").trim();
}

function isAddressLine(line: string): boolean {
  const compact = line.replace(/[\s\u3000]/g, "");
  if (/^〒?\d{3}-?\d{4}$/.test(compact)) return false;
  if (/御中|様$/.test(compact) && !/[0-9０-９]/.test(compact)) return false;
  return /^(東京都|神奈川県|千葉県|埼玉県|北海道|大阪府|京都府)|[0-9０-９].*(丁目|番|号|階)|ビル|タワー/.test(
    line,
  );
}

function parseLabelBlocks(cells: Map<string, string>): LabelBlock[] {
  const rows = [...cells.keys()].map((ref) => Number(ref.replace(/[^0-9]/g, "")));
  const max = rows.length ? Math.max(...rows) : 0;
  const blocks: { lines: string[]; notes: string[] }[] = [];
  let current: { lines: string[]; notes: string[] } | null = null;

  for (let row = 1; row <= max; row += 1) {
    const content = [cells.get(`A${row}`), cells.get(`B${row}`), cells.get(`C${row}`)]
      .filter((value): value is string => Boolean(value && value.trim()))
      .flatMap((value) => value.split("\n").map((line) => line.trim()).filter(Boolean));
    const note = cells.get(`D${row}`)?.trim() ?? "";
    if (content.length === 0 && !note) {
      if (current && current.lines.length > 0) blocks.push(current);
      current = null;
      continue;
    }
    if (!current) current = { lines: [], notes: [] };
    current.lines.push(...content);
    if (note) current.notes.push(...note.split("\n").map((line) => line.trim()).filter(Boolean));
  }
  if (current && current.lines.length > 0) blocks.push(current);

  return blocks.map((block) => {
    let postalCode = "";
    const rest: string[] = [];
    for (const line of block.lines) {
      const match = line.replace(/[\s\u3000]/g, "").match(/^〒?(\d{3})-?(\d{4})$/);
      if (match && !postalCode) postalCode = `${match[1]}-${match[2]}`;
      else rest.push(line);
    }
    const address = rest.filter(isAddressLine).join("\n");
    const nameLines = rest.filter((line) => !isAddressLine(line));
    return { lines: block.lines, notes: block.notes, postalCode, address, nameLines };
  });
}

function scoreBlock(recipient: Recipient, block: LabelBlock): number {
  const raw = normalizeName(block.lines.join(""));
  if (!raw) return 0;
  let score = 0;
  const building = normalizeName(recipient.buildingName);
  const addressee = normalizeName(recipient.addressee || recipient.name);
  const company = normalizeName(recipient.managementCompany);
  if (building.length >= 3 && raw.includes(building)) score += 80;
  if (addressee.length >= 3 && raw.includes(addressee)) score += 40;
  if (company.length >= 3 && raw.includes(company)) score += 12;
  for (const part of recipient.buildingName.split(/[、,]/)) {
    const token = normalizeName(part.split(/[：:]/)[0] ?? "");
    if (token.length >= 4 && raw.includes(token)) score += 20;
  }
  return score;
}

function applyLabels(recipients: Recipient[], blocks: LabelBlock[]) {
  for (const recipient of recipients) {
    if (recipient.address && recipient.postalCode) continue;
    const ranked = blocks
      .map((block) => ({ block, score: scoreBlock(recipient, block) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const strong = ranked.filter((item) => item.score >= 40);
    const best = ranked[0];
    if (!best) {
      recipient.reviewFlags.push("unknown_address");
      continue;
    }

    const candidateText = [
      best.block.postalCode ? `〒${best.block.postalCode}` : "",
      best.block.address,
      ...best.block.nameLines,
      ...best.block.notes.map((note) => `備考: ${note}`),
    ]
      .filter(Boolean)
      .join("\n");

    if (strong.length !== 1) {
      if (!recipient.address) {
        recipient.reviewFlags.push("unknown_address", "needs_review");
        recipient.notes = [recipient.notes, "ラベル候補が特定できないため住所は空欄です。", candidateText]
          .filter(Boolean)
          .join("\n");
      }
      continue;
    }

    const block = strong[0].block;
    if (!recipient.postalCode) recipient.postalCode = block.postalCode;
    if (!recipient.address) recipient.address = block.address;
    const department = block.nameLines.filter((line) => /担当|係|課|部|様|御中/.test(line));
    if (!recipient.department && department.length > 1) {
      recipient.department = department.slice(1).join(" ").replace(/御中|様/g, "").trim();
    }
    if (block.notes.length) {
      recipient.notes = [recipient.notes, ...block.notes.map((note) => `ラベル備考: ${note}`)]
        .filter(Boolean)
        .join("\n");
    }
    if (!recipient.address) recipient.reviewFlags.push("unknown_address");
    if (recipient.address && !recipient.postalCode) recipient.reviewFlags.push("unknown_postal_code");
  }
}

function findDuplicates(recipients: Recipient[]) {
  const groups = new Map<string, Recipient[]>();
  for (const recipient of recipients) {
    const key = normalizeName(recipient.buildingName);
    if (key.length < 3) continue;
    groups.set(key, [...(groups.get(key) ?? []), recipient]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const recipient of group) {
      recipient.reviewFlags.push("duplicate_candidate", "needs_review");
      recipient.notes = [
        recipient.notes,
        "同一の物件名が複数シートにあります。前期・後期、または二重請求の可能性があります。",
      ]
        .filter(Boolean)
        .join("\n");
    }
  }
}

function uniqueFlags(flags: ReviewFlag[]): ReviewFlag[] {
  return [...new Set(flags)];
}

function addressAbove(
  items: { col: string; row: number; value: string }[],
  addresseeRow: number,
): { postalCode: string; address: string } {
  const lines = items
    .filter((item) => item.col === "C" && item.row < addresseeRow && item.row >= addresseeRow - 8)
    .sort((a, b) => a.row - b.row)
    .map((item) => item.value);
  let postalCode = "";
  const address: string[] = [];
  for (const line of lines) {
    const match = line.replace(/[\s\u3000]/g, "").match(/^〒?(\d{3})-?(\d{4})$/);
    if (match && !postalCode) postalCode = `${match[1]}-${match[2]}`;
    else if (isAddressLine(line) || address.length > 0) address.push(line);
  }
  return { postalCode, address: address.join("\n") };
}

function parseInvoiceSheet(
  sheetName: string,
  cells: Map<string, string>,
  comments: string[],
  fileName: string,
  now: string,
): { recipient: Recipient; bankLine: string; accountLine: string; kanaLine: string; issuerAddress: string; phone: string; chair: string } | null {
  if (cells.size === 0) return null;
  const items = entries(cells);
  const values = items.map((item) => item.value);
  const addresseeCell = items
    .filter((item) => item.col === "C" && (item.value.includes("御中") || /様$/.test(item.value.trim())))
    .sort((a, b) => a.row - b.row)[0];
  const { name, honorific } = splitHonorific(addresseeCell?.value ?? sheetTitle(sheetName));
  const inlineAddress = addresseeCell ? addressAbove(items, addresseeCell.row) : { postalCode: "", address: "" };
  const following = addresseeCell
    ? items.find((item) => item.col === "C" && item.row === addresseeCell.row + 1)
    : undefined;
  const department =
    following && !following.value.startsWith("拝啓") && !following.value.includes("町会費")
      ? splitHonorific(following.value).name
      : "";

  const amountRow = items.find((item) => item.col === "C" && item.value.includes("ご請求金額"));
  const statedAmount = parseYen(amountRow ? cells.get(`E${amountRow.row}`) : undefined);
  const header = items.find((item) => item.value.includes("業務内容"));
  const subtotal = items.find((item) => item.value === "小計");
  const lines: YearLine[] = [];
  const extraNotes: string[] = [];
  const looseAddress: string[] = [];
  let loosePostal = "";
  if (header && subtotal) {
    for (let row = header.row + 1; row < subtotal.row; row += 1) {
      const label = (cells.get(`C${row}`) ?? "").replace(/\u3000/g, " ").trim();
      const compact = label.replace(/[\s\u3000]/g, "");
      if (/^\d{1,2}月\d{1,2}日$/.test(compact)) continue;
      const qty = Number(cells.get(`G${row}`));
      const unit = Number(String(cells.get(`H${row}`) ?? "").replace(/,/g, ""));
      const amount =
        parseYen(cells.get(`I${row}`)) ??
        (Number.isFinite(qty) && Number.isFinite(unit) && qty > 0 && unit > 0
          ? Math.round(qty * unit)
          : null);
      const side = (cells.get(`E${row}`) ?? "").trim();
      if (!label || /^0(\.0)?$/.test(label) || label.startsWith("1899-")) continue;
      if (!amount) {
        const postal = compact.match(/^〒?(\d{3})-?(\d{4})$/);
        if (postal) {
          loosePostal = `${postal[1]}-${postal[2]}`;
          continue;
        }
        if (isAddressLine(label)) {
          looseAddress.push(label);
          continue;
        }
        if (!/^R\s*\d+\s*年度|^令和\s*\d+\s*年度/.test(label) && !label.startsWith("会員名")) {
          extraNotes.push(`金額のない明細: ${label.trim()}`);
        }
        continue;
      }
      if (/^R\s*\d+\s*年度|^令和\s*\d+\s*年度/.test(label)) continue;
      lines.push({
        label: label.replace(/^会員名\s*/, "").trim(),
        amountYen: amount,
        note: side && !/^\d+(\.\d+)?$/.test(side) ? side : undefined,
      });
    }
  }

  const fiscal = detectFiscal(values);
  const dueText =
    values.find((value) => value.includes("振り込み") || value.includes("振込下さ")) ?? null;
  const dueDate = parseJapaneseDate(dueText);
  const bankItem = items.find(
    (item) =>
      /信用金庫|銀行/.test(item.value) &&
      !item.value.includes("御中") &&
      !item.value.includes("会員"),
  );
  const accountItem = items.find((item) => /普通|当座/.test(item.value) && /\d{5,}/.test(item.value));
  const kanaItem = items.find(
    (item) => /[ァ-ヶー]{4,}/.test(item.value) && (item.value.includes("カイチョウ") || item.value.includes("アミシロ")),
  );
  const memberLabels = items
    .filter((item) => item.col === "C" && item.value.startsWith("会員名"))
    .map((item) => item.value.replace(/^会員名[\s\u3000]*/, "").trim());
  if (lines.length === 0 && statedAmount && memberLabels.length > 0) {
    lines.push({
      label: memberLabels.map((label) => label.replace(/様$/, "").trim()).join("、"),
      amountYen: statedAmount,
    });
  }
  const legacy = items.find((item) => /^No\.\s*\d+$/.test(item.value.replace(/\s/g, "")))?.value ?? "";
  const explicitNotes = [
    ...items.filter((item) => isNote(item.value)).map((item) => item.value),
    ...comments,
    ...extraNotes,
  ];
  const issuerAddress =
    items.find((item) => item.col === "I" && /^東京都|^〒/.test(item.value))?.value ?? "";
  const phone = items.find((item) => /TEL/i.test(item.value))?.value ?? "";
  const chair =
    items.find((item) => /会長/.test(item.value) && /：|:/.test(item.value))?.value ?? "";

  const flags: ReviewFlag[] = [];
  const notes = [...new Set(explicitNotes)];
  if (notes.length) flags.push("needs_review");
  if (!statedAmount) flags.push("unknown_amount");
  if (!fiscal) {
    flags.push("needs_review");
    notes.push("請求年度をシートから確定できませんでした。");
  } else if (fiscal.year < 2026) flags.push("old_year");

  const yearTokens = new Set(
    [...values.join("\n").matchAll(/R\s*(\d{1,2})\s*年度|令和\s*(\d{1,2})\s*年度/g)].map(
      (match) => match[1] || match[2],
    ),
  );
  if (yearTokens.size > 1) {
    flags.push("needs_review");
    notes.push(
      `年度の記載が複数あります: ${[...yearTokens].map((token) => `令和${Number(token)}年度`).join("、")}`,
    );
  }
  const lineSum = lines.reduce((sum, line) => sum + line.amountYen, 0);
  if (statedAmount && lines.length > 0 && lineSum !== statedAmount) {
    flags.push("needs_review");
    notes.push(`明細合計 ${lineSum.toLocaleString("ja-JP")} 円とご請求金額 ${statedAmount.toLocaleString("ja-JP")} 円が一致しません。`);
  }

  const buildingName =
    lines
      .map((line) => line.label.split(/[：:]/)[0]?.trim() ?? "")
      .filter((label) => label && !/^R\s*\d+\s*年度|^令和/.test(label))
      .join("、") ||
    memberLabels
      .map((label) => label.split(/[：:]/)[0]?.replace(/様$/, "").trim() ?? "")
      .filter(Boolean)
      .join("、");
  const title = sheetTitle(sheetName);
  const titleNorm = normalizeName(title);
  const buildingNorm = normalizeName(buildingName);
  const addresseeNorm = normalizeName(name);
  let managementCompany = "";
  if (/株式会社|㈱|（株）|\(株\)/.test(name)) managementCompany = name;
  else if (
    titleNorm &&
    !buildingNorm.includes(titleNorm) &&
    !addresseeNorm.includes(titleNorm) &&
    !(buildingNorm && titleNorm.includes(buildingNorm))
  ) {
    managementCompany = title;
  }

  const description = lines.map((line) => line.label).join("\n");
  const recipient: Recipient = {
    id: randomUUID(),
    name,
    managementCompany,
    buildingName,
    postalCode: inlineAddress.postalCode || loosePostal,
    address: inlineAddress.address || looseAddress.join("\n"),
    addressee: name,
    honorific,
    department,
    description,
    notes: notes.join("\n"),
    sourceSheet: sheetName,
    sourceFileName: fileName,
    sourceRaw: Object.fromEntries(cells),
    status: flags.includes("old_year") ? "suspended" : "active",
    reviewFlags: uniqueFlags(flags),
    yearAmounts: [
      {
        fiscalYear: fiscal?.year ?? 0,
        label: fiscal?.label ?? "年度不明",
        amountYen: statedAmount,
        description,
        lines,
        dueDate,
        dueText,
        sourceSheet: sheetName,
      },
    ],
    bankOverride: null,
    contactOverride: null,
    issuerOverride: null,
    legacyInvoiceNo: legacy.replace(/\s/g, ""),
    createdAt: now,
    updatedAt: now,
  };

  return {
    recipient,
    bankLine: bankItem?.value ?? "",
    accountLine: accountItem?.value ?? "",
    kanaLine: kanaItem?.value ?? "",
    issuerAddress,
    phone,
    chair,
  };
}

function buildSettings(
  banks: { bankLine: string; accountLine: string; kanaLine: string }[],
  issuerAddresses: string[],
  phones: string[],
  chairs: string[],
  now: string,
): Settings {
  const settings = defaultSettings(now);
  const bankNames = new Set<string>();
  const branches = new Set<string>();
  const types = new Set<string>();
  const numbers = new Set<string>();
  const kanas = new Set<string>();

  for (const bank of banks) {
    const match = bank.bankLine.match(/^(.+?(?:信用金庫|銀行))\s*(.*)$/);
    if (match) {
      bankNames.add(match[1].trim());
      if (match[2].trim()) branches.add(match[2].trim());
    }
    const number = bank.accountLine.match(/(\d{6,8})/)?.[1];
    if (number) numbers.add(number);
    if (bank.accountLine.includes("当座")) types.add("当座預金");
    else if (bank.accountLine) types.add("普通預金");
    if (bank.kanaLine) kanas.add(bank.kanaLine.replace(/\s+/g, " ").trim());
  }

  const only = (values: Set<string>) => (values.size === 1 ? [...values][0] : "");
  settings.bank = {
    bankName: only(bankNames),
    branchName: only(branches),
    accountType: only(types),
    accountNumber: only(numbers),
    accountHolder: "",
    accountHolderKana: only(kanas),
  };

  const notes = [
    "元Excelの多くは会長を佐野一之、電話を 090-2398-6720 と記載しています。現行の初期値は指定どおり、会長 中村大輔、会計部長 佐々木良一、電話 080-9523-6118 です。",
  ];
  if (kanas.size !== 1) {
    notes.push(
      `口座名義カナは元Excel内で一致しないため空欄です: ${[...kanas].join(" / ") || "記載なし"}`,
    );
  } else {
    notes.push(
      "口座の銀行・支店・種別・番号は全シートで一致したため採用しました。口座名義の漢字は元Excelに現行名義として確定できる記載がないため空欄です。",
    );
  }
  const addresses = [...new Set(issuerAddresses.filter(Boolean))];
  if (addresses.length !== 1) {
    notes.push(
      `発行者住所は元Excelで一致しないため空欄です: ${addresses.join(" / ") || "記載なし"}`,
    );
  }
  if (phones.length) notes.push(`元Excelの電話番号: ${[...new Set(phones)].join(" / ")}`);
  if (chairs.length) notes.push(`元Excelの会長欄: ${[...new Set(chairs)].join(" / ")}`);
  settings.reviewNotes = notes.join("\n");
  return settings;
}

export async function parseBillingWorkbook(buffer: Buffer, fileName: string): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const now = new Date().toISOString();
  const sheets = workbook.worksheets.map((sheet) => ({
    name: sheet.name,
    ...readSheet(sheet),
  }));
  resolveFormulas(sheets);
  const parsed = sheets
    .filter((sheet) => isInvoiceSheet(sheet.name))
    .map((sheet) => parseInvoiceSheet(sheet.name, textMap(sheet.cells), sheet.comments, fileName, now))
    .filter((item): item is NonNullable<typeof item> => item != null);

  const recipients = parsed.map((item) => item.recipient);
  const labelSheet = sheets.find((sheet) => sheet.name.includes("ラベル"));
  if (labelSheet) {
    applyLabels(recipients, parseLabelBlocks(textMap(labelSheet.cells)));
  } else {
    for (const recipient of recipients) recipient.reviewFlags.push("unknown_address");
  }
  findDuplicates(recipients);
  for (const recipient of recipients) {
    if (!recipient.address.trim()) recipient.reviewFlags.push("unknown_address");
    else if (!recipient.postalCode.trim() && !/手渡し|持参/.test(recipient.address)) {
      recipient.reviewFlags.push("unknown_postal_code");
    }
    recipient.reviewFlags = uniqueFlags(recipient.reviewFlags);
  }

  recipients.sort((a, b) => a.sourceSheet.localeCompare(b.sourceSheet, "ja", { numeric: true }));

  return {
    recipients,
    settings: buildSettings(
      parsed,
      parsed.map((item) => item.issuerAddress),
      parsed.map((item) => item.phone).filter(Boolean),
      parsed.map((item) => item.chair).filter(Boolean),
      now,
    ),
    sheetCount: parsed.length,
  };
}
