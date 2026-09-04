"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, UsersRound } from "lucide-react";
import type { RecommendationCard } from "@/lib/types";
import { formatDistance, formatPrice } from "@/lib/utils";

export function FoodCard({ food, favorite, onFavorite, onSelect, compact = false }: { food: RecommendationCard; favorite?: boolean; onFavorite?: () => void; onSelect?: () => void; compact?: boolean }) {
  return <article className="soft-card overflow-hidden">
    <div className={`relative ${compact ? "h-36" : "h-48"} bg-[#e7e0d3]`}>
      {food.imageUrl ? <Image src={food.imageUrl} alt={food.foodName} fill className="object-cover" sizes="(max-width: 760px) 100vw, 700px" /> : <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">暂无图片</div>}
      {onFavorite && <button aria-label={favorite ? "取消收藏" : "收藏"} onClick={onFavorite} className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-white/90 shadow-sm"><Heart size={20} fill={favorite ? "#c94a32" : "none"} color={favorite ? "#c94a32" : "#20251f"} /></button>}
      <span className="absolute bottom-3 left-3 rounded-full bg-[#20251f]/82 px-3 py-1.5 text-xs font-bold text-white">{formatPrice(food.priceCents)}</span>
    </div>
    <div className="p-4">
      <div className="flex items-start justify-between gap-4"><div><h2 className="serif text-[23px] font-bold leading-tight">{food.foodName}</h2><p className="mt-1 flex items-center gap-1 text-sm text-[var(--muted)]"><MapPin size={14} />{food.placeName} · {formatDistance(food.distanceMeters)}</p></div><span className="rounded-full bg-[#f1ead9] px-2.5 py-1 text-xs font-bold text-[#76613c]">{food.score.toFixed(0)} 分</span></div>
      <div className="mt-3 flex flex-wrap gap-1.5">{food.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-[#eef2ec] px-2.5 py-1 text-xs font-bold text-[var(--green)]">{tag}</span>)}</div>
      <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-[var(--green)]"><UsersRound size={16} />{food.reasons[0]}</p>
      <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{food.reasons.slice(1).join("，")}</p>
      <div className="mt-4 grid grid-cols-2 gap-2"><Link className="secondary-button flex items-center justify-center" href={`/food/${food.foodId}`}>看看详情</Link>{onSelect && <button className="primary-button" onClick={onSelect}>就吃这个</button>}</div>
    </div>
  </article>;
}
