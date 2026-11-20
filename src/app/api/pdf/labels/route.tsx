import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { assertCanAccess } from "@/lib/access";
import { buildLabelCard } from "@/lib/invoice-rules";
import { getRepository } from "@/lib/store";
import { LabelDocument } from "@/pdf/documents";
import type { LabelSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function numberParam(params: URLSearchParams, key: keyof LabelSettings, fallback: number) {
  const value = Number(params.get(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export async function GET(request: NextRequest) {
  try {
    await assertCanAccess();
  } catch {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const ids = params.get("recipients")?.split(",").filter(Boolean) ?? [];
  const repo = await getRepository();
  const state = await repo.getState();
  const settings: LabelSettings = {
    columns: numberParam(params, "columns", state.labelSettings.columns),
    rows: numberParam(params, "rows", state.labelSettings.rows),
    marginTopMm: numberParam(params, "marginTopMm", state.labelSettings.marginTopMm),
    marginLeftMm: numberParam(params, "marginLeftMm", state.labelSettings.marginLeftMm),
    labelWidthMm: numberParam(params, "labelWidthMm", state.labelSettings.labelWidthMm),
    labelHeightMm: numberParam(params, "labelHeightMm", state.labelSettings.labelHeightMm),
    pitchXMm: numberParam(params, "pitchXMm", state.labelSettings.pitchXMm),
    pitchYMm: numberParam(params, "pitchYMm", state.labelSettings.pitchYMm),
    fontSizePt: numberParam(params, "fontSizePt", state.labelSettings.fontSizePt),
  };
  const cards = state.recipients
    .filter((recipient) => (ids.length ? ids.includes(recipient.id) : recipient.status === "active"))
    .map(buildLabelCard);
  const buffer = await renderToBuffer(
    <LabelDocument cards={cards} settings={settings} startIndex={Math.max(0, Number(params.get("start")) || 0)} />,
  );
  const download = params.get("download") === "1";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent("宛名ラベル.pdf")}`,
      "Cache-Control": "no-store",
    },
  });
}
