"use client";

import { useMemo, useState } from "react";
import { LocateFixed, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { CAMPUS_CENTER } from "@/lib/demo-data";
import type { Decision, DecisionInput, MealType, ServiceMode } from "@/lib/types";
import { FoodCard } from "@/components/food-card";

const mealTypes: MealType[] = ["正餐", "小吃", "甜品", "饮品", "夜宵"];
const serviceModes: ServiceMode[] = ["堂食", "带走", "外卖"];
const popularTags = ["米饭", "面食", "鸡肉", "牛肉", "麻辣", "热汤", "甜品", "实惠"];

function ToggleGroup<T extends string>({ items, value, onChange }: { items: T[]; value: T[]; onChange: (value: T[]) => void }) {
  return <div className="flex flex-wrap gap-2">{items.map((item) => <button type="button" className="pill" data-active={value.includes(item)} key={item} onClick={() => onChange(value.includes(item) ? value.filter((valueItem) => valueItem !== item) : [...value, item])}>{item}</button>)}</div>;
}

export function DecisionBuilder() {
  const { createDecision, selectFood, favorites, toggleFavorite } = useAppStore();
  const [budget, setBudget] = useState(30);
  const [distance, setDistance] = useState(1500);
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>([]);
  const [selectedModes, setSelectedModes] = useState<ServiceMode[]>([]);
  const [wantedTags, setWantedTags] = useState<string[]>([]);
  const [location, setLocation] = useState(CAMPUS_CENTER);
  const [locationLabel, setLocationLabel] = useState("宝山校区中心");
  const [locating, setLocating] = useState(false);
  const [decision, setDecision] = useState<Decision>();
  const [group, setGroup] = useState(0);
  const [working, setWorking] = useState(false);
  const visible = useMemo(() => decision?.candidates.slice(group * 3, group * 3 + 3) ?? [], [decision, group]);

  async function decide() {
    setWorking(true);
    const input: DecisionInput = { latitude: location.latitude, longitude: location.longitude, budgetMaxCents: budget * 100, distanceMeters: distance, mealTypes: selectedMeals, serviceModes: selectedModes, wantedTags, excludedTags: [] };
    const next = await createDecision(input);
    setDecision(next); setGroup(0); setWorking(false);
    setTimeout(() => document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth" }), 30);
  }

  function locate() {
    setLocating(true);
    if (!navigator.geolocation) { setLocationLabel("定位不可用，使用宝山校区中心"); setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => { setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocationLabel("已使用当前位置"); setLocating(false); },
      () => { setLocation(CAMPUS_CENTER); setLocationLabel("未获得定位，使用宝山校区中心"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return <>
    <section className="soft-card p-4 sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-4"><div><p className="section-label">当前条件</p><h2 className="serif mt-1 text-2xl font-bold">给我三个答案</h2></div><SlidersHorizontal size={23} color="#c94a32" /></div>
      <label className="mb-5 block"><span className="mb-2 flex justify-between text-sm font-extrabold"><span>预算上限</span><span className="text-[var(--red)]">¥{budget}</span></span><input className="w-full accent-[var(--red)]" type="range" min="10" max="100" step="5" value={budget} onChange={(event) => setBudget(Number(event.target.value))} /></label>
      <label className="mb-5 block"><span className="mb-2 flex justify-between text-sm font-extrabold"><span>最多走多远</span><span className="text-[var(--red)]">{distance < 1000 ? `${distance}m` : `${distance / 1000}km`}</span></span><input className="w-full accent-[var(--red)]" type="range" min="300" max="3000" step="300" value={distance} onChange={(event) => setDistance(Number(event.target.value))} /></label>
      <div className="mb-5"><p className="mb-2 text-sm font-extrabold">现在想吃</p><ToggleGroup items={mealTypes} value={selectedMeals} onChange={setSelectedMeals} /></div>
      <div className="mb-5"><p className="mb-2 text-sm font-extrabold">怎么吃</p><ToggleGroup items={serviceModes} value={selectedModes} onChange={setSelectedModes} /></div>
      <div className="mb-5"><p className="mb-2 text-sm font-extrabold">有点偏好</p><ToggleGroup items={popularTags} value={wantedTags} onChange={setWantedTags} /></div>
      <button className="mb-4 flex min-h-11 items-center gap-2 text-left text-sm font-bold text-[var(--green)]" onClick={locate}><LocateFixed size={18} />{locating ? "正在定位…" : locationLabel}</button>
      <button className="primary-button w-full" disabled={working} onClick={decide}>{working ? "正在翻朋友们的饭单…" : "看看现在吃什么"}</button>
    </section>

    {decision && <section id="recommendations" className="mt-8 scroll-mt-4">
      <div className="mb-4 flex items-end justify-between"><div><p className="section-label">本次推荐</p><h2 className="serif mt-1 text-2xl font-bold">先看这三个</h2></div>{decision.candidates.length > 3 && <button className="flex min-h-11 items-center gap-1.5 text-sm font-extrabold text-[var(--red)]" onClick={() => setGroup((group + 1) % Math.ceil(decision.candidates.length / 3))}><RefreshCw size={17} />换一组</button>}</div>
      {visible.length ? <div className="grid gap-4">{visible.map((food) => <FoodCard key={food.foodId} food={food} favorite={favorites.includes(food.foodId)} onFavorite={() => toggleFavorite(food.foodId)} onSelect={async () => { await selectFood(decision.id, food.foodId); setDecision((old) => old ? { ...old, selectedFoodId: food.foodId } : old); }} />)}</div> : <div className="soft-card p-8 text-center"><p className="serif text-xl font-bold">这次没有找到合适的</p><p className="mt-2 text-sm text-[var(--muted)]">试试提高预算或扩大距离，我们不会偷偷放宽你的硬条件。</p><button className="secondary-button mt-4" onClick={() => { setBudget(50); setDistance(3000); setSelectedMeals([]); setWantedTags([]); }}>清除部分条件</button></div>}
    </section>}
  </>;
}
