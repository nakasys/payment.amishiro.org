export function formatYen(amount: number | null | undefined): string {
  if (amount == null) return "金額未確定";
  return `¥${new Intl.NumberFormat("ja-JP").format(amount)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
}

export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\s\u3000]+/g, "")
    .replace(/株式会社|有限会社|㈱|\(株\)|（株）/g, "")
    .replace(/管理組合/g, "")
    .replace(/御中|様/g, "")
    .replace(/[・･．.]/g, "")
    .toLowerCase();
}

export function parseYen(value: string | undefined | null): number | null {
  if (!value) return null;
  const text = value.replace(/[,，]/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const amount = Math.round(Number(text));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function parseJapaneseDate(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/(令和|平成)\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/);
  if (!match) return null;
  const base = match[1] === "令和" ? 2018 : 1988;
  const year = base + Number(match[2]);
  const month = String(match[3]).padStart(2, "0");
  const day = String(match[4]).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

export function splitAddressLines(address: string): string[] {
  return address
    .split(/\n|／|\//)
    .map((line) => line.trim())
    .filter(Boolean);
}
