export type ExperienceAttitude = "again" | "neutral" | "avoid";
export type MealType = "正餐" | "夜宵" | "甜品" | "饮品" | "小吃";
export type ServiceMode = "堂食" | "带走" | "外卖";

export type Profile = {
  id: string;
  nickname: string;
  avatarUrl?: string;
  role: "admin" | "member";
  status: "active" | "inactive";
};

export type Place = {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  status: "open" | "closed";
  createdBy?: string;
};

export type Experience = {
  userId: string;
  foodId: string;
  attitude: ExperienceAttitude;
  reason?: string;
  observedPriceCents?: number;
  createdAt: string;
  authorName: string;
};

export type FoodItem = {
  id: string;
  placeId: string;
  name: string;
  description: string;
  priceCents?: number;
  mealType: MealType;
  serviceModes: ServiceMode[];
  tags: string[];
  imageUrl?: string;
  status: "available" | "unavailable";
  createdBy?: string;
};

export type DecisionInput = {
  latitude: number;
  longitude: number;
  budgetMaxCents?: number;
  distanceMeters: number;
  mealTypes: MealType[];
  serviceModes: ServiceMode[];
  wantedTags: string[];
  excludedTags: string[];
};

export type RecommendationCard = {
  foodId: string;
  foodName: string;
  placeName: string;
  placeAddress: string;
  imageUrl: string | undefined;
  priceCents: number | undefined;
  distanceMeters: number;
  friendRecommendationCount: number;
  reasons: string[];
  score: number;
  tags: string[];
};

export type Decision = {
  id: string;
  input: DecisionInput;
  candidates: RecommendationCard[];
  selectedFoodId?: string;
  createdAt: string;
  feedbackPending: boolean;
};
