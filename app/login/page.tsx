"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, UtensilsCrossed } from "lucide-react";
import { DEMO_AUTH_STORAGE_KEY, safeNextPath } from "@/lib/access";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(undefined); setLoading(true);
    const next = safeNextPath(typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null);
    if (!configured) {
      window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, "1");
      router.push(next); router.refresh();
      return;
    }
    const { error } = await createClient()!.auth.signInWithPassword({ email, password });
    if (error) { setError("邮箱或密码不正确，请联系管理员确认测试账号。"); setLoading(false); return; }
    router.push(next); router.refresh();
  }

  return <main className="min-h-dvh px-5 py-10"><div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col justify-between">
    <div><div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--red)] text-white"><UtensilsCrossed size={24} /></div><p className="section-label mt-8">朋友小圈</p><h1 className="serif mt-2 text-[42px] font-bold leading-[1.05] tracking-[-.045em]">别纠结了，<br />今天吃个准的。</h1><p className="mt-4 max-w-sm leading-7 text-[var(--muted)]">无需登录就能抽食物。要添加清单、收藏或分享时，再用朋友账号登录。</p><Link href="/" className="secondary-button mt-5 inline-flex items-center">先去抽一个食物</Link></div>
    <form className="soft-card mt-10 p-5" onSubmit={submit}><label className="block text-sm font-extrabold">邮箱<input className="field mt-2" type="email" required={configured} value={email} onChange={(event) => setEmail(event.target.value)} placeholder={configured ? "你的测试账号" : "演示模式无需填写"} /></label><label className="mt-4 block text-sm font-extrabold">密码<input className="field mt-2" type="password" required={configured} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></label>{error && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{error}</p>}<button disabled={loading} className="primary-button mt-5 flex w-full items-center justify-center gap-2">{loading ? "正在登录…" : configured ? "进入朋友饭桌" : "进入演示模式"}<ArrowRight size={18} /></button><p className="mt-4 text-center text-xs leading-5 text-[var(--muted)]">当前为固定成员测试，不开放自行注册。</p></form>
  </div></main>;
}
