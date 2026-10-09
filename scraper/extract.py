"""从狐友帖子文本里识别美食信息，生成待审核的候选条目。

只用关键词词典 + 已知店名表做匹配，不依赖任何联网服务。
可以单独运行：python scraper/extract.py "宝山水秀的烧腊饭好吃，20块管饱"
"""

from __future__ import annotations

import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

# ---------- 词典（改词典不用动逻辑） ----------

# 判断“和吃有关”的词；“推荐”“面”这类太泛的词不放这里，否则选课帖、见面帖都会混进来
FOOD_WORDS = [
    "好吃", "难吃", "饭", "吃", "饿", "外卖", "面条", "米粉", "粉丝",
    "食堂", "餐厅", "宵夜", "夜宵", "早饭", "早餐", "午饭", "晚饭", "奶茶", "咖啡", "火锅", "烧烤",
    "小吃", "甜品", "蛋糕", "汉堡", "披萨", "炸鸡", "烤肉", "拌饭", "盖浇", "麻辣烫", "冒菜",
    "烧腊", "叉烧", "饿了么", "美团", "菜单", "份量", "口味", "下饭",
]

# 具体菜名/品类，按长度从长到短匹配，优先识别更具体的词
DISH_WORDS = [
    "土耳其烤肉饭", "铁锅炖", "猪脚饭", "烧腊饭", "叉烧饭", "烧鹅饭", "黄焖鸡", "麻辣香锅", "麻辣烫",
    "酸菜鱼", "烤鱼", "小龙虾", "牛肉面", "牛肉粉", "螺蛳粉", "米线", "拉面", "刀削面", "小面",
    "馄饨", "饺子", "生煎", "小笼", "包子", "煎饼", "肉夹馍", "凉皮", "拌饭", "盖浇饭", "炒饭",
    "煲仔饭", "猪排饭", "咖喱饭", "鸡排", "炸鸡", "汉堡", "披萨", "寿司", "拉面", "烤肉", "烧烤",
    "串串", "火锅", "冒菜", "白斩鸡", "烧腊", "叉烧", "腊肠", "烧鹅", "牛排", "意面", "沙拉",
    "轻食", "奶茶", "咖啡", "蛋糕", "甜品", "冰沙", "椰子冻", "豆花", "酸辣粉", "米粉", "河粉",
    "肠粉", "粥", "面包", "鸭血粉丝", "臭豆腐", "炒面", "炒粉", "毛血旺", "水煮鱼", "烤串",
]
DISH_WORDS = sorted(set(DISH_WORDS), key=len, reverse=True)

POSITIVE_WORDS = [
    "好吃", "推荐", "安利", "必吃", "绝了", "香", "管饱", "实惠", "划算", "值得", "宝藏", "爱吃", "回购",
    "yyds", "不错", "外瑞古德", "very good", "好喝", "绝绝子", "封神",
]
NEGATIVE_WORDS = ["难吃", "踩雷", "避雷", "排雷", "拉肚子", "不新鲜", "坑", "别去", "一般般", "失望", "份量少", "份量锐减", "太贵", "恶心", "头发", "虫"]
# 强提问词出现就算求推荐帖（“有啥好吃的”里的“好吃”不算好评）；弱提问词只在没有好评词时才算
STRONG_QUESTION_WORDS = ["有啥", "有什么", "有没有", "求推荐", "推荐一下", "哪家", "哪里有", "还能吃什么"]
WEAK_QUESTION_WORDS = ["吗", "嘛", "？", "?"]

# 映射到问答网页的固定取值
PROTEIN_MAP = {
    "牛肉": ["牛肉", "牛排", "吊龙", "毛肚", "牛腩", "肥牛", "安格斯", "皇堡"],
    "鸡肉": ["鸡", "鸡排", "炸鸡", "黄焖鸡", "白斩鸡", "鸡腿"],
    "猪肉": ["猪", "排骨", "叉烧", "腊肠", "五花", "猪脚", "猪排", "肉夹馍", "生煎", "小笼"],
    "鱼虾": ["鱼", "虾", "蟹", "海鲜", "金枪鱼", "寿司"],
    "素食": ["素", "蔬菜", "豆腐", "沙拉", "轻食"],
}
STAPLE_MAP = {
    "米饭": ["饭", "盖浇", "拌饭", "煲仔"],
    "面": ["面", "馄饨", "饺子", "肉夹馍", "包子", "煎饼"],
    "粉": ["粉", "米线"],
    "汉堡披萨": ["汉堡", "披萨", "皇堡"],
}
FLAVOR_MAP = {
    "不辣": ["不辣", "免辣", "不吃辣"],
    "辣": ["辣", "麻辣", "香辣", "红油", "火锅", "冒菜", "麻辣烫", "螺蛳粉"],
    "清淡": ["清淡", "不油", "不烧心", "养胃", "粥", "白斩鸡", "清汤"],
}
SCENE_MAP = {
    "一个人": ["一个人", "一人食", "单人", "自己吃"],
    "聚餐": ["聚餐", "聚会", "朋友", "室友", "多人", "生日", "火锅", "铁锅炖", "烧烤"],
    "带走": ["打包", "带走", "外卖", "外带", "回寝"],
}

# 常见连锁品牌，当作已知店名（地址留空，审核时补）
CHAIN_BRANDS = [
    "海底捞", "肯德基", "麦当劳", "汉堡王", "塔斯汀", "华莱士", "必胜客", "达美乐", "萨莉亚", "星巴克", "瑞幸",
    "库迪", "喜茶", "奈雪", "蜜雪冰城", "霸王茶姬", "茶百道", "古茗", "沪上阿姨", "老乡鸡", "米村拌饭",
    "杨国福", "张亮麻辣烫", "南城香", "吉野家", "味千拉面", "和府捞面", "西贝", "绿茶餐厅", "外婆家",
]

# 地点线索：（帖子里的叫法, 规范名），按顺序匹配，长的放前面
LOCATIONS = [
    ("南区食堂", "南区食堂"), ("北区食堂", "北区食堂"), ("东区食堂", "东区食堂"), ("西区食堂", "西区食堂"),
    ("尔美食堂", "尔美食堂"), ("山明食堂", "山明食堂"), ("益新食堂", "益新食堂"), ("水秀食堂", "水秀食堂"),
    ("尔美", "尔美食堂"), ("山明", "山明食堂"), ("益新", "益新食堂"), ("水秀", "水秀食堂"),
    ("新世纪", "新世纪"), ("经纬汇", "经纬汇"), ("弘基广场", "弘基广场"), ("宏基广场", "弘基广场"), ("弘基", "弘基广场"),
    ("聚丰园路", "聚丰园路"), ("上大路", "上大路"), ("大场", "大场"), ("宝山万达", "宝山万达"),
    ("嘉定", "嘉定校区"), ("延长", "延长校区"), ("宝山", "宝山校区"),
]
PLACE_SUFFIX = r"(?:店|馆|餐厅|食府|小馆|面馆|饭店|酒家|食堂|饭庄|酒楼|大排档|排档)"
PLACE_PATTERN = re.compile(r"([\u4e00-\u9fa5A-Za-z0-9]{1,10})(" + PLACE_SUFFIX + r")")
# 店名前面常粘着的口语，切到最后一个这样的词之后，例如“但是需要到水秀食堂” -> “水秀食堂”
PLACE_PREFIX_CUT = re.compile(
    r".*(?:的|了|到|在|是|去|和|跟|给|这|那|一家|有家|家|避雷|排雷|推荐|安利|大家|对面|门口|旁边|附近|楼下|东门|西门|南门|北门|校区|吃|点)"
)
PLACE_PREFIX_REJECT = (
    "目前", "进", "每", "某", "哪", "什么", "新开", "开", "个", "整", "本", "该", "此",
    "当时", "今天", "昨天", "上次", "那个", "这个", "里",
)
# 出现这些词且没识别出具体菜名时，基本不是吃的帖子
NON_FOOD_WORDS = ["理发", "剪头", "快递", "租房", "房东", "健身房", "驾校", "打印", "代取", "家教", "二手", "转卖", "转让"]
PRICE_PATTERN = re.compile(r"(\d{1,3}(?:\.\d)?)\s*(?:元|块|r|💰|rmb)", re.I)

# 去掉可能的个人信息：手机号、微信号、@某人
PRIVATE_PATTERNS = [
    (re.compile(r"1[3-9]\d{9}"), "[手机号]"),
    (re.compile(r"(?:微信|vx|v信|wx|VX|WX)[:：\s]*[A-Za-z0-9_-]{5,}"), "[联系方式]"),
    (re.compile(r"@[^\s@，,。]{1,20}"), "@某人"),
    (re.compile(r"\d{5,}"), "[数字]"),
]

# ---------- 工具函数 ----------


def normalize(text: str) -> str:
    """店名/菜名比较用：去空格、括号内容和标点，统一小写。"""
    text = re.sub(r"[（(][^）)]*[）)]", "", text or "")
    return re.sub(r"[\s·・,，。.!！?？'\"“”-]", "", text).lower()


def redact(text: str) -> str:
    for pattern, repl in PRIVATE_PATTERNS:
        text = pattern.sub(repl, text)
    return text


def clean_text(text: str) -> str:
    text = re.sub(r"\[[^\]]{1,6}\]", "", text or "")  # 表情 [捂脸]
    text = re.sub(r"#[^#\s]{1,20}#?", " ", text)  # 话题标签
    return re.sub(r"\s+", " ", text).strip()


def _first_match(text: str, mapping: dict[str, list[str]]) -> str:
    for value, words in mapping.items():
        if any(w in text for w in words):
            return value
    return ""


def _all_matches(text: str, mapping: dict[str, list[str]]) -> list[str]:
    return [value for value, words in mapping.items() if any(w in text for w in words)]


def load_known_places(data_dir: Path = DATA_DIR) -> dict[str, dict]:
    """已知店名表：来自 data/foods.json，没有的话退回旧的 data/foods.csv。

    返回 {规范化店名: {"place": 原店名, "address": 地址}}。
    """
    places: dict[str, dict] = {}
    foods_json = data_dir / "foods.json"
    if foods_json.exists():
        raw = json.loads(foods_json.read_text(encoding="utf-8") or "[]")
        items = raw.get("foods", []) if isinstance(raw, dict) else raw
        for item in items:
            if item.get("place"):
                places[normalize(item["place"])] = {"place": item["place"], "address": item.get("address", "")}
    foods_csv = data_dir / "foods.csv"
    if foods_csv.exists():
        with foods_csv.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                name = row.get("place_name", "")
                if name and normalize(name) not in places:
                    places[normalize(name)] = {"place": name, "address": row.get("address", "")}
    for brand in CHAIN_BRANDS:
        places.setdefault(normalize(brand), {"place": brand, "address": ""})
    return places


def _match_known_place(text: str, known_places: dict[str, dict]) -> dict | None:
    norm_text = normalize(text)
    best = None
    for key, info in known_places.items():
        short = normalize(re.sub(r"[（(].*", "", info["place"]))
        for candidate in {key, short}:
            if len(candidate) >= 2 and candidate in norm_text:
                if best is None or len(candidate) > best[0]:
                    best = (len(candidate), info)
    return best[1] if best else None


def guess_place(text: str) -> str:
    """没有命中已知店名时，按“xx店/xx馆/xx食堂”的样子猜店名，猜不准就返回空。"""
    for m in PLACE_PATTERN.finditer(text):
        prefix, suffix = PLACE_PREFIX_CUT.sub("", m.group(1)), m.group(2)
        if len(prefix) < 2 or prefix.endswith(PLACE_PREFIX_REJECT) or prefix.startswith(PLACE_PREFIX_REJECT):
            continue
        return prefix + suffix
    return ""


# ---------- 主逻辑 ----------


def analyze_text(text: str, known_places: dict[str, dict] | None = None) -> dict:
    """分析一段文字，返回识别出的字段和信号（不判断是否收录）。"""
    known_places = known_places or {}
    text = clean_text(text)
    known = _match_known_place(text, known_places)
    place = known["place"] if known else ""
    address = known["address"] if known else ""
    if not place:
        place = guess_place(text)
    location = next((canon for alias, canon in LOCATIONS if alias in text), "")
    if location and place and location not in place and place not in location and not address:
        place = f"{place}（{location}）"
    elif location and not place:
        place = location

    dish = next((d for d in DISH_WORDS if d in text), "")
    price_m = PRICE_PATTERN.search(text)
    price = float(price_m.group(1)) if price_m else None
    if price is not None and price.is_integer():
        price = int(price)

    positive = [w for w in POSITIVE_WORDS if w in text]
    negative = [w for w in NEGATIVE_WORDS if w in text]
    food_hits = [w for w in FOOD_WORDS if w in text]
    is_question = any(w in text for w in STRONG_QUESTION_WORDS) or (
        any(w in text for w in WEAK_QUESTION_WORDS) and not positive and not negative
    )
    if is_question:
        positive = []

    flavor = _first_match(text, {"不辣": FLAVOR_MAP["不辣"]}) or _first_match(dish, FLAVOR_MAP) or _first_match(text, FLAVOR_MAP)

    return {
        "text": text,
        "food": dish,
        "place": place,
        "address": address,
        "knownPlace": bool(known),
        "protein": _first_match(dish, PROTEIN_MAP) or _first_match(text, PROTEIN_MAP),
        "staple": _first_match(dish, STAPLE_MAP) or _first_match(text, STAPLE_MAP),
        "flavor": flavor,
        "price": price,
        "scene": _all_matches(text, SCENE_MAP),
        "positive": positive,
        "negative": negative,
        "foodHits": food_hits,
        "isQuestion": is_question,
    }


def score(info: dict) -> float:
    s = 0.0
    if info["knownPlace"]:
        s += 0.35
    elif info["place"]:
        s += 0.15
    if info["food"]:
        s += 0.25
    if info["positive"] or info["negative"]:
        s += 0.2
    if info["foodHits"]:
        s += 0.1
    if info["price"] is not None:
        s += 0.1
    if info["isQuestion"]:
        s -= 0.2
    return round(max(0.0, min(1.0, s)), 2)


def extract_post(post: dict, known_places: dict[str, dict] | None = None, min_confidence: float = 0.3) -> dict | None:
    """把一条帖子（或评论）转成候选条目；与美食无关时返回 None。

    post 至少要有：postId, text, url；可选 publishedAt, board, commentId。
    """
    info = analyze_text(post.get("text", ""), known_places)
    if not info["foodHits"] and not info["food"]:
        return None
    if not info["food"] and any(w in info["text"] for w in NON_FOOD_WORDS):
        return None
    confidence = score(info)
    if confidence < min_confidence:
        return None

    if info["negative"] and len(info["negative"]) >= len(info["positive"]):
        sentiment = "negative"
    elif info["positive"]:
        sentiment = "positive"
    else:
        sentiment = "neutral"

    tags = sorted(set(([info["food"]] if info["food"] else []) + info["scene"]))
    if sentiment == "negative":
        tags.append("negative")
    kind = "question" if info["isQuestion"] else ("review" if sentiment != "neutral" else "mention")

    candidate_id = str(post["postId"]) + (f"-c{post['commentId']}" if post.get("commentId") else "")
    excerpt = redact(info["text"])[:120]
    board = post.get("board") or ""
    return {
        "candidateId": candidate_id,
        "postId": str(post["postId"]),
        "status": "pending",
        "sentiment": sentiment,
        "kind": kind,
        "confidence": confidence,
        "food": info["food"],
        "place": info["place"],
        "address": info["address"],
        "protein": info["protein"],
        "staple": info["staple"],
        "flavor": info["flavor"],
        "price": info["price"],
        "scene": info["scene"],
        "tags": tags,
        "reason": excerpt[:60],
        "excerpt": excerpt,
        "source": "狐友·上海大学圈" + (f"/{board}" if board else "") + ("（评论）" if post.get("commentId") else ""),
        "sourceUrl": post.get("url", ""),
        "publishedAt": post.get("publishedAt", ""),
        "extractedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def extract_posts(posts: list[dict], known_places: dict[str, dict] | None = None, min_confidence: float = 0.3) -> list[dict]:
    if known_places is None:
        known_places = load_known_places()
    out = []
    for post in posts:
        cand = extract_post(post, known_places, min_confidence)
        if cand:
            out.append(cand)
    return out


def merge_candidates(existing: list[dict], new: list[dict]) -> tuple[list[dict], int]:
    """按 candidateId 去重追加，已有的（包括已审核的）不覆盖。返回 (合并后列表, 新增数)。"""
    seen = {c["candidateId"] for c in existing}
    added = 0
    merged = list(existing)
    for cand in new:
        if cand["candidateId"] not in seen:
            merged.append(cand)
            seen.add(cand["candidateId"])
            added += 1
    return merged, added


if __name__ == "__main__":
    sample = " ".join(sys.argv[1:]) or "宝山附近有啥好吃不烧心的猪脚饭嘛"
    result = extract_post({"postId": "demo", "text": sample, "url": ""}, load_known_places(), min_confidence=0)
    print(json.dumps(result or analyze_text(sample), ensure_ascii=False, indent=2))
