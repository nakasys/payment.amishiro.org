import { timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLES = [
  "app_settings",
  "label_settings",
  "recipients",
  "invoices",
  "payments",
  "import_logs",
  "profiles",
] as const;

const LABELS: Record<(typeof TABLES)[number], string> = {
  app_settings: "設定",
  label_settings: "ラベル設定",
  recipients: "請求先",
  invoices: "請求書",
  payments: "入金",
  import_logs: "取り込み記録",
  profiles: "利用者",
};

function tokyoDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const token = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(token, expected);
}

async function readTable(supabase: SupabaseClient, table: (typeof TABLES)[number]) {
  const pageSize = 1000;
  const rows: unknown[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${LABELS[table]}を読めませんでした: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) console.error("CRON_SECRET が未設定です");
  if (!authorized(request)) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const user = process.env.GMAIL_USER;
  const password = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  const to = process.env.BACKUP_TO || user;
  const missing = [
    !url ? "NEXT_PUBLIC_SUPABASE_URL" : "",
    !serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : "",
    !user ? "GMAIL_USER" : "",
    !password ? "GMAIL_APP_PASSWORD" : "",
    !to ? "BACKUP_TO" : "",
  ].filter(Boolean);
  if (missing.length || !url || !serviceKey || !user || !password || !to) {
    return NextResponse.json({ error: `未設定: ${missing.join(", ")}` }, { status: 500 });
  }

  try {
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const tables = Object.fromEntries(
      await Promise.all(TABLES.map(async (table) => [table, await readTable(supabase, table)] as const)),
    );
    const counts = Object.fromEntries(
      TABLES.map((table) => [table, (tables[table] as unknown[]).length]),
    );
    const date = tokyoDate();
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), tables }, null, 2);
    const lines = TABLES.map((table) => `${LABELS[table]}: ${counts[table]}`);

    await nodemailer
      .createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user, pass: password },
      })
      .sendMail({
        from: user,
        to,
        subject: `町会費バックアップ ${date}`,
        text: ["麻布十番網代会のデータを添付しています。", "", ...lines].join("\n"),
        attachments: [
          {
            filename: `amishiro-backup-${date}.json`,
            content: payload,
            contentType: "application/json",
          },
        ],
      });

    return NextResponse.json({ ok: true, date, counts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "バックアップに失敗しました";
    const secret = password;
    console.error(message.replaceAll(secret, "[redacted]"));
    return NextResponse.json(
      { error: message.includes(secret) ? "バックアップに失敗しました" : message },
      { status: 500 },
    );
  }
}
