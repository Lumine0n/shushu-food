/*
 * 问题配置：想改问题、加选项，只需要改这个文件。
 *
 * 每道题的字段：
 *   id        题目编号，也是答案的名字
 *   name      题目的简称，结果页里“放宽了哪一条”会用到
 *   field     对应 data/foods.json 里的哪个字段
 *   title     题目文字
 *   color     这道题的小球颜色
 *   relaxRank 匹配不到时先放宽谁：数字越大越先放宽
 *   options   选项列表。每个选项：
 *     label  显示的文字
 *     value  和 foods.json 里的值比较
 *     short  （可选）写在小球上的短文字，不填就用 label
 *     icon   按钮上的小图标
 *     match  （可选）特殊比较方式：
 *              { not: "辣" }        字段不等于“辣”就算命中
 *              { min: 20, max: 40 } 数字在这个范围内（含 min，不含 max）
 *
 * 每道题最后都会自动加上“其他”和“都可以”，选了它们这道题就不参与筛选。
 */
var QUESTIONS = [
  {
    id: "protein",
    name: "主料",
    field: "protein",
    title: "今天想吃点什么肉？",
    color: "#FF8A3D",
    relaxRank: 1,
    options: [
      { label: "牛肉", value: "牛肉", icon: "🐮" },
      { label: "鸡肉", value: "鸡肉", icon: "🐔" },
      { label: "猪肉", value: "猪肉", icon: "🐷" },
      { label: "鱼虾", value: "鱼虾", icon: "🦐" },
      { label: "素食", value: "素食", icon: "🥬" }
    ]
  },
  {
    id: "staple",
    name: "主食",
    field: "staple",
    title: "主食想来点啥？",
    color: "#FFC93C",
    relaxRank: 3,
    options: [
      { label: "米饭", value: "米饭", icon: "🍚" },
      { label: "面", value: "面", icon: "🍜" },
      { label: "粉", value: "粉", icon: "🍝" },
      { label: "汉堡披萨", value: "汉堡披萨", icon: "🍔" }
    ]
  },
  {
    id: "flavor",
    name: "口味",
    field: "flavor",
    title: "口味偏好？",
    color: "#FF4D6D",
    relaxRank: 2,
    options: [
      { label: "辣", value: "辣", icon: "🌶️" },
      { label: "不辣", value: "不辣", icon: "😌", match: { not: "辣" } },
      { label: "清淡", value: "清淡", icon: "🍵" }
    ]
  },
  {
    id: "price",
    name: "预算",
    field: "price",
    title: "这顿预算多少？",
    color: "#2EC4B6",
    relaxRank: 4,
    options: [
      { label: "20 元以内", short: "≤20元", value: "0-20", icon: "🪙", match: { min: 0, max: 20 } },
      { label: "20 到 40 元", short: "20-40", value: "20-40", icon: "💵", match: { min: 20, max: 40 } },
      { label: "40 元以上", short: "40元+", value: "40+", icon: "💰", match: { min: 40, max: Infinity } }
    ]
  },
  {
    id: "scene",
    name: "场景",
    field: "scene",
    title: "怎么吃？",
    color: "#7B61FF",
    relaxRank: 5,
    options: [
      { label: "一个人", value: "一个人", icon: "🙋" },
      { label: "聚餐", value: "聚餐", icon: "🎉" },
      { label: "带走", value: "带走", icon: "🥡" }
    ]
  }
];

var ANY = "__any";
var OTHER = "__other";

QUESTIONS.forEach(function (q) {
  q.options.push({ label: "其他", value: OTHER, icon: "❔" });
  q.options.push({ label: "都可以", value: ANY, icon: "🌈" });
});

if (typeof module !== "undefined") {
  module.exports = { QUESTIONS: QUESTIONS, ANY: ANY, OTHER: OTHER };
}
