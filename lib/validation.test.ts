import { describe, expect, it } from "vitest";
import { decisionInputSchema, foodInputSchema } from "@/lib/validation";

describe("validation", () => {
  it("accepts a valid decision", () => expect(decisionInputSchema.safeParse({ latitude: 31.32, longitude: 121.39, budgetMaxCents: 3000, distanceMeters: 1500, mealTypes: ["正餐"], serviceModes: ["堂食"], wantedTags: ["米饭"], excludedTags: [] }).success).toBe(true));
  it("rejects an unsafe distance", () => expect(decisionInputSchema.safeParse({ latitude: 31.32, longitude: 121.39, distanceMeters: 50000, mealTypes: [], serviceModes: [], wantedTags: [], excludedTags: [] }).success).toBe(false));
  it("requires at least one food tag", () => expect(foodInputSchema.safeParse({ name: "鸡排饭", placeName: "食堂", description: "", mealType: "正餐", tags: [] }).success).toBe(false));
});
