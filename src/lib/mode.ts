export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * デモモードは開発時かつ Supabase 未設定のときだけ有効。
 * DEMO_MODE=true でも本番では有効にしない。
 */
export function isDemoMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.DEMO_MODE === "false") return false;
  return !isSupabaseConfigured();
}
