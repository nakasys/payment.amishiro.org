import { redirect } from "next/navigation";
import { AccessError, assertCanAccess } from "@/lib/access";
import { Shell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  try {
    const access = await assertCanAccess();
    return <Shell demo={access.demo}>{children}</Shell>;
  } catch (error) {
    if (error instanceof AccessError && error.code === "UNAUTHORIZED") redirect("/login");
    if (error instanceof AccessError && error.code === "UNCONFIGURED") redirect("/setup");
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-xl font-semibold">利用許可が必要です</h1>
        <p className="mt-3 text-sm leading-6">
          ログインはできていますが、町会関係者として許可されていません。Supabase の profiles.role を member または admin に更新してください。
        </p>
      </main>
    );
  }
}
