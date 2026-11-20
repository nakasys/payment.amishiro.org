export default function SetupPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Supabase の設定が必要です</h1>
      <p className="mt-4 text-sm leading-7">
        本番環境ではデモデータを使いません。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定し、supabase/migrations を適用してください。service_role キーはブラウザに公開しないでください。
      </p>
    </main>
  );
}
