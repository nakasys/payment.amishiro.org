import { isDemoMode, isSupabaseConfigured } from "@/lib/mode";
import { fileRepository } from "@/lib/store/file-store";
import { supabaseRepository } from "@/lib/store/supabase-store";

export async function getRepository() {
  if (isDemoMode()) return fileRepository;
  if (!isSupabaseConfigured()) {
    throw new Error("UNCONFIGURED");
  }
  return supabaseRepository;
}
