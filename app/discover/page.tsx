"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Map, Search, UsersRound } from "lucide-react";
import { AppFrame } from "@/components/app-frame";
import { PageHeader } from "@/components/page-header";
import { AMapView } from "@/components/amap-view";
import { LoadingScreen } from "@/components/loading-screen";
import { useAppStore } from "@/lib/app-store";
import { CAMPUS_CENTER } from "@/lib/demo-data";
import { distanceMeters } from "@/lib/recommendation";
import { formatDistance, formatPrice } from "@/lib/utils";
import type { Place } from "@/lib/types";

export default function DiscoverPage() {
  const { loading, foods, places, experiences } = useAppStore();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"list" | "map">("list");
  const [selectedPlace, setSelectedPlace] = useState<Place>();
  const selectPlace = useCallback((place: Place) => setSelectedPlace(place), []);
  const visibleFoods = useMemo(() => foods.filter((food) => {
    const place = places.find((item) => item.id === food.placeId);
    const haystack = `${food.name} ${food.description} ${food.tags.join(" ")} ${place?.name ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [foods, places, query]);
  if (loading) return <LoadingScreen />;

  return <AppFrame><main className="page"><PageHeader eyebrow="Discover" title="朋友吃过，才更有底" description="搜具体食物，也可以沿着地图看看附近有什么。" />
    <div className="relative mb-4"><Search aria-hidden="true" className="search-icon absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={19} /><input className="field search-field" placeholder="搜食物、地点或口味" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    <div className="mb-5 grid grid-cols-2 rounded-2xl border border-[var(--line)] bg-white p-1"><button className="min-h-11 rounded-xl text-sm font-extrabold" style={tab === "list" ? { background: "#365c49", color: "white" } : undefined} onClick={() => setTab("list")}><UsersRound className="mr-1.5 inline" size={17} />附近列表</button><button className="min-h-11 rounded-xl text-sm font-extrabold" style={tab === "map" ? { background: "#365c49", color: "white" } : undefined} onClick={() => setTab("map")}><Map className="mr-1.5 inline" size={17} />地图</button></div>
    {tab === "map" ? <><AMapView places={places} onSelect={selectPlace} />{selectedPlace && <section className="soft-card mt-4 p-4"><p className="section-label">已选择地点</p><h2 className="serif mt-1 text-xl font-bold">{selectedPlace.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">{selectedPlace.address}</p><div className="mt-3 flex flex-wrap gap-2">{foods.filter((food) => food.placeId === selectedPlace.id).map((food) => <Link className="pill" href={`/food/${food.id}`} key={food.id}>{food.name}</Link>)}</div></section>}</> :
      <section className="grid gap-3">{visibleFoods.length ? visibleFoods.map((food) => { const place = places.find((item) => item.id === food.placeId)!; const positive = experiences.filter((item) => item.foodId === food.id && item.attitude === "again").length; return <Link href={`/food/${food.id}`} key={food.id} className="soft-card flex gap-4 p-4 transition hover:border-[#bdb5a4]"><div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#eef2ec] text-xl font-black text-[var(--green)]">{food.name.slice(0, 1)}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h2 className="serif truncate text-lg font-bold">{food.name}</h2><span className="shrink-0 text-sm font-extrabold text-[var(--red)]">{formatPrice(food.priceCents)}</span></div><p className="mt-1 truncate text-sm text-[var(--muted)]">{place.name} · {formatDistance(distanceMeters(CAMPUS_CENTER.latitude, CAMPUS_CENTER.longitude, place.latitude, place.longitude))}</p><p className="mt-2 text-xs font-bold text-[var(--green)]">{positive ? `${positive} 位朋友还会再点` : "等你来尝第一口"}</p></div></Link>; }) : <div className="soft-card p-8 text-center"><p className="serif text-xl font-bold">没搜到这个</p><p className="mt-2 text-sm text-[var(--muted)]">换个关键词，或者去“记录”添加一个新发现。</p></div>}</section>}
  </main></AppFrame>;
}
