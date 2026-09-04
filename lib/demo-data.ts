import type { Experience, FoodItem, Place, Profile } from "@/lib/types";

export const CAMPUS_CENTER = { latitude: 31.3202, longitude: 121.3914 };

export const demoProfiles: Profile[] = [
  { id: "me", nickname: "鼠鼠", role: "admin", status: "active" },
  { id: "lin", nickname: "小林", role: "member", status: "active" },
  { id: "xiaoyu", nickname: "小雨", role: "member", status: "active" },
  { id: "azhe", nickname: "阿哲", role: "member", status: "active" },
];

export const demoPlaces: Place[] = [
  { id: "p1", name: "益新食堂", category: "食堂", address: "上海大学宝山校区南区", latitude: 31.3198, longitude: 121.3908, status: "open" },
  { id: "p2", name: "山明食堂", category: "食堂", address: "上海大学宝山校区北区", latitude: 31.3222, longitude: 121.3931, status: "open" },
  { id: "p3", name: "校门口小馆", category: "餐馆", address: "聚丰园路近上大路", latitude: 31.3176, longitude: 121.3895, status: "open" },
  { id: "p4", name: "便利蜂", category: "便利店", address: "上大路店", latitude: 31.3187, longitude: 121.3942, status: "open" },
  { id: "p5", name: "甜屿糖水", category: "甜品", address: "聚丰园路88号", latitude: 31.3169, longitude: 121.3878, status: "open" },
  { id: "p6", name: "夜猫子炸串", category: "夜宵", address: "祁连山路学生街", latitude: 31.324, longitude: 121.396, status: "open" },
];

export const demoFoods: FoodItem[] = [
  { id: "f1", placeId: "p1", name: "铁板鸡排饭", description: "鸡排现煎，酱汁偏甜，赶时间也能很快拿到。", priceCents: 1600, mealType: "正餐", serviceModes: ["堂食", "带走"], tags: ["米饭", "鸡肉", "实惠"], imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1000&q=80", status: "available" },
  { id: "f2", placeId: "p2", name: "番茄牛腩面", description: "汤底酸甜，牛腩软烂，天气凉的时候很舒服。", priceCents: 1900, mealType: "正餐", serviceModes: ["堂食"], tags: ["面食", "热汤", "牛肉"], imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1000&q=80", status: "available" },
  { id: "f3", placeId: "p3", name: "锅气炒河粉", description: "大火现炒，豆芽爽脆，份量很足。", priceCents: 2200, mealType: "正餐", serviceModes: ["堂食", "带走", "外卖"], tags: ["粉", "锅气", "微辣"], imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1000&q=80", status: "available" },
  { id: "f4", placeId: "p4", name: "照烧鸡肉饭团", description: "适合课间垫肚子，加热后口感更好。", priceCents: 790, mealType: "小吃", serviceModes: ["带走"], tags: ["饭团", "便携", "鸡肉"], imageUrl: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=1000&q=80", status: "available" },
  { id: "f5", placeId: "p5", name: "杨枝甘露", description: "芒果味足，西柚不会太苦，建议三分糖。", priceCents: 1800, mealType: "甜品", serviceModes: ["堂食", "带走", "外卖"], tags: ["芒果", "冰凉", "甜品"], imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1000&q=80", status: "available" },
  { id: "f6", placeId: "p6", name: "掌中宝炸串", description: "外脆里嫩，撒料很香，适合夜宵拼单。", priceCents: 1500, mealType: "夜宵", serviceModes: ["带走", "外卖"], tags: ["炸物", "鸡肉", "香辣"], imageUrl: "https://images.unsplash.com/photo-1625938144755-652e08e359b7?auto=format&fit=crop&w=1000&q=80", status: "available" },
  { id: "f7", placeId: "p1", name: "麻辣香锅", description: "自选菜称重，辣度稳定，适合两个人分享。", priceCents: 2600, mealType: "正餐", serviceModes: ["堂食", "带走"], tags: ["麻辣", "自选", "下饭"], imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1000&q=80", status: "available" },
  { id: "f8", placeId: "p2", name: "生煎包", description: "底脆汁多，早上刚出锅时最好吃。", priceCents: 800, mealType: "小吃", serviceModes: ["堂食", "带走"], tags: ["早餐", "面点", "猪肉"], imageUrl: "https://images.unsplash.com/photo-1563245370-63a8b6df2f3c?auto=format&fit=crop&w=1000&q=80", status: "available" },
];

export const demoExperiences: Experience[] = [
  { userId: "lin", foodId: "f1", attitude: "again", reason: "鸡排边缘很脆，十几块能吃得很满足。", createdAt: "2026-09-02T11:30:00Z", authorName: "小林" },
  { userId: "xiaoyu", foodId: "f1", attitude: "again", reason: "下课晚了也经常还有，稳定不踩雷。", createdAt: "2026-09-01T12:00:00Z", authorName: "小雨" },
  { userId: "azhe", foodId: "f2", attitude: "again", reason: "汤比想象中浓，牛腩也不少。", createdAt: "2026-09-02T18:10:00Z", authorName: "阿哲" },
  { userId: "lin", foodId: "f3", attitude: "again", reason: "锅气真的足，记得让老板少油。", createdAt: "2026-08-31T18:20:00Z", authorName: "小林" },
  { userId: "xiaoyu", foodId: "f5", attitude: "again", reason: "三分糖刚好，芒果给得很大方。", createdAt: "2026-09-03T14:00:00Z", authorName: "小雨" },
  { userId: "azhe", foodId: "f6", attitude: "neutral", reason: "味道不错，但高峰期要等一会儿。", createdAt: "2026-09-01T22:00:00Z", authorName: "阿哲" },
];
