"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, MapPin, Store, Utensils, WalletCards } from "lucide-react";
import { AppFrame } from "@/components/app-frame";
import { LoadingScreen } from "@/components/loading-screen";
import { PageHeader } from "@/components/page-header";
import { CAMPUS_CENTER } from "@/lib/demo-data";
import { useAppStore } from "@/lib/app-store";
import { distanceMeters } from "@/lib/recommendation";
import { formatDistance, formatPrice } from "@/lib/utils";

export default function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { loading, places, foods } = useAppStore();
  if (loading) return <LoadingScreen />;

  const place = places.find((item) => item.id === id);
  if (!place) {
    return <AppFrame><main className="page"><PageHeader back="/discover" title="没有找到这家店" description="它可能已经停业或被移除。" /></main></AppFrame>;
  }

  const placeFoods = foods.filter((food) => food.placeId === place.id);
  const distance = distanceMeters(CAMPUS_CENTER.latitude, CAMPUS_CENTER.longitude, place.latitude, place.longitude);

  return <AppFrame><main className="page">
    <PageHeader back="/discover" eyebrow={place.category} title={place.name} description={place.notes || "看看这里有哪些值得点的菜。"} />

    <section className="soft-card p-4">
      <div className="grid gap-3">
        <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ec] text-[var(--green)]"><MapPin size={19} /></span><div><p className="text-xs font-bold text-[var(--muted)]">地址</p><p className="mt-1 text-sm font-bold leading-5">{place.address}</p></div></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f7f3e8] text-[var(--red)]"><WalletCards size={19} /></span><div><p className="text-xs font-bold text-[var(--muted)]">消费参考</p><p className="mt-1 text-sm font-extrabold">{place.averagePriceCents != null ? `人均 ${formatPrice(place.averagePriceCents)}` : "价格未知"}</p></div></div>
          <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f7f3e8] text-[var(--green)]"><Store size={19} /></span><div><p className="text-xs font-bold text-[var(--muted)]">距离校园中心</p><p className="mt-1 text-sm font-extrabold">{formatDistance(distance)}</p></div></div>
        </div>
      </div>
      {place.coordinateStatus === "estimated" ? <p className="mt-4 rounded-xl bg-[#fff9e8] px-3 py-2 text-xs font-bold leading-5 text-[#9a6c25]">当前位置由地址估算，待正式域名地图可用后使用高德校准。</p> : null}
    </section>

    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Utensils size={19} color="#365c49" /><h2 className="serif text-xl font-bold">推荐菜</h2></div><span className="text-xs font-bold text-[var(--muted)]">共 {placeFoods.length} 道</span></div>
      {placeFoods.length ? <div className="grid gap-3">{placeFoods.map((food) => <Link className="soft-card flex items-center gap-3 p-4 transition hover:border-[#bdb5a4]" href={`/food/${food.id}`} key={food.id}>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef2ec] text-lg font-black text-[var(--green)]">{food.name.slice(0, 1)}</div>
        <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h3 className="serif font-bold">{food.name}</h3><span className="shrink-0 text-sm font-extrabold text-[var(--red)]">{food.priceCents != null ? formatPrice(food.priceCents) : place.averagePriceCents != null ? `人均 ${formatPrice(place.averagePriceCents)}` : "价格未知"}</span></div><p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--muted)]">{food.description}</p><div className="mt-2 flex flex-wrap gap-1.5">{food.tags.slice(0, 4).map((tag) => <span className="rounded-full bg-[#f4f1e8] px-2 py-1 text-[11px] font-bold text-[var(--muted)]" key={tag}>{tag}</span>)}</div></div>
        <ChevronRight className="shrink-0 text-[var(--muted)]" size={18} />
      </Link>)}</div> : <div className="soft-card p-6 text-center text-sm text-[var(--muted)]">这家店还没有录入推荐菜。</div>}
    </section>
  </main></AppFrame>;
}
