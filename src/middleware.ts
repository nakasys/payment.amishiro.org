import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode, isSupabaseConfigured } from "@/lib/mode";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (isDemoMode()) return NextResponse.next();
  if (!isSupabaseConfigured()) {
    if (request.nextUrl.pathname.startsWith("/setup")) return NextResponse.next();
    if (request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Supabase が未設定です" }, { status: 503 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf)$).*)"],
};
