import { NextResponse } from "next/server";
import { z } from "zod";
import { demoExperiences, demoFoods, demoPlaces } from "@/lib/demo-data";
import { recommendFoods } from "@/lib/recommendation";

const requestSchema = z.object({
  decisionId: z.string().min(1).max(80),
  userId: z.string().min(1).max(80).default("miniapp-demo"),
  input: z.object({
    latitude: z.number().finite(),
    longitude: z.number().finite(),
    budgetMaxCents: z.number().int().positive().optional(),
    distanceMeters: z.number().int().positive().max(50_000),
    mealTypes: z.array(z.enum(["正餐", "夜宵", "甜品", "饮品", "小吃"])),
    serviceModes: z.array(z.enum(["堂食", "带走", "外卖"])),
    wantedTags: z.array(z.string().min(1).max(30)).max(20),
    excludedTags: z.array(z.string().min(1).max(30)).max(20),
  }),
});

/**
 * 小程序共用推荐接口的第一版契约。
 * 当前在未配置 Supabase 时使用 demo 数据，方便先在微信开发者工具联调；
 * 接入真实账号后，这里应改为读取当前用户可见的数据并写入 decisions。
 */
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请求参数不正确", details: parsed.error.flatten() }, { status: 400 });
  }

  const recommendations = recommendFoods({
    decisionId: parsed.data.decisionId,
    userId: parsed.data.userId,
    input: parsed.data.input,
    foods: demoFoods,
    places: demoPlaces,
    experiences: demoExperiences,
  });

  return NextResponse.json({
    mode: "demo",
    candidates: recommendations,
    message: recommendations.length ? undefined : "暂时没有符合条件的食物，请放宽口味或距离。",
  });
}
