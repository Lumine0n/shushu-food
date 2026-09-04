import type { DecisionInput, Experience, FoodItem, Place, RecommendationCard } from "@/lib/types";

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earth = 6_371_000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

function stableJitter(seed: string) {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash) % 501) / 100;
}

export function recommendFoods(args: {
  decisionId: string;
  userId: string;
  input: DecisionInput;
  foods: FoodItem[];
  places: Place[];
  experiences: Experience[];
}): RecommendationCard[] {
  const placeMap = new Map(args.places.map((place) => [place.id, place]));

  const score = (food: FoodItem, relaxWantedTags: boolean) => {
    const place = placeMap.get(food.placeId);
    if (!place || place.status !== "open" || food.status !== "available") return null;
    const distance = distanceMeters(args.input.latitude, args.input.longitude, place.latitude, place.longitude);
    if (distance > args.input.distanceMeters) return null;
    if (args.input.budgetMaxCents != null && (food.priceCents == null || food.priceCents > args.input.budgetMaxCents)) return null;
    if (args.input.mealTypes.length && !args.input.mealTypes.includes(food.mealType)) return null;
    if (args.input.serviceModes.length && !args.input.serviceModes.some((mode) => food.serviceModes.includes(mode))) return null;
    if (food.tags.some((tag) => args.input.excludedTags.includes(tag))) return null;

    const mine = args.experiences.find((item) => item.userId === args.userId && item.foodId === food.id);
    if (mine?.attitude === "avoid") return null;
    const positive = args.experiences.filter((item) => item.foodId === food.id && item.userId !== args.userId && item.attitude === "again");
    const tagMatches = food.tags.filter((tag) => args.input.wantedTags.includes(tag)).length;
    if (!relaxWantedTags && args.input.wantedTags.length && tagMatches === 0) return null;

    const tagScore = args.input.wantedTags.length ? Math.min(30, (tagMatches / args.input.wantedTags.length) * 30) : 15;
    const friendScore = Math.min(25, positive.length * 10);
    const distanceScore = Math.max(0, 20 * (1 - distance / args.input.distanceMeters));
    const budgetScore = args.input.budgetMaxCents && food.priceCents != null ? Math.max(0, 15 * (1 - food.priceCents / args.input.budgetMaxCents)) : 7.5;
    const ownScore = mine?.attitude === "again" ? 10 : 0;
    const finalScore = tagScore + friendScore + distanceScore + budgetScore + ownScore + stableJitter(`${args.decisionId}:${food.id}`);
    const reasons = [
      positive.length ? `${positive.length} 位朋友说下次还会吃` : "圈内新发现",
      `${Math.round(distance)} 米内可达`,
      tagMatches ? `符合 ${food.tags.filter((tag) => args.input.wantedTags.includes(tag)).join("、")}` : food.tags.slice(0, 2).join(" · "),
    ];

    return { foodId: food.id, foodName: food.name, placeName: place.name, placeAddress: place.address, imageUrl: food.imageUrl, priceCents: food.priceCents, distanceMeters: distance, friendRecommendationCount: positive.length, reasons, score: Number(finalScore.toFixed(2)), tags: food.tags } satisfies RecommendationCard;
  };

  let ranked = args.foods.map((food) => score(food, false)).filter((food): food is RecommendationCard => food !== null);
  if (ranked.length < 3 && args.input.wantedTags.length) {
    ranked = args.foods.map((food) => score(food, true)).filter((food): food is RecommendationCard => food !== null);
  }
  ranked.sort((a, b) => b.score - a.score);

  const diversified: RecommendationCard[] = [];
  const usedPlaces = new Set<string>();
  for (const card of ranked) {
    if (diversified.length < 3 && usedPlaces.has(card.placeName)) continue;
    diversified.push(card);
    usedPlaces.add(card.placeName);
    if (diversified.length === 9) break;
  }
  for (const card of ranked) {
    if (diversified.length === 9) break;
    if (!diversified.some((item) => item.foodId === card.foodId)) diversified.push(card);
  }
  return diversified;
}
