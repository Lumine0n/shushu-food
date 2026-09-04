"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CAMPUS_CENTER, demoExperiences, demoFoods, demoPlaces, demoProfiles } from "@/lib/demo-data";
import { recommendFoods } from "@/lib/recommendation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Decision, DecisionInput, ExperienceAttitude, FoodItem, Place, Profile } from "@/lib/types";
import { normalizeName } from "@/lib/utils";

type AddFoodInput = {
  name: string;
  placeName: string;
  description: string;
  priceCents?: number;
  mealType: FoodItem["mealType"];
  serviceModes: FoodItem["serviceModes"];
  tags: string[];
  latitude?: number;
  longitude?: number;
};

type AppStore = {
  loading: boolean;
  error?: string;
  dataMode: "demo" | "supabase";
  currentUser: Profile;
  profiles: Profile[];
  places: Place[];
  foods: FoodItem[];
  experiences: typeof demoExperiences;
  favorites: string[];
  decisions: Decision[];
  pendingDecision?: Decision;
  createDecision: (input: DecisionInput) => Promise<Decision>;
  selectFood: (decisionId: string, foodId: string) => Promise<void>;
  submitExperience: (foodId: string, attitude: ExperienceAttitude, reason?: string) => Promise<void>;
  toggleFavorite: (foodId: string) => Promise<void>;
  addFood: (input: AddFoodInput) => Promise<string>;
  signOut: () => Promise<void>;
};

const StoreContext = createContext<AppStore | null>(null);
const STORAGE_KEY = "shushu-food-demo-v1";

type StoredState = Pick<AppStore, "places" | "foods" | "experiences" | "favorites" | "decisions">;

function initialDemoState(): StoredState {
  return { places: demoPlaces, foods: demoFoods, experiences: demoExperiences, favorites: ["f1", "f5"], decisions: [] };
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [currentUser, setCurrentUser] = useState<Profile>(demoProfiles[0]);
  const [state, setState] = useState<StoredState>(initialDemoState);
  const dataMode = isSupabaseConfigured() ? "supabase" : "demo";

  useEffect(() => {
    async function load() {
      if (dataMode === "demo") {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try { setState(JSON.parse(stored) as StoredState); } catch { window.localStorage.removeItem(STORAGE_KEY); }
        }
        setLoading(false);
        return;
      }

      const supabase = createClient();
      if (!supabase) return;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (pathname.startsWith("/share/")) { setLoading(false); return; }
        router.replace("/login"); return;
      }
      const [profileResult, profilesResult, placesResult, foodsResult, experiencesResult, favoritesResult, decisionsResult] = await Promise.all([
        // A user's own profile must remain readable while it is awaiting activation.
        // `.maybeSingle()` also lets us show a useful error if the auth/profile
        // trigger was not created instead of exposing PostgREST's coercion error.
        supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
        supabase.from("profiles").select("*").eq("status", "active"),
        supabase.from("places").select("*").eq("status", "open"),
        supabase.from("food_items").select("*, food_item_tags(tags(name)), food_item_images(url, sort_order)").eq("status", "available"),
        supabase.from("experiences").select("*, profiles(nickname)"),
        supabase.from("favorites").select("food_item_id").eq("user_id", auth.user.id),
        supabase.from("decisions").select("*, decision_candidates(*)").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      const firstError = [profileResult, profilesResult, placesResult, foodsResult, experiencesResult, favoritesResult, decisionsResult].find((result) => result.error)?.error;
      if (firstError) { setError(firstError.message); setLoading(false); return; }

      if (!profileResult.data) {
        setError("账号资料尚未创建，请联系管理员重新创建账号或执行用户资料初始化。");
        setLoading(false);
        return;
      }

      const profiles: Profile[] = (profilesResult.data ?? []).map((row) => ({ id: row.id, nickname: row.nickname, avatarUrl: row.avatar_url ?? undefined, role: row.role, status: row.status }));
      const places: Place[] = (placesResult.data ?? []).map((row) => ({ id: row.id, name: row.name, category: row.category, address: row.address, latitude: Number(row.latitude), longitude: Number(row.longitude), status: row.status, createdBy: row.created_by ?? undefined }));
      const foods: FoodItem[] = (foodsResult.data ?? []).map((row) => ({
        id: row.id, placeId: row.place_id, name: row.name, description: row.description ?? "", priceCents: row.price_cents ?? undefined, mealType: row.meal_type,
        serviceModes: row.service_modes ?? [], tags: (row.food_item_tags ?? []).map((item: { tags: { name: string } | null }) => item.tags?.name).filter(Boolean) as string[],
        imageUrl: [...(row.food_item_images ?? [])].sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)[0]?.url,
        status: row.status, createdBy: row.created_by ?? undefined,
      }));
      const experiences = (experiencesResult.data ?? []).map((row) => ({ userId: row.user_id, foodId: row.food_item_id, attitude: row.attitude, reason: row.reason ?? undefined, observedPriceCents: row.observed_price_cents ?? undefined, createdAt: row.created_at, authorName: Array.isArray(row.profiles) ? row.profiles[0]?.nickname ?? "圈内朋友" : row.profiles?.nickname ?? "圈内朋友" }));
      const placeMap = new Map(places.map((place) => [place.id, place]));
      const foodMap = new Map(foods.map((food) => [food.id, food]));
      const decisions: Decision[] = (decisionsResult.data ?? []).map((row) => ({
        id: row.id, input: row.input, selectedFoodId: row.selected_food_id ?? undefined, createdAt: row.created_at, feedbackPending: row.feedback_pending,
        candidates: (row.decision_candidates ?? []).sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank).map((candidate: { food_item_id: string; score: number; reasons: string[] }) => {
          const food = foodMap.get(candidate.food_item_id)!; const place = placeMap.get(food.placeId)!;
          return { foodId: food.id, foodName: food.name, placeName: place.name, placeAddress: place.address, imageUrl: food.imageUrl, priceCents: food.priceCents, distanceMeters: 0, friendRecommendationCount: 0, reasons: candidate.reasons, score: candidate.score, tags: food.tags };
        }),
      }));
      setCurrentUser(profiles.find((profile) => profile.id === auth.user!.id) ?? { id: auth.user.id, nickname: auth.user.email?.split("@")[0] ?? "鼠鼠", role: "member", status: "active" });
      setState({ places, foods, experiences, favorites: (favoritesResult.data ?? []).map((row) => row.food_item_id), decisions });
      setLoading(false);
    }
    load();
  }, [dataMode, pathname, router]);

  useEffect(() => {
    if (!loading && dataMode === "demo") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [dataMode, loading, state]);

  const createDecision = useCallback(async (input: DecisionInput) => {
    const id = crypto.randomUUID();
    const candidates = recommendFoods({ decisionId: id, userId: currentUser.id, input, foods: state.foods, places: state.places, experiences: state.experiences });
    const decision: Decision = { id, input, candidates, createdAt: new Date().toISOString(), feedbackPending: false };
    setState((old) => ({ ...old, decisions: [decision, ...old.decisions] }));
    if (dataMode === "supabase") {
      const supabase = createClient();
      const { error: decisionError } = await supabase!.from("decisions").insert({ id, user_id: currentUser.id, input, feedback_pending: false });
      if (decisionError) throw new Error(decisionError.message);
      if (candidates.length) {
        const { error: candidatesError } = await supabase!.from("decision_candidates").insert(candidates.map((card, index) => ({ decision_id: id, food_item_id: card.foodId, rank: index + 1, score: card.score, reasons: card.reasons })));
        if (candidatesError) throw new Error(candidatesError.message);
      }
    }
    return decision;
  }, [currentUser.id, dataMode, state.experiences, state.foods, state.places]);

  const selectFood = useCallback(async (decisionId: string, foodId: string) => {
    const decision = state.decisions.find((item) => item.id === decisionId);
    if (!decision?.candidates.some((candidate) => candidate.foodId === foodId)) throw new Error("只能选择本次推荐中的食物");
    setState((old) => ({ ...old, decisions: old.decisions.map((item) => item.id === decisionId ? { ...item, selectedFoodId: foodId, feedbackPending: true } : item) }));
    if (dataMode === "supabase") {
      const { error } = await createClient()!.from("decisions").update({ selected_food_id: foodId, feedback_pending: true, selected_at: new Date().toISOString() }).eq("id", decisionId);
      if (error) throw new Error(error.message);
    }
  }, [dataMode, state.decisions]);

  const submitExperience = useCallback(async (foodId: string, attitude: ExperienceAttitude, reason?: string) => {
    const next = { userId: currentUser.id, foodId, attitude, reason, createdAt: new Date().toISOString(), authorName: currentUser.nickname };
    setState((old) => ({ ...old, experiences: [...old.experiences.filter((item) => !(item.userId === currentUser.id && item.foodId === foodId)), next], decisions: old.decisions.map((item) => item.selectedFoodId === foodId && item.feedbackPending ? { ...item, feedbackPending: false } : item) }));
    if (dataMode === "supabase") {
      const supabase = createClient()!;
      const { error } = await supabase.from("experiences").upsert({ user_id: currentUser.id, food_item_id: foodId, attitude, reason: reason || null, updated_at: new Date().toISOString() }, { onConflict: "user_id,food_item_id" });
      if (error) throw new Error(error.message);
      await supabase.from("decisions").update({ feedback_pending: false }).eq("user_id", currentUser.id).eq("selected_food_id", foodId).eq("feedback_pending", true);
    }
  }, [currentUser, dataMode]);

  const toggleFavorite = useCallback(async (foodId: string) => {
    const active = state.favorites.includes(foodId);
    setState((old) => ({ ...old, favorites: active ? old.favorites.filter((id) => id !== foodId) : [...old.favorites, foodId] }));
    if (dataMode === "supabase") {
      const query = createClient()!.from("favorites");
      const { error } = active ? await query.delete().eq("user_id", currentUser.id).eq("food_item_id", foodId) : await query.insert({ user_id: currentUser.id, food_item_id: foodId });
      if (error) throw new Error(error.message);
    }
  }, [currentUser.id, dataMode, state.favorites]);

  const addFood = useCallback(async (input: AddFoodInput) => {
    const existingPlace = state.places.find((place) => normalizeName(place.name) === normalizeName(input.placeName));
    const place: Place = existingPlace ?? { id: crypto.randomUUID(), name: input.placeName, category: "其他", address: "上海大学宝山校区周边", latitude: input.latitude ?? CAMPUS_CENTER.latitude, longitude: input.longitude ?? CAMPUS_CENTER.longitude, status: "open", createdBy: currentUser.id };
    const duplicate = state.foods.find((food) => food.placeId === place.id && normalizeName(food.name) === normalizeName(input.name));
    if (duplicate) return duplicate.id;
    const food: FoodItem = { id: crypto.randomUUID(), placeId: place.id, name: input.name, description: input.description, priceCents: input.priceCents, mealType: input.mealType, serviceModes: input.serviceModes, tags: input.tags, status: "available", createdBy: currentUser.id };
    setState((old) => ({ ...old, places: existingPlace ? old.places : [...old.places, place], foods: [...old.foods, food] }));
    if (dataMode === "supabase") {
      const supabase = createClient()!;
      if (!existingPlace) {
        const { error } = await supabase.from("places").insert({ id: place.id, name: place.name, normalized_name: normalizeName(place.name), category: place.category, address: place.address, latitude: place.latitude, longitude: place.longitude, created_by: currentUser.id });
        if (error) throw new Error(error.message);
      }
      const { error } = await supabase.from("food_items").insert({ id: food.id, place_id: food.placeId, name: food.name, normalized_name: normalizeName(food.name), description: food.description, price_cents: food.priceCents, meal_type: food.mealType, service_modes: food.serviceModes, created_by: currentUser.id });
      if (error) throw new Error(error.message);
      for (const tagName of input.tags) await supabase.rpc("attach_food_tag", { p_food_id: food.id, p_tag_name: tagName });
    }
    return food.id;
  }, [currentUser.id, dataMode, state.foods, state.places]);

  const signOut = useCallback(async () => {
    if (dataMode === "supabase") await createClient()!.auth.signOut();
    router.push("/login"); router.refresh();
  }, [dataMode, router]);

  const value = useMemo<AppStore>(() => ({ loading, error, dataMode, currentUser, profiles: dataMode === "demo" ? demoProfiles : [currentUser], ...state, pendingDecision: state.decisions.find((item) => item.feedbackPending), createDecision, selectFood, submitExperience, toggleFavorite, addFood, signOut }), [addFood, createDecision, currentUser, dataMode, error, loading, selectFood, signOut, state, submitExperience, toggleFavorite]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useAppStore must be used inside AppStoreProvider");
  return value;
}
