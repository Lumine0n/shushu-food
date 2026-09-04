"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { Heart, MapPin, Share2, UsersRound } from "lucide-react";
import { AppFrame } from "@/components/app-frame";
import { PageHeader } from "@/components/page-header";
import { LoadingScreen } from "@/components/loading-screen";
import { useAppStore } from "@/lib/app-store";
import { formatPrice } from "@/lib/utils";

export default function FoodDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { loading, foods, places, experiences, favorites, toggleFavorite } = useAppStore();
  if (loading) return <LoadingScreen />;
  const food = foods.find((item) => item.id === id);
  if (!food) return <AppFrame><main className="page"><PageHeader back="/discover" title="没有找到这道食物" description="它可能已经停售或被移除。" /></main></AppFrame>;
  const place = places.find((item) => item.id === food.placeId)!;
  const reviews = experiences.filter((item) => item.foodId === food.id);
  const favorite = favorites.includes(food.id);
  return <AppFrame><main className="page"><PageHeader back="/discover" eyebrow={food.mealType} title={food.name} description={food.description} />
    <div className="relative mb-5 h-64 overflow-hidden rounded-[24px] bg-[#e7e0d3]">{food.imageUrl && <Image src={food.imageUrl} alt={food.name} fill className="object-cover" sizes="760px" />}</div>
    <section className="soft-card p-4"><div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-1.5 font-extrabold"><MapPin size={17} color="#c94a32" />{place.name}</p><p className="mt-1 text-sm text-[var(--muted)]">{place.address}</p></div><strong className="text-lg text-[var(--red)]">{formatPrice(food.priceCents)}</strong></div><div className="mt-4 flex flex-wrap gap-2">{food.tags.map((tag) => <span className="rounded-full bg-[#eef2ec] px-3 py-1.5 text-xs font-bold text-[var(--green)]" key={tag}>{tag}</span>)}</div><div className="mt-5 grid grid-cols-2 gap-2"><button className="secondary-button flex items-center justify-center gap-2" onClick={() => toggleFavorite(food.id)}><Heart size={18} fill={favorite ? "#c94a32" : "none"} color={favorite ? "#c94a32" : "currentColor"} />{favorite ? "已收藏" : "收藏"}</button><button className="primary-button flex items-center justify-center gap-2" onClick={async () => { let token = `demo-${food.id}`; if (process.env.NEXT_PUBLIC_SUPABASE_URL) { const response = await fetch("/api/share", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ foodId: food.id }) }); if (!response.ok) { alert("分享链接创建失败，请稍后重试"); return; } token = (await response.json()).token; } const url = `${window.location.origin}/share/${token}`; await navigator.clipboard.writeText(url); alert("分享链接已复制"); }}><Share2 size={18} />分享</button></div></section>
    <section className="mt-7"><div className="mb-3 flex items-center gap-2"><UsersRound size={19} color="#365c49" /><h2 className="serif text-xl font-bold">朋友怎么说</h2></div>{reviews.length ? <div className="grid gap-3">{reviews.map((review) => <article key={`${review.userId}-${review.foodId}`} className="soft-card p-4"><div className="flex items-center justify-between"><strong>{review.authorName}</strong><span className="rounded-full bg-[#f1ead9] px-2.5 py-1 text-xs font-bold">{review.attitude === "again" ? "还会再点" : review.attitude === "avoid" ? "不会再吃" : "感觉一般"}</span></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{review.reason || "只留下了一个简单态度。"}</p></article>)}</div> : <div className="soft-card p-6 text-center text-sm text-[var(--muted)]">还没有朋友反馈，等你吃完告诉大家。</div>}</section>
  </main></AppFrame>;
}
