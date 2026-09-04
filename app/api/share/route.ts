import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await request.json() as { foodId?: string };
  if (!body.foodId) return NextResponse.json({ error: "缺少食物 ID" }, { status: 400 });
  const token = randomBytes(32).toString("base64url"); const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("share_links").insert({ food_item_id: body.foodId, created_by: auth.user.id, token_hash: tokenHash, expires_at: expiresAt });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ token, expiresAt });
}
