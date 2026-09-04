import { describe, expect, it } from "vitest";
import { CAMPUS_CENTER, demoExperiences, demoFoods, demoPlaces } from "@/lib/demo-data";
import { distanceMeters, recommendFoods } from "@/lib/recommendation";
import type { DecisionInput } from "@/lib/types";

const baseInput: DecisionInput = {
  ...CAMPUS_CENTER,
  budgetMaxCents: 3000,
  distanceMeters: 3000,
  mealTypes: [],
  serviceModes: [],
  wantedTags: [],
  excludedTags: [],
};

describe("distanceMeters", () => {
  it("returns zero for the same point", () => expect(distanceMeters(31, 121, 31, 121)).toBe(0));
  it("returns a useful campus-scale distance", () => expect(distanceMeters(31.3202, 121.3914, 31.3198, 121.3908)).toBeGreaterThan(50));
});

describe("recommendFoods", () => {
  it("returns no more than nine ranked candidates", () => {
    const result = recommendFoods({ decisionId: "d1", userId: "me", input: baseInput, foods: demoFoods, places: demoPlaces, experiences: demoExperiences });
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(9);
    expect(result[0].score).toBeGreaterThanOrEqual(result.at(-1)!.score);
  });

  it("strictly excludes items over budget or without a known price", () => {
    const result = recommendFoods({ decisionId: "d2", userId: "me", input: { ...baseInput, budgetMaxCents: 1000 }, foods: demoFoods, places: demoPlaces, experiences: demoExperiences });
    expect(result.every((item) => item.priceCents != null && item.priceCents <= 1000)).toBe(true);
  });

  it("excludes the current user's avoided item", () => {
    const experiences = [...demoExperiences, { userId: "me", foodId: "f1", attitude: "avoid" as const, createdAt: new Date().toISOString(), authorName: "鼠鼠" }];
    const result = recommendFoods({ decisionId: "d3", userId: "me", input: baseInput, foods: demoFoods, places: demoPlaces, experiences });
    expect(result.some((item) => item.foodId === "f1")).toBe(false);
  });

  it("relaxes wanted tags only when fewer than three strict matches exist", () => {
    const result = recommendFoods({ decisionId: "d4", userId: "me", input: { ...baseInput, wantedTags: ["芒果"] }, foods: demoFoods, places: demoPlaces, experiences: demoExperiences });
    expect(result.length).toBeGreaterThan(1);
    expect(result.some((item) => item.foodId === "f5")).toBe(true);
  });

  it("uses deterministic jitter for the same decision", () => {
    const first = recommendFoods({ decisionId: "stable", userId: "me", input: baseInput, foods: demoFoods, places: demoPlaces, experiences: demoExperiences });
    const second = recommendFoods({ decisionId: "stable", userId: "me", input: baseInput, foods: demoFoods, places: demoPlaces, experiences: demoExperiences });
    expect(second).toEqual(first);
  });
});
