import { z } from "zod";

export const decisionInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  budgetMaxCents: z.number().int().positive().max(100_000).optional(),
  distanceMeters: z.number().int().min(100).max(20_000),
  mealTypes: z.array(z.enum(["正餐", "夜宵", "甜品", "饮品", "小吃"])),
  serviceModes: z.array(z.enum(["堂食", "带走", "外卖"])),
  wantedTags: z.array(z.string().min(1).max(30)).max(12),
  excludedTags: z.array(z.string().min(1).max(30)).max(12),
});

export const foodInputSchema = z.object({
  name: z.string().trim().min(1, "请填写食物名称").max(60),
  placeName: z.string().trim().min(1, "请填写地点").max(80),
  description: z.string().trim().max(240).default(""),
  priceYuan: z.coerce.number().positive().max(1000).optional(),
  mealType: z.enum(["正餐", "夜宵", "甜品", "饮品", "小吃"]),
  tags: z.array(z.string().trim().min(1).max(30)).min(1).max(8),
});
