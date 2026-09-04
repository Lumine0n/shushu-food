import { NextResponse } from "next/server";
import { z } from "zod";

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

  // TODO: 用 service-role 在服务端完成 openid → profiles 映射，并签发 HttpOnly 会话。
  // 此处不返回 openid/session_key，避免把微信身份凭证暴露给小程序页面。
  return NextResponse.json({ status: "wechat_verified", needsProfileBinding: true });
}
