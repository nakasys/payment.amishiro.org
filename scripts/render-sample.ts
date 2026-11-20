import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { parseBillingWorkbook } from "../src/lib/excel/parse-workbook";
import { buildPreviewModel } from "../src/lib/invoice-rules";
import { InvoiceDocument, LabelDocument } from "../src/pdf/documents";
import { buildLabelCard } from "../src/lib/invoice-rules";
import { defaultLabelSettings } from "../src/lib/defaults";

async function main() {
  const filePath =
    "/Users/nakasys/Downloads/R8_マンション町会費にかかる請求書_20260812.xlsx のコピー.xlsx";
  const parsed = await parseBillingWorkbook(readFileSync(filePath), "source.xlsx");
  const target =
    parsed.recipients.find((recipient) => recipient.sourceSheet.startsWith("2.3")) ??
    parsed.recipients[0];
  const model = buildPreviewModel(target, parsed.settings, "2026-08-01");
  const invoice = await renderToBuffer(
    React.createElement(InvoiceDocument, { models: [model] }) as Parameters<typeof renderToBuffer>[0],
  );
  writeFileSync("/tmp/amishiro-invoice.pdf", invoice);
  const labels = await renderToBuffer(
    React.createElement(LabelDocument, {
      cards: parsed.recipients.slice(0, 10).map(buildLabelCard),
      settings: defaultLabelSettings(),
      startIndex: 0,
    }) as Parameters<typeof renderToBuffer>[0],
  );
  writeFileSync("/tmp/amishiro-labels.pdf", labels);
  const text = invoice.toString("latin1");
  console.log("invoice bytes", invoice.length, "labels", labels.length);
  console.log("font embedded", text.includes("IPAexGothic") || text.includes("IPA"));
  console.log("recipient", target.name, "blocked", model.blocked, model.reasons.join(" / "));
}

main();
