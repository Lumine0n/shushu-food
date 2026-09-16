import type { Experience, FoodItem, Place, Profile } from "@/lib/types";

export const CAMPUS_CENTER = { latitude: 31.3202, longitude: 121.3914 };

export const demoProfiles: Profile[] = [
  { id: "me", nickname: "鼠鼠", role: "admin", status: "active" },
  { id: "lin", nickname: "小林", role: "member", status: "active" },
  { id: "xiaoyu", nickname: "小雨", role: "member", status: "active" },
  { id: "azhe", nickname: "阿哲", role: "member", status: "active" },
];

export const demoPlaces: Place[] = [
  { id: "p1", name: "泰煌鸡", category: "中餐", address: "上海市宝山区上大路678号", latitude: 31.3188, longitude: 121.3942, averagePriceCents: 3800, notes: "白斩鸡的蘸料和辣酱值得尝试。", coordinateStatus: "estimated", status: "open" },
  { id: "p2", name: "马厂老火锅", category: "火锅", address: "上海市宝山区上大路682号26楼", latitude: 31.31876, longitude: 121.3943, averagePriceCents: 12400, notes: "推荐马厂油碟，比较解辣。适合多人聚会，不能吃辣需谨慎。", coordinateStatus: "estimated", status: "open" },
  { id: "p3", name: "Popeyes", category: "快餐", address: "上海市宝山区上大路682号", latitude: 31.31876, longitude: 121.3943, averagePriceCents: 3300, notes: "定位接近麦当劳、肯德基，汉堡表现更好，可关注1+1套餐。", coordinateStatus: "estimated", status: "open" },
  { id: "p4", name: "朴大叔拌饭（南区食堂）", category: "食堂", address: "上海大学宝山校区南区食堂", latitude: 31.3198, longitude: 121.3908, averagePriceCents: 1800, notes: "拌饭风格接近米村拌饭，全部拌在一起后很像“人饲料”吃法。", coordinateStatus: "estimated", status: "open" },
  { id: "p5", name: "火箭狗披萨", category: "西餐", address: "上海市宝山区聚丰园路91弄1号122", latitude: 31.317, longitude: 121.3879, averagePriceCents: 5500, notes: "西餐价格稍高，适合偶尔奖励自己。不推荐意大利面。", coordinateStatus: "estimated", status: "open" },
  { id: "p6", name: "Fan土耳其烤肉饭", category: "小吃", address: "上海市宝山区聚丰园路37号弘基广场", latitude: 31.3165, longitude: 121.3893, averagePriceCents: 1300, notes: "位于新世纪对面，常年排队。适合打包回寝室。", coordinateStatus: "estimated", status: "open" },
  { id: "p7", name: "西安肉夹馍", category: "小吃", address: "上海市宝山区聚丰园路37号", latitude: 31.3165, longitude: 121.3893, averagePriceCents: 1300, notes: "肉夹馍可选五花或纯瘦，也可以加香肠、鸡蛋、豆皮。", coordinateStatus: "estimated", status: "open" },
  { id: "p8", name: "汉堡王（经纬汇）", category: "快餐", address: "上海市宝山区经纬汇9号楼红色楼一层", latitude: 31.321, longitude: 121.392, averagePriceCents: 3300, notes: "汉堡比常见连锁快餐更多汁，适合正餐或夜宵。", coordinateStatus: "estimated", status: "open" },
  { id: "p9", name: "咱家东北铁锅炖", category: "东北菜", address: "上海市宝山区聚丰园路9弄66号弘基休闲文化广场2层", latitude: 31.3168, longitude: 121.3888, averagePriceCents: 6600, notes: "菜量很大，适合多人一起吃。味道偏酱香，咸菜也很好吃。", coordinateStatus: "estimated", status: "open" },
];

export const demoFoods: FoodItem[] = [
  { id: "f1", placeId: "p1", name: "白斩鸡", description: "店内推荐菜，蘸料和辣酱是亮点。", mealType: "正餐", serviceModes: ["堂食", "带走"], tags: ["鸡肉", "清淡", "上海菜"], status: "available" },
  { id: "f2", placeId: "p1", name: "鸡汤面", description: "鸡汤搭配面条，适合想吃清淡热食时选择。", mealType: "正餐", serviceModes: ["堂食"], tags: ["鸡肉", "面食", "清淡", "热汤"], status: "available" },
  { id: "f3", placeId: "p1", name: "鸡胗皮蛋豆腐", description: "鸡胗、皮蛋和豆腐组合的凉菜。", mealType: "正餐", serviceModes: ["堂食"], tags: ["鸡肉", "凉菜", "豆腐"], status: "available" },
  { id: "f4", placeId: "p2", name: "马厂全红锅", description: "重麻重辣的红锅，适合能吃辣的多人聚会。", mealType: "正餐", serviceModes: ["堂食"], tags: ["麻辣", "火锅", "聚会"], status: "available" },
  { id: "f5", placeId: "p2", name: "手切吊龙", description: "火锅推荐牛肉菜品，适合涮煮。", mealType: "正餐", serviceModes: ["堂食"], tags: ["牛肉", "火锅", "聚会"], status: "available" },
  { id: "f6", placeId: "p2", name: "屠宰鲜毛肚", description: "火锅推荐菜，口感爽脆。", mealType: "正餐", serviceModes: ["堂食"], tags: ["毛肚", "火锅", "麻辣"], status: "available" },
  { id: "f7", placeId: "p2", name: "贡菜", description: "适合搭配红锅，口感清脆。", mealType: "正餐", serviceModes: ["堂食"], tags: ["蔬菜", "火锅", "聚会"], status: "available" },
  { id: "f8", placeId: "p3", name: "大嘴鸡排堡", description: "汉堡表现比同价位常见连锁快餐更突出，可搭配蜂蜜芥末酱。", mealType: "正餐", serviceModes: ["堂食", "带走", "外卖"], tags: ["汉堡", "炸鸡", "快餐"], status: "available" },
  { id: "f9", placeId: "p4", name: "金枪鱼拌饭", description: "拌在一起后很像“人饲料”，风格接近米村拌饭。", mealType: "正餐", serviceModes: ["堂食", "带走"], tags: ["拌饭", "米饭", "金枪鱼", "实惠"], status: "available" },
  { id: "f10", placeId: "p5", name: "玛格丽特披萨", description: "店内推荐披萨，适合偶尔想吃西餐时选择。", mealType: "正餐", serviceModes: ["堂食", "带走"], tags: ["披萨", "西餐", "聚会"], status: "available" },
  { id: "f11", placeId: "p5", name: "薯条", description: "适合与披萨一起分享。", mealType: "小吃", serviceModes: ["堂食", "带走"], tags: ["薯条", "炸物", "西餐"], status: "available" },
  { id: "f12", placeId: "p6", name: "土耳其烤肉饭", description: "大份烤肉拌饭，肉、饭、菜拌在一起，适合打包。", mealType: "正餐", serviceModes: ["堂食", "带走"], tags: ["烤肉", "米饭", "实惠", "排队"], status: "available" },
  { id: "f13", placeId: "p6", name: "肉夹馍", description: "土耳其烤肉口味的便携主食。", mealType: "小吃", serviceModes: ["带走"], tags: ["烤肉", "面食", "便携", "实惠"], status: "available" },
  { id: "f14", placeId: "p7", name: "肉夹馍（五花/纯瘦）", description: "可选五花或纯瘦，也可以加香肠、鸡蛋、豆皮。", mealType: "小吃", serviceModes: ["堂食", "带走"], tags: ["猪肉", "面食", "便携", "实惠"], status: "available" },
  { id: "f15", placeId: "p8", name: "大口安格斯", description: "肉饼多汁，是汉堡王的推荐选择。", mealType: "正餐", serviceModes: ["堂食", "带走", "外卖"], tags: ["汉堡", "牛肉", "快餐", "夜宵"], status: "available" },
  { id: "f16", placeId: "p8", name: "大皇堡", description: "经典牛肉汉堡，汁水和饱腹感都比较足。", mealType: "正餐", serviceModes: ["堂食", "带走", "外卖"], tags: ["汉堡", "牛肉", "快餐", "夜宵"], status: "available" },
  { id: "f17", placeId: "p9", name: "铁锅炖公鸡", description: "份量很大，味道偏酱香，适合多人一起吃。", mealType: "正餐", serviceModes: ["堂食"], tags: ["东北菜", "鸡肉", "铁锅炖", "聚会"], status: "available" },
  { id: "f18", placeId: "p9", name: "铁锅炖排骨", description: "排骨搭配铁锅炖，份量适合多人分享。", mealType: "正餐", serviceModes: ["堂食"], tags: ["东北菜", "猪肉", "铁锅炖", "聚会"], status: "available" },
];

export const demoExperiences: Experience[] = [];
