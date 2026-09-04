"use client";

import { useState } from "react";
import { MessageCircleHeart } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import type { ExperienceAttitude } from "@/lib/types";

const options: { value: ExperienceAttitude; label: string }[] = [
  { value: "again", label: "好吃，还会点" },
  { value: "neutral", label: "一般" },
  { value: "avoid", label: "不会再吃" },
];

export function FeedbackCard() {
  const { pendingDecision, foods, submitExperience } = useAppStore();
  const [selected, setSelected] = useState<ExperienceAttitude>();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  if (!pendingDecision?.selectedFoodId) return null;
  const food = foods.find((item) => item.id === pendingDecision.selectedFoodId);
  if (!food) return null;

  return <section className="soft-card mb-6 border-[var(--yellow)] bg-[#fff7dc] p-4">
    <div className="flex gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--yellow)]"><MessageCircleHeart size={20} /></div><div><p className="text-sm font-extrabold">上次选了「{food.name}」</p><p className="mt-0.5 text-sm text-[var(--muted)]">三秒告诉朋友，真实吃下来怎么样？</p></div></div>
    <div className="mt-4 grid grid-cols-3 gap-2">{options.map((option) => <button key={option.value} className="pill px-2 text-xs" data-active={selected === option.value} onClick={() => setSelected(option.value)}>{option.label}</button>)}</div>
    {selected && <div className="mt-3 flex gap-2"><input className="field min-w-0" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="补充一句（选填）" maxLength={120} /><button disabled={saving} className="primary-button shrink-0" onClick={async () => { setSaving(true); await submitExperience(food.id, selected, reason); setSaving(false); }}>{saving ? "保存中" : "提交"}</button></div>}
  </section>;
}
