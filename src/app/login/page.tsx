"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-sm tracking-[0.16em] text-[var(--seal)]">麻布十番網代会</p>
      <h1 className="mt-2 text-2xl font-semibold">町会費請求管理</h1>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setMessage("");
          const form = new FormData(event.currentTarget);
          const loginId = String(form.get("email") ?? "").trim();
          const email = loginId.includes("@") ? loginId : `${loginId}@amishiro.org`;
          const supabase = createBrowserSupabase();
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password: String(form.get("password") ?? ""),
          });
          setPending(false);
          if (error) {
            setMessage("ログインIDまたはパスワードが違います");
            return;
          }
          router.push("/dashboard");
          router.refresh();
        }}
      >
        <input name="email" type="text" required autoComplete="username" placeholder="ログインID" className="w-full rounded-md border border-[var(--line)] px-3 py-2" />
        <input name="password" type="password" required placeholder="パスワード" className="w-full rounded-md border border-[var(--line)] px-3 py-2" />
        <button disabled={pending} className="w-full rounded-md bg-[var(--seal)] px-4 py-2 text-white">
          {pending ? "確認中" : "ログイン"}
        </button>
        {message ? <p className="text-sm text-[var(--seal)]">{message}</p> : null}
      </form>
    </main>
  );
}
