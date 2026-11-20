import { PageTitle, Panel } from "@/components/shell";
import { ImportPanel } from "@/components/import-panel";
import { formatDate } from "@/lib/format";
import { getRepository } from "@/lib/store";

export default async function ImportPage() {
  const state = await (await getRepository()).getState();
  return (
    <div className="space-y-6">
      <PageTitle
        title="Excel取込"
        description="元のExcelは読み取るだけで、上書きしません。金額や住所を推定して埋めないでください。不明な項目は確認フラグが付きます。"
      />
      <ImportPanel />
      <Panel>
        <h2 className="mb-2 font-semibold">取込履歴</h2>
        {state.importLogs.length === 0 ? <p className="text-sm text-[var(--muted)]">まだありません。</p> : null}
        <ul className="space-y-1 text-sm">
          {state.importLogs.map((log) => (
            <li key={log.id}>
              {formatDate(log.importedAt.slice(0, 10))} {log.fileName}　追加 {log.added} / 更新 {log.updated} / スキップ {log.skipped}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
