import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const requestSchema = z.object({ code: z.string().min(1).max(512) });

/**
 * 微信小程序登录交换端点。
 * 生产实现需要在服务端用 WECHAT_MINIPROGRAM_APPID / SECRET 调用 code2Session，
 * 再绑定 profiles 并签发应用会话；AppSecret 永远不能下发到小程序端。
 */
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "微信登录 code 无效" }, { status: 400 });

  const appId = process.env.WECHAT_MINIPROGRAM_APPID;
  const secret = process.env.WECHAT_MINIPROGRAM_SECRET;
  if (!appId || !secret) {
    return NextResponse.json({ error: "微信小程序登录尚未配置，请先设置服务端凭证。" }, { status: 503 });
  }

  const params = new URLSearchParams({ appid: appId, secret, js_code: parsed.data.code, grant_type: "authorization_code" });
  const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "微信服务暂时不可用，请稍后重试。" }, { status: 502 });
  const result = (await response.json()) as { openid?: string; session_key?: string; unionid?: string; errcode?: number; errmsg?: string };
  if (!result.openid) return NextResponse.json({ error: result.errmsg || "微信登录失败", code: result.errcode }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "服务端数据库尚未配置，暂时无法完成身份绑定。" }, { status: 503 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: account, error } = await admin
    .from("wechat_accounts")
    .select("profile_id")
    .eq("app_id", appId)
    .eq("open_id", result.openid)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "身份绑定查询失败，请稍后重试。" }, { status: 500 });
  if (!account?.profile_id) {
    return NextResponse.json({ error: "这个微信还没有加入朋友小圈，请联系管理员绑定。", needsProfileBinding: true }, { status: 403 });
  }

  // 当前只完成安全的身份确认；正式会话签发将在确定小程序会话方案后接入。
  return NextResponse.json({ status: "wechat_verified", profileId: account.profile_id });
}
