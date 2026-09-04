"use client";

import { AppFrame } from "@/components/app-frame";
import { DecisionBuilder } from "@/components/decision-builder";
import { FeedbackCard } from "@/components/feedback-card";
import { LoadingScreen } from "@/components/loading-screen";
import { useAppStore } from "@/lib/app-store";

export default function HomePage() {
  const { loading, error, currentUser, dataMode } = useAppStore();
  if (loading) return <LoadingScreen />;
  return <AppFrame><main className="page">
    <header className="mb-6 flex items-start justify-between gap-4"><div><p className="section-label">鼠鼠吃饭</p><h1 className="serif mt-1 text-[34px] font-bold leading-tight tracking-[-.04em]">{currentUser.nickname}，<br />今天吃点什么？</h1><p className="mt-2 text-sm text-[var(--muted)]">少刷一会儿，直接挑一个能出发的答案。</p></div><span className="rounded-full border border-[var(--line)] bg-white/70 px-3 py-1.5 text-xs font-bold text-[var(--muted)]">{dataMode === "demo" ? "演示模式" : "朋友小圈"}</span></header>
    {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">数据加载失败：{error}</div>}
    <FeedbackCard />
    <DecisionBuilder />
  </main></AppFrame>;
}
