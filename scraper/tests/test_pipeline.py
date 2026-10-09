"""离线测试：不联网，用样例 JSON 检查解析、识别和去重逻辑。

运行：python -m unittest discover -s scraper/tests -v
"""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRAPER = HERE.parent
sys.path.insert(0, str(SCRAPER))

import extract  # noqa: E402
import fetch_sohu  # noqa: E402
import review  # noqa: E402

FIXTURE = json.loads((HERE / "fixtures" / "feed_list_sample.json").read_text(encoding="utf-8"))
KNOWN = {
    extract.normalize("泰煌鸡"): {"place": "泰煌鸡", "address": "上海市宝山区上大路678号"},
    extract.normalize("Fan土耳其烤肉饭"): {"place": "Fan土耳其烤肉饭", "address": "上海市宝山区聚丰园路37号弘基广场"},
}


def fixture_posts():
    return [p for p in (fetch_sohu.feed_to_post(i, "鼠鼠吃饭") for i in FIXTURE["data"]["feedList"]) if p]


class FeedParsingTest(unittest.TestCase):
    def test_skips_top_feed_and_drops_personal_fields(self):
        posts = fixture_posts()
        self.assertEqual(len(posts), 5)
        for post in posts:
            self.assertNotIn("userName", post)
            self.assertNotIn("userId", post)
            self.assertNotIn("avatar", post)
        self.assertEqual(posts[0]["url"], f"{fetch_sohu.CIRCLE_URL}?feedDetail=9000000000000000001")
        self.assertTrue(posts[0]["publishedAt"].startswith("2026-10-09T11:18"))

    def test_cookie_parsing(self):
        cookies = fetch_sohu.parse_cookie_string("a=1; b=x=y; ;c=")
        self.assertEqual([c["name"] for c in cookies], ["a", "b", "c"])
        self.assertEqual(cookies[1]["value"], "x=y")


class ExtractTest(unittest.TestCase):
    def setUp(self):
        self.cands = {c["postId"]: c for c in extract.extract_posts(fixture_posts(), KNOWN)}

    def test_positive_known_place(self):
        c = self.cands["9000000000000000001"]
        self.assertEqual((c["place"], c["food"], c["protein"], c["price"]), ("泰煌鸡", "白斩鸡", "鸡肉", 38))
        self.assertEqual(c["address"], "上海市宝山区上大路678号")
        self.assertEqual(c["sentiment"], "positive")
        self.assertIn("一个人", c["scene"])
        self.assertGreaterEqual(c["confidence"], 0.8)

    def test_negative_is_flagged(self):
        c = self.cands["9000000000000000002"]
        self.assertEqual(c["sentiment"], "negative")
        self.assertIn("negative", c["tags"])

    def test_question_has_low_confidence(self):
        c = self.cands.get("9000000000000000003")
        self.assertIsNotNone(c)
        self.assertEqual(c["kind"], "question")
        self.assertLess(c["confidence"], 0.6)

    def test_non_food_post_is_ignored(self):
        self.assertNotIn("9000000000000000004", self.cands)

    def test_known_place_with_takeaway(self):
        c = self.cands["9000000000000000005"]
        self.assertEqual(c["place"], "Fan土耳其烤肉饭")
        self.assertEqual(c["food"], "土耳其烤肉饭")
        self.assertIn("带走", c["scene"])

    def test_canteen_alias_brand_and_slang(self):
        known = extract.load_known_places(Path("/nonexistent"))
        c = extract.extract_post({"postId": "a", "text": "益新三楼肉夹馍～外瑞古德～"}, known)
        self.assertEqual((c["place"], c["food"], c["sentiment"]), ("益新食堂", "肉夹馍", "positive"))
        c = extract.extract_post({"postId": "b", "text": "想看完去吃海底捞！"}, known)
        self.assertEqual(c["place"], "海底捞")

    def test_staple_and_flavor_follow_dish(self):
        info = extract.analyze_text("去吃饭点了碗不辣的牛肉面", {})
        self.assertEqual((info["staple"], info["protein"], info["flavor"]), ("面", "牛肉", "不辣"))

    def test_place_guess_trims_filler_words(self):
        self.assertEqual(extract.guess_place("但是需要到水秀食堂自提"), "水秀食堂")
        self.assertEqual(extract.guess_place("给大家避雷一家店"), "")
        self.assertEqual(extract.guess_place("店里当时只有我们"), "")

    def test_redacts_phone(self):
        self.assertEqual(extract.redact("联系 13812345678"), "联系 [手机号]")

    def test_merge_candidates_dedup(self):
        first, added1 = extract.merge_candidates([], list(self.cands.values()))
        first[0]["status"] = "approved"
        again, added2 = extract.merge_candidates(first, list(self.cands.values()))
        self.assertEqual(added1, len(self.cands))
        self.assertEqual(added2, 0)
        self.assertEqual(again[0]["status"], "approved")


class ReviewMergeTest(unittest.TestCase):
    def entry(self, place, food, url, **kw):
        cand = {"place": place, "food": food, "sourceUrl": url, "tags": ["推荐"], "scene": [], **kw}
        return review.candidate_to_food(cand, today="2026-10-09")

    def test_fields_and_negative_tag_removed(self):
        e = self.entry("泰煌鸡", "白斩鸡", "u1", tags=["推荐", "negative"])
        self.assertEqual(list(e.keys()), review.FOOD_FIELDS)
        self.assertEqual(e["tags"], ["推荐"])
        self.assertEqual(e["mentions"], 1)

    def test_same_place_and_food_accumulates_mentions(self):
        foods = [{"id": "food-018", "place": "泰煌鸡", "food": "白斩鸡", "sourceUrl": "old", "mentions": 1,
                  "scene": ["一个人"], "tags": ["鸡肉"], "price": None}]
        r1, item = review.merge_food(foods, self.entry("泰煌鸡 ", "白斩鸡", "u1", scene=["聚餐"], price=38))
        self.assertEqual((r1, item["mentions"], len(foods)), ("merged", 2, 1))
        self.assertEqual(item["scene"], ["一个人", "聚餐"])
        self.assertEqual(item["tags"], ["鸡肉", "推荐"])
        self.assertEqual(item["price"], 38)

        r2, _ = review.merge_food(foods, self.entry("泰煌鸡", "白斩鸡", "old"))
        self.assertEqual(r2, "duplicate")
        self.assertEqual(foods[0]["mentions"], 2)

        r3, new = review.merge_food(foods, self.entry("泰煌鸡", "鸡汤面", "u2"))
        self.assertEqual((r3, new["id"]), ("added", "food-019"))

    def test_next_id_empty(self):
        self.assertEqual(review.next_id([]), "food-001")

    def test_reviewable_excludes_negative(self):
        cands = [
            {"status": "pending", "sentiment": "negative", "confidence": 0.9},
            {"status": "pending", "sentiment": "positive", "confidence": 0.5},
            {"status": "approved", "sentiment": "positive", "confidence": 0.9},
        ]
        self.assertEqual(len(review.reviewable(cands, 0)), 1)

    def test_rejects_fields_that_would_break_web_food_schema(self):
        incomplete = self.entry("益新食堂", "肉夹馍", "u1", protein="猪肉", staple="面",
                                flavor="", price=None)
        self.assertIn("口味只能填：不辣 / 清淡 / 辣", review.validation_errors(incomplete))
        self.assertIn("价格必须是大于等于 0 的数字", review.validation_errors(incomplete))

    def test_merges_with_current_web_foods_and_keeps_f_id_format(self):
        """新版清单使用 f001… 编号；审核脚本应接着现有最大编号生成下一条。"""
        foods_path = SCRAPER.parent / "data" / "foods.json"
        foods, wrapper = review.load_foods(foods_path)
        self.assertIsNone(wrapper)
        last_id = foods[-1]["id"]
        nxt = review.next_id(foods)
        self.assertTrue(last_id.startswith("f"))
        self.assertTrue(nxt.startswith("f"))
        self.assertGreater(int(nxt[1:]), int(last_id[1:]))

        copied = [dict(item) for item in foods]
        valid = self.entry(
            "测试小馆", "番茄牛腩饭", "u-new", address="上海大学附近",
            protein="牛肉", staple="米饭", flavor="不辣", price=25,
            scene=["一个人", "带走"],
        )
        self.assertEqual(review.validation_errors(valid), [])
        result, new = review.merge_food(copied, valid)
        self.assertEqual((result, new["id"], len(copied)), ("added", nxt, len(foods) + 1))
        self.assertEqual(list(new.keys()), review.FOOD_FIELDS)


class ReviewCliTest(unittest.TestCase):
    """模拟键盘输入跑一遍 review.py：foods.json 不存在时自动创建。"""

    def test_creates_foods_json_and_marks_status(self):
        cands = extract.extract_posts(fixture_posts(), KNOWN)
        # 模拟人工已经确认并补齐了网页清单要求的字段。
        review.reviewable(cands, 0)[0].update({
            "address": "上海大学附近",
            "protein": "鸡肉",
            "staple": "米饭",
            "flavor": "不辣",
            "price": 25,
            "scene": ["一个人"],
        })
        with tempfile.TemporaryDirectory() as tmp:
            cand_path, foods_path = Path(tmp) / "candidates.json", Path(tmp) / "foods.json"
            cand_path.write_text(json.dumps(cands, ensure_ascii=False), encoding="utf-8")
            # 按置信度排序后：第 1 条通过，第 2 条丢弃，然后退出
            proc = subprocess.run(
                [sys.executable, str(SCRAPER / "review.py"), "--candidates", str(cand_path), "--foods", str(foods_path)],
                input="a\nd\nq\n", capture_output=True, text=True, timeout=30,
            )
            self.assertEqual(proc.returncode, 0, proc.stderr)
            foods = json.loads(foods_path.read_text(encoding="utf-8"))
            self.assertEqual(len(foods), 1)
            self.assertEqual(foods[0]["id"], "food-001")
            self.assertEqual(list(foods[0].keys()), review.FOOD_FIELDS)
            statuses = sorted(c["status"] for c in json.loads(cand_path.read_text(encoding="utf-8")))
            self.assertEqual(statuses.count("approved"), 1)
            self.assertEqual(statuses.count("rejected"), 1)


if __name__ == "__main__":
    unittest.main()
