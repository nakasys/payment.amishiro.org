import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate, formatYen, mmToPt } from "@/lib/format";
import { bankLines } from "@/lib/invoice-rules";
import type { InvoiceViewModel, LabelCard, LabelSettings } from "@/lib/types";
import { registerJapaneseFont } from "@/pdf/font";

registerJapaneseFont();

const styles = StyleSheet.create({
  page: {
    fontFamily: "IPAexGothic",
    fontSize: 10,
    color: "#1c1915",
    paddingTop: 40,
    paddingBottom: 36,
    paddingHorizontal: 42,
  },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 22, letterSpacing: 8, textAlign: "center", flex: 1 },
  meta: { width: 150, fontSize: 9, lineHeight: 1.6 },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  addressee: { marginTop: 28, fontSize: 16 },
  building: { marginTop: 6, fontSize: 10 },
  table: { marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#1c1915" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.4, borderColor: "#1c1915" },
  th: { width: 78, backgroundColor: "#f7f3ec", padding: 6 },
  td: { flex: 1, padding: 6 },
  amountBox: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: "#1c1915",
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  amount: { fontSize: 20 },
  lineHead: { flexDirection: "row", backgroundColor: "#f7f3ec", borderBottomWidth: 1, borderColor: "#1c1915" },
  line: { flexDirection: "row", borderBottomWidth: 0.4, borderColor: "#d9d0c4", minHeight: 22 },
  lineLabel: { flex: 1, padding: 6 },
  lineAmount: { width: 90, padding: 6, textAlign: "right" },
  bank: { marginTop: 16, fontSize: 10, lineHeight: 1.6 },
  footer: { marginTop: 28, flexDirection: "row", justifyContent: "space-between" },
  contact: { width: "52%", fontSize: 10, lineHeight: 1.6 },
  issuer: { width: "42%", textAlign: "right", fontSize: 10, lineHeight: 1.6 },
  issuerName: { fontSize: 12 },
  watermark: {
    position: "absolute",
    top: 340,
    left: 90,
    fontSize: 42,
    color: "#e3c7c7",
    transform: "rotate(-18deg)",
  },
  reason: { marginTop: 16, fontSize: 8, color: "#8d2f2f" },
});

export function InvoiceDocument({ models }: { models: InvoiceViewModel[] }) {
  return (
    <Document title="町会費請求書" language="ja">
      {models.map((model, index) => {
        const snapshot = model.snapshot;
        const addressee = [snapshot.addressee || snapshot.recipientName, snapshot.honorific]
          .filter(Boolean)
          .join("　");
        return (
          <Page key={`${snapshot.invoiceNumber}-${index}`} size="A4" style={styles.page}>
            {model.preview ? (
              <Text style={styles.watermark}>{model.blocked ? "確認用" : "プレビュー"}</Text>
            ) : null}
            <View style={styles.titleRow}>
              <View style={{ width: 150 }} />
              <Text style={styles.title}>請求書</Text>
              <View style={styles.meta}>
                <View style={styles.metaRow}>
                  <Text>請求番号</Text>
                  <Text>{snapshot.invoiceNumber}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text>発行日</Text>
                  <Text>{formatDate(snapshot.issuedOn)}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.addressee}>{addressee}</Text>
            {snapshot.buildingName ? <Text style={styles.building}>対象マンション　{snapshot.buildingName}</Text> : null}
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.th}>件名</Text>
                <Text style={styles.td}>{snapshot.subject}</Text>
              </View>
              <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.th}>対象期間</Text>
                <Text style={styles.td}>
                  {formatDate(snapshot.periodStart)}〜{formatDate(snapshot.periodEnd)}
                </Text>
              </View>
            </View>
            <View style={styles.amountBox}>
              <Text>ご請求金額</Text>
              <Text style={styles.amount}>{formatYen(snapshot.amountYen)}</Text>
            </View>
            <View style={{ marginTop: 16 }}>
              <View style={styles.lineHead}>
                <Text style={styles.lineLabel}>摘要</Text>
                <Text style={styles.lineAmount}>金額</Text>
              </View>
              {(snapshot.lines.length ? snapshot.lines : [{ label: "明細未確定", amountYen: 0 }]).map((line) => (
                <View key={line.label} style={styles.line}>
                  <Text style={styles.lineLabel}>{line.label}</Text>
                  <Text style={styles.lineAmount}>
                    {line.label === "明細未確定" ? "金額未確定" : formatYen(line.amountYen)}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.bank}>
              <Text>お振込先</Text>
              {bankLines(snapshot.bank).map((line) => (
                <Text key={line}>{line}</Text>
              ))}
              {snapshot.dueDate ? <Text>支払期限　{formatDate(snapshot.dueDate)}</Text> : null}
            </View>
            <View style={styles.footer}>
              <View style={styles.contact}>
                <Text>【本請求に関するお問い合わせ先】</Text>
                <Text>
                  {snapshot.issuer.organizationName}　{snapshot.contact.name}
                </Text>
                <Text>TEL：{snapshot.contact.phone || "未設定"}</Text>
              </View>
              <View style={styles.issuer}>
                <Text style={styles.issuerName}>{snapshot.issuer.organizationName}</Text>
                <Text>会長　{snapshot.issuer.chairmanName}</Text>
                <Text>会計部長　{snapshot.issuer.treasurerName}</Text>
              </View>
            </View>
            {model.blocked ? <Text style={styles.reason}>正式発行できません。{model.reasons.join(" / ")}</Text> : null}
          </Page>
        );
      })}
    </Document>
  );
}

export function LabelDocument({
  cards,
  settings,
  startIndex,
}: {
  cards: LabelCard[];
  settings: LabelSettings;
  startIndex: number;
}) {
  const perPage = settings.columns * settings.rows;
  const slots = [...Array(Math.max(0, startIndex)).fill(null), ...cards];
  const pages: (LabelCard | null)[][] = [];
  for (let index = 0; index < slots.length; index += perPage) {
    pages.push(slots.slice(index, index + perPage));
  }
  if (pages.length === 0) pages.push([]);
  return (
    <Document title="宛名ラベル" language="ja">
      {pages.map((page, pageIndex) => (
        <Page key={pageIndex} size="A4" style={{ fontFamily: "IPAexGothic", fontSize: settings.fontSizePt }}>
          {page.map((card, index) => {
            if (!card) return null;
            const column = index % settings.columns;
            const row = Math.floor(index / settings.columns);
            return (
              <View
                key={`${card.recipientId}-${index}`}
                style={{
                  position: "absolute",
                  left: mmToPt(settings.marginLeftMm + column * settings.pitchXMm),
                  top: mmToPt(settings.marginTopMm + row * settings.pitchYMm),
                  width: mmToPt(settings.labelWidthMm),
                  height: mmToPt(settings.labelHeightMm),
                  padding: 8,
                }}
              >
                <Text>{card.postalCode ? `〒${card.postalCode}` : "〒（未登録）"}</Text>
                {card.addressLines.length ? (
                  card.addressLines.map((line) => <Text key={line}>{line}</Text>)
                ) : (
                  <Text>（住所未登録）</Text>
                )}
                {card.department ? <Text>{card.department}</Text> : null}
                <Text style={{ marginTop: 4 }}>
                  {[card.addressee, card.honorific].filter(Boolean).join("　")}
                </Text>
              </View>
            );
          })}
        </Page>
      ))}
    </Document>
  );
}
