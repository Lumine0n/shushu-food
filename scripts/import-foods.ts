import { readFile } from "node:fs/promises";
import process from "node:process";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { normalizeName } from "../lib/utils";

const rowSchema = z.object({
  place_name: z.string().trim().min(1),
  place_category: z.string().trim().min(1),
  address: z.string().trim().min(1),
  latitude_gcj02: z.coerce.number().min(-90).max(90),
  longitude_gcj02: z.coerce.number().min(-180).max(180),
  food_name: z.string().trim().min(1),
  description: z.string().trim().max(240).default(""),
  price_yuan: z.union([z.literal(""), z.coerce.number().positive().max(1000)]),
  meal_type: z.enum(["正餐", "夜宵", "甜品", "饮品", "小吃"]),
  service_modes: z.string().trim().min(1),
  tags: z.string().trim().min(1),
  image_url: z.string().trim().default("").refine((value) => !value || value.startsWith("https://"), "图片必须是 HTTPS 地址"),
  source: z.string().trim().default("seed"),
});

async function main() {
  const file = process.argv.find((arg) => arg.endsWith(".csv"));
  const dryRun = process.argv.includes("--dry-run");
  if (!file) throw new Error("用法：npm run import:foods -- data/foods.csv [--dry-run]");
  const csv = await readFile(file, "utf8");
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const rows = parsed.data.map((row, index) => {
    const result = rowSchema.safeParse(row);
    if (!result.success) throw new Error(`第 ${index + 2} 行：${result.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("；")}`);
    return result.data;
  });
  console.log(`校验通过：${rows.length} 条食物${dryRun ? "（仅检查，不写入）" : ""}`);
  if (dryRun) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  for (const [index, row] of rows.entries()) {
    const placeNormalized = normalizeName(row.place_name);
    let { data: place } = await supabase.from("places").select("id").eq("normalized_name", placeNormalized).eq("address", row.address).maybeSingle();
    if (!place) {
      const result = await supabase.from("places").insert({ name: row.place_name, normalized_name: placeNormalized, category: row.place_category, address: row.address, latitude: row.latitude_gcj02, longitude: row.longitude_gcj02 }).select("id").single();
      if (result.error) throw new Error(`第 ${index + 2} 行地点写入失败：${result.error.message}`);
      place = result.data;
    }
    const foodNormalized = normalizeName(row.food_name);
    const foodResult = await supabase.from("food_items").upsert({ place_id: place.id, name: row.food_name, normalized_name: foodNormalized, description: row.description, price_cents: row.price_yuan === "" ? null : Math.round(Number(row.price_yuan) * 100), meal_type: row.meal_type, service_modes: row.service_modes.split("|").map((item) => item.trim()).filter(Boolean) }, { onConflict: "place_id,normalized_name" }).select("id").single();
    if (foodResult.error) throw new Error(`第 ${index + 2} 行食物写入失败：${foodResult.error.message}`);
    const foodId = foodResult.data.id;

    for (const tagName of row.tags.split("|").map((item) => item.trim()).filter(Boolean)) {
      const tagResult = await supabase.from("tags").upsert({ name: tagName }, { onConflict: "name" }).select("id").single();
      if (tagResult.error) throw new Error(`第 ${index + 2} 行标签写入失败：${tagResult.error.message}`);
      const linkResult = await supabase.from("food_item_tags").upsert({ food_item_id: foodId, tag_id: tagResult.data.id }, { onConflict: "food_item_id,tag_id" });
      if (linkResult.error) throw new Error(`第 ${index + 2} 行标签关联失败：${linkResult.error.message}`);
    }
    if (row.image_url) {
      const existing = await supabase.from("food_item_images").select("id").eq("food_item_id", foodId).eq("url", row.image_url).maybeSingle();
      if (!existing.data) {
        const imageResult = await supabase.from("food_item_images").insert({ food_item_id: foodId, url: row.image_url });
        if (imageResult.error) throw new Error(`第 ${index + 2} 行图片写入失败：${imageResult.error.message}`);
      }
    }
    console.log(`[${index + 1}/${rows.length}] ${row.place_name} · ${row.food_name}`);
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
