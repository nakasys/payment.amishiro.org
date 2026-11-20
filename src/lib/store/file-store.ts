import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { demoState, defaultLabelSettings } from "@/lib/defaults";
import { parseBillingWorkbook } from "@/lib/excel/parse-workbook";
import type {
  AppState,
  ImportLog,
  Invoice,
  LabelSettings,
  Payment,
  Recipient,
  Settings,
} from "@/lib/types";

const storePath = path.join(process.cwd(), "data", "store.json");
let queue: Promise<unknown> = Promise.resolve();

function locked<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function excelCandidates(): Promise<string[]> {
  const found: string[] = [];
  if (process.env.EXCEL_IMPORT_PATH) found.push(process.env.EXCEL_IMPORT_PATH);
  const inbox = path.join(process.cwd(), "data", "inbox");
  try {
    const names = await fs.readdir(inbox);
    for (const name of names) {
      if (name.endsWith(".xlsx") && !name.startsWith("~$")) found.push(path.join(inbox, name));
    }
  } catch {
    // inbox が無い場合は次の候補へ進む。
  }
  if (process.env.NODE_ENV !== "production") {
    found.push(
      "/Users/nakasys/Downloads/R8_マンション町会費にかかる請求書_20260812.xlsx のコピー.xlsx",
    );
  }
  const existing: string[] = [];
  for (const candidate of found) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) existing.push(candidate);
    } catch {
      // 候補が無い。
    }
  }
  return existing;
}

async function createInitialState(): Promise<AppState> {
  const candidates = await excelCandidates();
  if (candidates.length === 0) return demoState();
  const file = candidates[0];
  const parsed = await parseBillingWorkbook(await fs.readFile(file), path.basename(file));
  const log: ImportLog = {
    id: randomUUID(),
    fileName: path.basename(file),
    importedAt: new Date().toISOString(),
    added: parsed.recipients.length,
    updated: 0,
    skipped: 0,
  };
  return {
    settings: parsed.settings,
    labelSettings: defaultLabelSettings(),
    recipients: parsed.recipients,
    invoices: [],
    payments: [],
    importLogs: [log],
  };
}

async function loadUnlocked(): Promise<AppState> {
  try {
    return JSON.parse(await fs.readFile(storePath, "utf8")) as AppState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const state = await createInitialState();
    await saveUnlocked(state);
    return state;
  }
}

async function saveUnlocked(state: AppState) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  const temporary = `${storePath}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(state, null, 2));
  await fs.rename(temporary, storePath);
}

async function update(mutator: (state: AppState) => void): Promise<AppState> {
  return locked(async () => {
    const state = await loadUnlocked();
    mutator(state);
    await saveUnlocked(state);
    return state;
  });
}

export const fileRepository = {
  getState: () => locked(loadUnlocked),
  saveSettings(settings: Settings) {
    return update((state) => {
      state.settings = { ...settings, updatedAt: new Date().toISOString() };
    });
  },
  saveLabelSettings(labelSettings: LabelSettings) {
    return update((state) => {
      state.labelSettings = labelSettings;
    });
  },
  saveRecipient(recipient: Recipient) {
    return update((state) => {
      const index = state.recipients.findIndex((item) => item.id === recipient.id);
      if (index >= 0) state.recipients[index] = recipient;
      else state.recipients.push(recipient);
    });
  },
  deleteRecipient(id: string) {
    return update((state) => {
      state.recipients = state.recipients.filter((recipient) => recipient.id !== id);
    });
  },
  saveIssued(invoices: Invoice[], nextInvoiceSeq: number) {
    return update((state) => {
      state.invoices.push(...invoices);
      state.settings.nextInvoiceSeq = nextInvoiceSeq;
      state.settings.updatedAt = new Date().toISOString();
    });
  },
  savePayment(payment: Payment) {
    return update((state) => {
      state.payments.push(payment);
    });
  },
  deletePayment(id: string) {
    return update((state) => {
      state.payments = state.payments.filter((payment) => payment.id !== id);
    });
  },
  importRecipients(rows: Recipient[], mode: "add" | "overwrite", fileName: string) {
    return update((state) => {
      let added = 0;
      let updated = 0;
      let skipped = 0;
      if (mode === "add") {
        const sheets = new Set(
          state.recipients.map((recipient) => recipient.sourceSheet).filter(Boolean),
        );
        for (const row of rows) {
          if (row.sourceSheet && sheets.has(row.sourceSheet)) {
            skipped += 1;
            continue;
          }
          state.recipients.push(row);
          if (row.sourceSheet) sheets.add(row.sourceSheet);
          added += 1;
        }
      } else {
        for (const row of rows) {
          const index = state.recipients.findIndex(
            (recipient) => recipient.sourceSheet && recipient.sourceSheet === row.sourceSheet,
          );
          if (index >= 0) {
            const previous = state.recipients[index];
            state.recipients[index] = {
              ...row,
              id: previous.id,
              createdAt: previous.createdAt,
            };
            updated += 1;
          } else {
            state.recipients.push(row);
            added += 1;
          }
        }
      }
      state.importLogs.unshift({
        id: randomUUID(),
        fileName,
        importedAt: new Date().toISOString(),
        added,
        updated,
        skipped,
      });
    });
  },
};

export async function resetDemoStore() {
  await fs.rm(storePath, { force: true });
  return fileRepository.getState();
}
