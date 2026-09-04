"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { PageHeader } from "@/components/page-header";
import { useAppStore } from "@/lib/app-store";
import type { MealType, ServiceMode } from "@/lib/types";

const mealTypes: MealType[] = ["正餐", "小吃", "甜品", "饮品", "夜宵"];
const serviceModes: ServiceMode[] = ["堂食", "带走", "外卖"];

export default function RecordPage() {
  const router = useRouter();
  const { addFood, foods, places } = useAppStore();
  const [name, setName] = useState(""); const [placeName, setPlaceName] = useState(""); const [description, setDescription] = useState(""); const [price, setPrice] = useState("");
  const [mealType, setMealType] = useState<MealType>("正餐"); const [modes, setModes] = useState<ServiceMode[]>(["堂食"]); const [tags, setTags] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState<string>();
  const possible = name.trim() ? foods.filter((food) => food.name.includes(name.trim())).slice(0, 3) : [];
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(undefined);
    const tagList = tags.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean);
    if (!tagList.length) { setError("至少填写一个标签，例如：米饭、实惠"); return; }
    setSaving(true);
    try { const id = await addFood({ name, placeName, description, priceCents: price ? Math.round(Number(price) * 100) : undefined, mealType, serviceModes: modes, tags: tagList }); router.push(`/food/${id}`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "保存失败，请重试"); setSaving(false); }
  }
  return <AppFrame><main className="page"><PageHeader eyebrow="Record" title="把这口好吃的留下" description="只填最必要的信息。已经存在的食物会直接合并，不让地图越来越乱。" />
    <form className="soft-card grid gap-5 p-5" onSubmit={submit}><label className="text-sm font-extrabold">食物名称<input required maxLength={60} className="field mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：铁板鸡排饭" /></label>{possible.length > 0 && <div className="rounded-2xl bg-[#fff7dc] p-3 text-sm"><strong>可能已经有：</strong>{possible.map((food) => <button type="button" className="ml-2 underline" onClick={() => router.push(`/food/${food.id}`)} key={food.id}>{food.name}</button>)}</div>}<label className="text-sm font-extrabold">地点<input required list="place-list" maxLength={80} className="field mt-2" value={placeName} onChange={(event) => setPlaceName(event.target.value)} placeholder="店名或食堂窗口" /><datalist id="place-list">{places.map((place) => <option value={place.name} key={place.id} />)}</datalist></label><label className="text-sm font-extrabold">一句介绍<textarea className="field mt-2 min-h-24 resize-y" maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="什么情况下最适合吃它？" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-extrabold">大约价格<input className="field mt-2" type="number" min="1" max="1000" step="0.1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="元" /></label><label className="text-sm font-extrabold">类型<select className="field mt-2" value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}>{mealTypes.map((type) => <option key={type}>{type}</option>)}</select></label></div><fieldset><legend className="text-sm font-extrabold">怎么吃</legend><div className="mt-2 flex flex-wrap gap-2">{serviceModes.map((mode) => <button type="button" className="pill" data-active={modes.includes(mode)} onClick={() => setModes(modes.includes(mode) ? modes.filter((item) => item !== mode) : [...modes, mode])} key={mode}>{mode}</button>)}</div></fieldset><label className="text-sm font-extrabold">标签<input required className="field mt-2" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="用逗号分隔：米饭，鸡肉，实惠" /></label>{error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}<button disabled={saving || !modes.length} className="primary-button">{saving ? "正在保存…" : "保存这道食物"}</button></form>
  </main></AppFrame>;
}
