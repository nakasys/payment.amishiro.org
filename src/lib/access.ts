import { isDemoMode, isSupabaseConfigured } from "@/lib/mode";
import { createClient } from "@/lib/supabase/server";

export class AccessError extends Error {
  constructor(public code: "UNAUTHORIZED" | "FORBIDDEN" | "UNCONFIGURED") {
    super(code);
  }
}

export async function assertCanAccess(): Promise<{ demo: boolean }> {
  if (isDemoMode()) return { demo: true };
  if (!isSupabaseConfigured()) throw new AccessError("UNCONFIGURED");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new AccessError("UNAUTHORIZED");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "member" && profile.role !== "admin")) {
    throw new AccessError("FORBIDDEN");
  }
  return { demo: false };
}
