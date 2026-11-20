import { readFileSync } from "node:fs";
import { parseBillingWorkbook } from "../src/lib/excel/parse-workbook";

async function main() {
const filePath =
  process.argv[2] ??
  "/Users/nakasys/Downloads/R8_マンション町会費にかかる請求書_20260812.xlsx のコピー.xlsx";

const result = await parseBillingWorkbook(
  readFileSync(filePath),
  filePath.split("/").pop() ?? "source.xlsx",
);
const first = result.recipients[0];
console.log(
  "year cells",
  Object.entries(first.sourceRaw)
    .filter(([, value]) => value.includes("年度") || value.includes("町会費"))
    .map(([key, value]) => `${key}:${value}`),
);
console.log("sheets", result.sheetCount);
console.log("bank", result.settings.bank);
console.log("---");
let planned = 0;
for (const recipient of result.recipients) {
  const year = recipient.yearAmounts[0];
  if (recipient.status === "active" && year?.fiscalYear === 2026 && year.amountYen) {
    planned += year.amountYen;
  }
  console.log(
    [
      recipient.status === "active" ? "対象" : "停止",
      recipient.sourceSheet,
      recipient.name,
      recipient.buildingName,
      String(year?.fiscalYear ?? "-"),
      year?.amountYen == null ? "未確定" : String(year.amountYen),
      recipient.postalCode || "〒なし",
      recipient.address ? "住所あり" : "住所なし",
      recipient.reviewFlags.join("+") || "フラグなし",
    ].join(" | "),
  );
  if (!recipient.postalCode) {
    console.log("   ADDR:", JSON.stringify(recipient.address));
  }
  if (recipient.notes) console.log("   notes:", recipient.notes.replace(/\n/g, " / ").slice(0, 180));
}
console.log("planned active R8", planned);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
