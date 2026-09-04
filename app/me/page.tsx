"use client";

import Link from "next/link";
import { Heart, LogOut, MousePointerClick, NotebookPen } from "lucide-react";
import { AppFrame } from "@/components/app-frame";
import { PageHeader } from "@/components/page-header";
import { LoadingScreen } from "@/components/loading-screen";
import { useAppStore } from "@/lib/app-store";
import { formatPrice } from "@/lib/utils";

export default function MePage() {
  const { loading, currentUser, foods, favorites, experiences, decisions, signOut, dataMode } = useAppStore();
  if (loading) return <LoadingScreen />;
  const favoriteFoods = foods.filter((food) => favorites.includes(food.id));
  const myExperiences = experiences.filter((item) => item.userId === currentUser.id);
  const completed = decisions.filter((item) => item.selectedFoodId).length;
  const stats = [{ Icon: MousePointerClick, value: completed, label: "完成决定" }, { Icon: Heart, value: favorites.length, label: "收藏" }, { Icon: NotebookPen, value: myExperiences.length, label: "吃后反馈" }];
  return <AppFrame><main className="page"><PageHeader eyebrow="My table" title={`${currentUser.nickname}的饭桌`} description={dataMode === "demo" ? "当前数据保存在这个浏览器中。配置 Supabase 后即可与朋友共享。" : "你吃过的每一口，都会让下次推荐更准。"} />
    <section className="mb-7 grid grid-cols-3 gap-2">{stats.map(({ Icon, value, label }) => <div className="soft-card p-3 text-center" key={label}><Icon className="mx-auto" size={19} color="#365c49" /><strong className="serif mt-2 block text-2xl">{value}</strong><span className="text-[11px] font-bold text-[var(--muted)]">{label}</span></div>)}</section>
    <section><h2 className="serif mb-3 text-xl font-bold">我的收藏</h2>{favoriteFoods.length ? <div className="grid gap-3">{favoriteFoods.map((food) => <Link className="soft-card flex items-center justify-between gap-3 p-4" href={`/food/${food.id}`} key={food.id}><div><strong>{food.name}</strong><p className="mt-1 text-xs text-[var(--muted)]">{food.tags.slice(0, 3).join(" · ")}</p></div><span className="font-extrabold text-[var(--red)]">{formatPrice(food.priceCents)}</span></Link>)}</div> : <div className="soft-card p-6 text-center text-sm text-[var(--muted)]">还没有收藏，遇到想吃的先留个记号。</div>}</section>
    <button className="secondary-button mt-8 flex w-full items-center justify-center gap-2 text-red-700" onClick={signOut}><LogOut size={18} />退出登录</button>
  </main></AppFrame>;
}
