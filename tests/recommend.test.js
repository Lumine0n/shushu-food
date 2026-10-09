// 运行：在项目根目录执行 node --test
const test = require("node:test");
const assert = require("node:assert");
const { recommend, matches } = require("../recommend.js");
const { QUESTIONS, ANY, OTHER } = require("../questions.js");
const foods = require("../data/foods.json");

const q = (id) => QUESTIONS.find((x) => x.id === id);
const first = () => 0;

test("全选“都可以”时，任何菜都可能被推荐，且没有放宽", () => {
  const answers = { protein: ANY, staple: ANY, flavor: ANY, price: ANY, scene: OTHER };
  const r = recommend(foods, QUESTIONS, answers, { random: first });
  assert.ok(r.food);
  assert.deepStrictEqual(r.relaxed, []);
  assert.deepStrictEqual(r.matched, []);
});

test("条件都能满足时，推荐的菜全部命中", () => {
  const answers = { protein: "牛肉", staple: "汉堡披萨", flavor: "不辣", price: "20-40", scene: "带走" };
  for (let i = 0; i < 10; i++) {
    const r = recommend(foods, QUESTIONS, answers, { random: () => i / 10 });
    assert.ok(["大口安格斯", "大皇堡"].includes(r.food.food));
    assert.deepStrictEqual(r.relaxed, []);
  }
});

test("匹配不上时按 relaxRank 放宽，并告诉放宽了哪一条", () => {
  // 清单里没有「素食 + 汉堡披萨 + 辣 + 20 元以内」，主食或预算应被放宽
  const answers = { protein: "素食", staple: "汉堡披萨", flavor: "辣", price: "0-20" };
  const r = recommend(foods, QUESTIONS, answers, { random: first });
  assert.ok(r.food);
  assert.ok(r.relaxed.length > 0);
  assert.ok(r.matched.includes("protein"), "主料 relaxRank 最小，应最后被放宽");
});

test("鱼虾+面+不辣+20到40+一个人能完整命中，不放宽主食", () => {
  const answers = { protein: "鱼虾", staple: "面", flavor: "不辣", price: "20-40", scene: "一个人" };
  const r = recommend(foods, QUESTIONS, answers, { random: first });
  assert.ok(r.food);
  assert.strictEqual(r.food.protein, "鱼虾");
  assert.strictEqual(r.food.staple, "面");
  assert.ok(!r.relaxed.includes("staple"));
  assert.deepStrictEqual(r.relaxed, []);
});

test("鱼虾+粉+不辣+20到40+一个人完整命中", () => {
  const r = recommend(foods, QUESTIONS, {
    protein: "鱼虾", staple: "粉", flavor: "不辣", price: "20-40", scene: "一个人"
  }, { random: first });
  assert.strictEqual(r.food.protein, "鱼虾");
  assert.strictEqual(r.food.staple, "粉");
  assert.deepStrictEqual(r.relaxed, []);
});

test("素食+米饭+不辣+20到40+一个人完整命中", () => {
  const r = recommend(foods, QUESTIONS, {
    protein: "素食", staple: "米饭", flavor: "不辣", price: "20-40", scene: "一个人"
  }, { random: first });
  assert.strictEqual(r.food.protein, "素食");
  assert.strictEqual(r.food.staple, "米饭");
  assert.deepStrictEqual(r.relaxed, []);
});

test("“不辣”会命中“清淡”的菜，“辣”不会", () => {
  const food = { flavor: "清淡" };
  assert.strictEqual(matches(food, q("flavor"), "不辣"), true);
  assert.strictEqual(matches(food, q("flavor"), "辣"), false);
});

test("预算区间：含下限，不含上限", () => {
  assert.strictEqual(matches({ price: 20 }, q("price"), "20-40"), true);
  assert.strictEqual(matches({ price: 20 }, q("price"), "0-20"), false);
  assert.strictEqual(matches({ price: 124 }, q("price"), "40+"), true);
});

test("场景是数组字段，包含即命中", () => {
  assert.strictEqual(matches({ scene: ["一个人", "带走"] }, q("scene"), "带走"), true);
  assert.strictEqual(matches({ scene: ["聚餐"] }, q("scene"), "带走"), false);
});

test("“换一个”会排除已看过的菜；全部看过后重新开始", () => {
  const answers = { protein: "牛肉", staple: "汉堡披萨" };
  const a = recommend(foods, QUESTIONS, answers, { random: first });
  const b = recommend(foods, QUESTIONS, answers, { random: first, exclude: [a.food.id] });
  assert.notStrictEqual(a.food.id, b.food.id);
  const all = foods.map((f) => f.id);
  assert.ok(recommend(foods, QUESTIONS, answers, { exclude: all }).food);
});

test("清单为空时返回 null", () => {
  assert.strictEqual(recommend([], QUESTIONS, {}), null);
});

test("foods.json 每条都有必填字段且取值在词表里", () => {
  const vocab = (id) => q(id).options.map((o) => o.value).concat(["其他", "清淡", "不辣"]);
  for (const f of foods) {
    for (const k of ["id", "food", "place", "address", "protein", "staple", "flavor", "price", "scene", "tags", "reason", "source", "addedAt"]) {
      assert.ok(k in f, `${f.food} 缺少字段 ${k}`);
    }
    assert.ok(vocab("protein").includes(f.protein), `${f.food} 主料 ${f.protein}`);
    assert.ok(vocab("staple").includes(f.staple), `${f.food} 主食 ${f.staple}`);
    assert.ok(["辣", "不辣", "清淡"].includes(f.flavor), `${f.food} 口味 ${f.flavor}`);
    assert.strictEqual(typeof f.price, "number");
    assert.ok(Array.isArray(f.scene) && Array.isArray(f.tags));
  }
  assert.strictEqual(new Set(foods.map((f) => f.id)).size, foods.length, "id 不能重复");
});
