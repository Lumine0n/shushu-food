import Image from "next/image";
import Link from "next/link";
import { createHash } from "node:crypto";
import { MapPin, UsersRound, UtensilsCrossed } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { demoExperiences, demoFoods, demoPlaces } from "@/lib/demo-data";
import { formatPrice } from "@/lib/utils";

type SharedFood = { food_name: string; place_name: string; address: string; image_url?: string; price_cents?: number; positive_count: number; tags: string[] };

async function getSharedFood(token: string): Promise<SharedFood | null> {
  if (token.startsWith("demo-")) {
    const food = demoFoods.find((item) => item.id === token.slice(5)); if (!food) return null;
    const place = demoPlaces.find((item) => item.id === food.placeId)!;
    return { food_name: food.name, place_name: place.name, address: place.address, image_url: food.imageUrl, price_cents: food.priceCents, positive_count: demoExperiences.filter((item) => item.foodId === food.id && item.attitude === "again").length, tags: food.tags };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const client = createClient(url, serviceKey, { auth: { persistSession: false } });
  const hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await client.rpc("get_public_share", { p_token_hash: hash });
  return error || !data?.[0] ? null : data[0];
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const food = await getSharedFood(token);
  if (!food) return <main className="page flex min-h-dvh items-center justify-center"><div className="soft-card max-w-sm p-8 text-center"><UtensilsCrossed className="mx-auto" size={34} color="#c94a32" /><h1 className="serif mt-4 text-2xl font-bold">这张饭卡已经失效</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">链接可能已过期、被撤销，或者输入不完整。</p><Link className="primary-button mt-5 inline-flex items-center" href="/">回到鼠鼠吃饭</Link></div></main>;
  return <main className="min-h-dvh px-5 py-8"><article className="mx-auto max-w-md overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--card)] shadow-[0_20px_60px_rgba(56,48,35,.12)]"><div className="relative h-72 bg-[#e7e0d3]">{food.image_url && <Image src={food.image_url} alt={food.food_name} fill className="object-cover" sizes="448px" />}<span className="absolute left-4 top-4 rounded-full bg-[#fffdf7]/92 px-3 py-2 text-xs font-extrabold text-[var(--red)]">朋友递来一张饭卡</span></div><div className="p-6"><p className="section-label">今天可以吃</p><h1 className="serif mt-2 text-[34px] font-bold leading-tight">{food.food_name}</h1><p className="mt-3 flex items-center gap-1.5 font-bold"><MapPin size={17} color="#c94a32" />{food.place_name}</p><p className="mt-1 text-sm text-[var(--muted)]">{food.address}</p><div className="mt-5 flex items-center justify-between border-y border-[var(--line)] py-4"><strong className="text-xl text-[var(--red)]">{formatPrice(food.price_cents)}</strong><span className="flex items-center gap-1.5 text-sm font-bold text-[var(--green)]"><UsersRound size={17} />{food.positive_count ? `${food.positive_count} 人还会再点` : "圈内新发现"}</span></div><div className="mt-4 flex flex-wrap gap-2">{food.tags.map((tag) => <span className="rounded-full bg-[#eef2ec] px-3 py-1.5 text-xs font-bold text-[var(--green)]" key={tag}>{tag}</span>)}</div><p className="mt-5 text-xs leading-5 text-[var(--muted)]">为了保护朋友隐私，公开饭卡不会显示姓名和原始评价。</p><Link href="/login" className="primary-button mt-5 flex items-center justify-center">进入朋友饭桌</Link></div></article></main>;
}
