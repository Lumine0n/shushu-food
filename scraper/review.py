"""命令行逐条审核 data/candidates.json，通过的写入 data/foods.json。

每条候选可以：
    a  通过（直接写入）
    e  修改后通过（逐个字段确认，直接回车保留原值）
    d  丢弃
    s  跳过（下次再审）
    q  保存并退出

同一道菜（店名 + 菜名相同）被多次提到时不新增条目，而是 mentions + 1。
踩雷帖（sentiment = negative）不会出现在审核里，也不会进推荐清单。

用法：
    python scraper/review.py
    python scraper/review.py --min-confidence 0.5
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract import normalize  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CANDIDATES_FILE = DATA_DIR / "candidates.json"
FOODS_FILE = DATA_DIR / "foods.json"

FOOD_FIELDS = [
    "id", "food", "place", "address", "protein", "staple", "flavor", "price",
    "scene", "tags", "reason", "source", "sourceUrl", "addedAt", "mentions",
]
LIST_FIELDS = {"scene", "tags"}
EDITABLE = ["food", "place", "address", "protein", "staple", "flavor", "price", "scene", "tags", "reason"]
VOCAB = {
    "protein": {"牛肉", "鸡肉", "猪肉", "鱼虾", "素食", "其他"},
    "staple": {"米饭", "面", "粉", "汉堡披萨", "其他"},
    "flavor": {"辣", "不辣", "清淡"},
    "scene": {"一个人", "聚餐", "带走"},
}


# ---------- 文件读写 ----------


def load_foods(path: Path) -> tuple[list[dict], dict | None]:
    """返回 (菜品列表, 外层对象)。foods.json 可以是数组，也可以是 {"foods": [...]}。"""
    if not path.exists() or not path.read_text(encoding="utf-8").strip():
        return [], None
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        return raw.setdefault("foods", []), raw
    return raw, None


def save_foods(path: Path, foods: list[dict], wrapper: dict | None) -> None:
    data = wrapper if wrapper is not None else foods
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_candidates(path: Path) -> list[dict]:
    if not path.exists() or not path.read_text(encoding="utf-8").strip():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def save_candidates(path: Path, candidates: list[dict]) -> None:
    path.write_text(json.dumps(candidates, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# ---------- 合并逻辑（纯函数，方便测试） ----------


def food_key(entry: dict) -> str:
    return normalize(entry.get("place", "")) + "|" + normalize(entry.get("food", ""))


def next_id(foods: list[dict]) -> str:
    """沿用已有 id 的前缀和编号（如 food-018 -> food-019）；没有就从 food-001 开始。"""
    best_prefix, best_num, width = "food-", 0, 3
    for item in foods:
        m = re.match(r"^(.*?)(\d+)$", str(item.get("id", "")))
        if m and int(m.group(2)) >= best_num:
            best_prefix, best_num, width = m.group(1), int(m.group(2)), len(m.group(2))
    return f"{best_prefix}{best_num + 1:0{width}d}"


def candidate_to_food(cand: dict, today: str | None = None) -> dict:
    entry = {field: cand.get(field, [] if field in LIST_FIELDS else "") for field in FOOD_FIELDS}
    entry["scene"] = list(entry["scene"] or [])
    entry["tags"] = [t for t in (entry["tags"] or []) if t != "negative"]
    entry["addedAt"] = today or date.today().isoformat()
    entry["mentions"] = 1
    return entry


def validation_errors(entry: dict) -> list[str]:
    """检查条目能否安全写入新版网页使用的 foods.json。"""
    errors = []
    for field, label in (("food", "菜名"), ("place", "店名")):
        if not str(entry.get(field) or "").strip():
            errors.append(f"{label}不能为空")
    for field, label in (("protein", "主料"), ("staple", "主食"), ("flavor", "口味")):
        if entry.get(field) not in VOCAB[field]:
            errors.append(f"{label}只能填：{' / '.join(sorted(VOCAB[field]))}")
    price = entry.get("price")
    if isinstance(price, bool) or not isinstance(price, (int, float)) or price < 0:
        errors.append("价格必须是大于等于 0 的数字")
    scene = entry.get("scene")
    if not isinstance(scene, list) or any(v not in VOCAB["scene"] for v in scene):
        errors.append("场景只能填：一个人 / 聚餐 / 带走（可以留空）")
    if not isinstance(entry.get("tags"), list):
        errors.append("标签必须是列表")
    return errors


def merge_food(foods: list[dict], entry: dict) -> tuple[str, dict]:
    """把一条菜品并入清单。返回 ("added" | "merged" | "duplicate", 最终条目)。

    - 店名+菜名已存在：mentions + 1，scene/tags 取并集，空字段用新值补上。
    - 来源链接和已有条目相同：视为同一次提及，不重复累加（"duplicate"）。
    """
    key = food_key(entry)
    for item in foods:
        if food_key(item) != key:
            continue
        if entry.get("sourceUrl") and entry["sourceUrl"] == item.get("sourceUrl"):
            return "duplicate", item
        item["mentions"] = int(item.get("mentions") or 1) + 1
        for field in LIST_FIELDS:
            merged = list(item.get(field) or [])
            merged += [v for v in entry.get(field) or [] if v not in merged]
            item[field] = merged
        for field in FOOD_FIELDS:
            if field not in LIST_FIELDS and item.get(field) in ("", None) and entry.get(field) not in ("", None):
                item[field] = entry[field]
        return "merged", item
    new = dict(entry)
    new["id"] = next_id(foods)
    foods.append(new)
    return "added", new


def reviewable(candidates: list[dict], min_confidence: float) -> list[dict]:
    todo = [
        c for c in candidates
        if c.get("status") == "pending" and c.get("sentiment") != "negative" and c.get("confidence", 0) >= min_confidence
    ]
    return sorted(todo, key=lambda c: c.get("confidence", 0), reverse=True)


# ---------- 交互 ----------


def show(cand: dict, index: int, total: int) -> None:
    print("\n" + "=" * 60)
    print(f"[{index}/{total}] 置信度 {cand.get('confidence')}  {cand.get('kind')} / {cand.get('sentiment')}")
    print(f"原文：{cand.get('excerpt')}")
    print(f"链接：{cand.get('sourceUrl')}   发帖：{cand.get('publishedAt')}")
    print("-" * 60)
    for field in EDITABLE:
        print(f"  {field:8}: {cand.get(field)}")


def ask(prompt: str) -> str:
    try:
        return input(prompt).strip()
    except EOFError:
        return "q"


def edit(cand: dict) -> dict:
    print("逐项修改，直接回车保留原值；列表字段用逗号分隔；输入 - 清空。")
    out = dict(cand)
    for field in EDITABLE:
        current = cand.get(field)
        shown = "，".join(current) if isinstance(current, list) else ("" if current is None else current)
        value = ask(f"  {field} [{shown}]: ")
        if value == "q":
            value = ""
        if not value:
            continue
        if value == "-":
            out[field] = [] if field in LIST_FIELDS else ""
        elif field in LIST_FIELDS:
            out[field] = [v.strip() for v in re.split(r"[,，、]", value) if v.strip()]
        elif field == "price":
            try:
                num = float(value)
                out[field] = int(num) if num.is_integer() else num
            except ValueError:
                out[field] = value
        else:
            out[field] = value
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="审核候选美食，写入 foods.json")
    parser.add_argument("--candidates", default=str(CANDIDATES_FILE))
    parser.add_argument("--foods", default=str(FOODS_FILE))
    parser.add_argument("--min-confidence", type=float, default=0.0)
    args = parser.parse_args()

    cand_path, foods_path = Path(args.candidates), Path(args.foods)
    candidates = load_candidates(cand_path)
    foods, wrapper = load_foods(foods_path)
    todo = reviewable(candidates, args.min_confidence)
    if not todo:
        print("没有待审核的候选。先运行 python scraper/fetch_sohu.py 抓取。")
        return
    print(f"待审核 {len(todo)} 条（踩雷帖已自动排除）。a 通过 / e 修改后通过 / d 丢弃 / s 跳过 / q 退出")

    stats = {"added": 0, "merged": 0, "duplicate": 0, "rejected": 0}
    for i, cand in enumerate(todo, 1):
        show(cand, i, len(todo))
        choice = ask("操作 [a/e/d/s/q]: ").lower()
        if choice == "q":
            break
        if choice == "d":
            cand["status"] = "rejected"
            stats["rejected"] += 1
            continue
        if choice not in ("a", "e"):
            continue
        final = edit(cand) if choice == "e" else cand
        errors = validation_errors(candidate_to_food(final))
        if errors:
            print("  这条还不能进入网页清单，请用 e 补全：")
            for error in errors:
                print(f"  - {error}")
            print("  本次先跳过。")
            continue
        result, item = merge_food(foods, candidate_to_food(final))
        stats[result] += 1
        cand["status"] = "approved"
        cand["foodId"] = item["id"]
        print({"added": f"  已新增 {item['id']}", "merged": f"  已合并到 {item['id']}，mentions = {item['mentions']}",
               "duplicate": f"  {item['id']} 已经记过这个来源，不重复计数"}[result])
        save_foods(foods_path, foods, wrapper)
        save_candidates(cand_path, candidates)

    save_foods(foods_path, foods, wrapper)
    save_candidates(cand_path, candidates)
    print(f"\n完成：新增 {stats['added']}，合并 {stats['merged']}，重复 {stats['duplicate']}，丢弃 {stats['rejected']}")


if __name__ == "__main__":
    main()
