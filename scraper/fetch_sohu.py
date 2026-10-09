"""抓取狐友“上海大学”圈里的美食帖，写入 data/candidates.json 待审核。

做法：用 Playwright 打开圈子网页，点开板块标签、向下滚动；
页面自己会去请求 /v8/circle/feed/list 接口（接口带签名，没法直接拼 URL），
脚本只是“旁听”这些接口返回的 JSON，从里面取帖子正文、发帖时间和链接。

只保存美食相关字段，不保存用户名、头像、用户 ID 等个人信息。

用法：
    python scraper/fetch_sohu.py                      # 默认抓“鼠鼠吃饭”和“校外商户排雷”
    python scraper/fetch_sohu.py --boards 全部 --max-pages 3
    python scraper/fetch_sohu.py --comments           # 需要 SOHU_COOKIE，顺带抓求推荐帖的评论
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
import extract  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CANDIDATES_FILE = DATA_DIR / "candidates.json"
SEEN_FILE = DATA_DIR / "seen_posts.json"

CIRCLE_ID = "826522127825056896"  # 上海大学圈
CIRCLE_URL = f"https://w.sohu.com/circle/{CIRCLE_ID}"
BOARDS = {
    "鼠鼠吃饭": "1288219670771609088",
    "校外商户排雷": "1144750393818032768",
    "全部": "",  # 圈子首页“新发”信息流
}
FEED_API = "/v8/circle/feed/list"
COMMENT_API = "/v8/comment/list"
CN_TZ = timezone(timedelta(hours=8))


# ---------- Cookie ----------


def load_cookie_string() -> str:
    """优先读环境变量 SOHU_COOKIE，其次读仓库根目录或 scraper/ 下的 .env。"""
    value = os.environ.get("SOHU_COOKIE", "").strip()
    if value:
        return value
    for env_file in (ROOT / ".env", Path(__file__).resolve().parent / ".env"):
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("SOHU_COOKIE="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def parse_cookie_string(cookie: str) -> list[dict]:
    """把浏览器复制的 'a=1; b=2' 转成 Playwright 需要的格式。"""
    cookies = []
    for part in cookie.split(";"):
        if "=" not in part:
            continue
        name, value = part.strip().split("=", 1)
        if name:
            cookies.append({"name": name, "value": value, "domain": ".sohu.com", "path": "/"})
    return cookies


# ---------- 数据读写 ----------


def read_json(path: Path, default):
    if path.exists() and path.read_text(encoding="utf-8").strip():
        return json.loads(path.read_text(encoding="utf-8"))
    return default


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_seen(path: Path = SEEN_FILE) -> dict:
    data = read_json(path, {})
    data.setdefault("posts", {})
    return data


def feed_to_post(item: dict, board_name: str) -> dict | None:
    """把接口里的一条 feed 转成只含必要字段的帖子。"""
    feed = item.get("sourceFeed") or {}
    feed_id = feed.get("feedId")
    if not feed_id or feed.get("isTopFeed") or feed.get("isPaidTopFeed"):
        return None
    score = feed.get("score")
    published = ""
    if isinstance(score, (int, float)) and abs(score) > 1e12:
        published = datetime.fromtimestamp(abs(score) / 1000, CN_TZ).isoformat(timespec="minutes")
    return {
        "postId": str(feed_id),
        "text": feed.get("content") or "",
        "publishedAt": published,
        "url": f"{CIRCLE_URL}?feedDetail={feed_id}",
        "board": board_name if board_name != "全部" else "",
        "commentCount": feed.get("commentCount") or 0,
    }


def comments_to_posts(payload: dict, post: dict) -> list[dict]:
    data = payload.get("data") or {}
    items = data.get("list") or data.get("commentList") or []
    out = []
    for c in items:
        text = c.get("content") or (c.get("comment") or {}).get("content") or ""
        cid = c.get("commentId") or (c.get("comment") or {}).get("commentId")
        if text and cid:
            out.append({**post, "commentId": str(cid), "text": text})
    return out


# ---------- 抓取 ----------


async def polite_wait(delay: float) -> None:
    await asyncio.sleep(delay + random.uniform(0, delay / 2))


async def fetch_board(page, board_name: str, max_pages: int, delay: float) -> list[dict]:
    board_id = BOARDS[board_name]
    # 一次滚动可能连续触发好几页请求，所以用监听器全部收下，按翻页游标 score 去重
    pages: dict[str, dict] = {}

    def is_board_feed(resp) -> bool:
        if FEED_API not in resp.url or resp.status != 200:
            return False
        has_board = f"board_id={board_id}" in resp.url
        return has_board if board_id else "board_id=" not in resp.url

    async def on_response(resp) -> None:
        if is_board_feed(resp):
            cursor = parse_qs(urlparse(resp.url).query).get("score", [""])[0]
            try:
                pages.setdefault(cursor, await resp.json())
            except Exception:  # noqa: BLE001
                pass

    page.on("response", on_response)
    try:
        if board_id:
            await page.get_by_role("tab", name=board_name).click()
        else:
            await page.reload()
        for _ in range(40):
            if pages:
                break
            await page.wait_for_timeout(500)
        if not pages:
            print(f"  [{board_name}] 第一页没拿到")
            return []

        stalls = 0
        while len(pages) < max_pages and stalls < 3:
            last = list(pages.values())[-1]
            if not ((last.get("data") or {}).get("pageInfo") or {}).get("hasMore", False):
                break
            before = len(pages)
            await polite_wait(delay)
            for _ in range(6):
                await page.mouse.wheel(0, 3000)
                await page.wait_for_timeout(400)
            await page.wait_for_timeout(1500)
            stalls = stalls + 1 if len(pages) == before else 0
        if stalls >= 3:
            print(f"  [{board_name}] 滚动后没有加载出更多，停止")
    finally:
        page.remove_listener("response", on_response)

    posts = []
    for payload in list(pages.values())[:max_pages]:
        for item in (payload.get("data") or {}).get("feedList") or []:
            post = feed_to_post(item, board_name)
            if post:
                posts.append(post)
    print(f"  [{board_name}] 抓到 {len(pages)} 页、{len(posts)} 条帖子")
    return posts


async def fetch_comments(page, post: dict, delay: float) -> list[dict]:
    await polite_wait(delay)
    try:
        async with page.expect_response(lambda r: COMMENT_API in r.url and post["postId"] in r.url, timeout=20000) as info:
            await page.goto(post["url"])
        return comments_to_posts(await (await info.value).json(), post)
    except Exception as exc:  # noqa: BLE001
        print(f"  评论没拿到 {post['postId']}：{exc}")
        return []


async def run(args) -> None:
    from playwright.async_api import async_playwright

    cookie = load_cookie_string()
    if args.comments and not cookie:
        print("提示：评论内容需要登录才能看到，没有 SOHU_COOKIE，跳过评论。")
        args.comments = False
    print("登录状态：" + ("已带 SOHU_COOKIE" if cookie else "未登录（帖子列表可以匿名看）"))

    seen = load_seen(Path(args.seen))
    known_places = extract.load_known_places()
    all_posts: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not args.headful)
        context = await browser.new_context(locale="zh-CN", viewport={"width": 1280, "height": 900})
        if cookie:
            await context.add_cookies(parse_cookie_string(cookie))
        page = await context.new_page()
        await page.goto(CIRCLE_URL, wait_until="networkidle")

        for board_name in args.boards:
            if board_name not in BOARDS:
                print(f"未知板块：{board_name}，可选：{'、'.join(BOARDS)}")
                continue
            all_posts += await fetch_board(page, board_name, args.max_pages, args.delay)
            await polite_wait(args.delay)

        unique: dict[str, dict] = {}
        for post in all_posts:
            unique.setdefault(post["postId"], post)
        new_posts = [p for p in unique.values() if p["postId"] not in seen["posts"]][: args.max_posts]
        print(f"去重后 {len(unique)} 条，其中新帖 {len(new_posts)} 条（上限 {args.max_posts}）")

        inputs = list(new_posts)
        if args.comments:
            askers = [
                p for p in new_posts
                if p["commentCount"] and extract.analyze_text(p["text"], known_places)["foodHits"]
            ][: args.max_comment_posts]
            for post in askers:
                inputs += await fetch_comments(page, post, args.delay)
        await browser.close()

    candidates = extract.extract_posts(inputs, known_places, args.min_confidence)
    existing = read_json(Path(args.out), [])
    merged, added = extract.merge_candidates(existing, candidates)

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for post in new_posts:
        seen["posts"][post["postId"]] = now
    seen["updatedAt"] = now

    if args.dry_run:
        print(json.dumps(candidates, ensure_ascii=False, indent=2))
        print(f"[试运行] 识别出 {len(candidates)} 条候选，未写文件")
        return
    write_json(Path(args.out), merged)
    write_json(Path(args.seen), seen)
    neg = sum(1 for c in candidates if c["sentiment"] == "negative")
    print(f"识别出 {len(candidates)} 条候选（其中踩雷 {neg} 条），新增 {added} 条到 {args.out}")
    print("下一步：python scraper/review.py 逐条审核")


def main() -> None:
    parser = argparse.ArgumentParser(description="抓取狐友上海大学圈美食帖")
    parser.add_argument("--boards", nargs="+", default=["鼠鼠吃饭", "校外商户排雷"], help=f"板块名，可选：{'、'.join(BOARDS)}")
    parser.add_argument("--max-pages", type=int, default=5, help="每个板块最多翻几页（每页 20 条）")
    parser.add_argument("--max-posts", type=int, default=200, help="本次最多处理多少条新帖")
    parser.add_argument("--delay", type=float, default=3.0, help="两次请求之间至少等几秒")
    parser.add_argument("--min-confidence", type=float, default=0.3, help="低于这个置信度的不进候选")
    parser.add_argument("--comments", action="store_true", help="顺带抓美食帖的评论（需要 SOHU_COOKIE）")
    parser.add_argument("--max-comment-posts", type=int, default=10, help="最多抓多少条帖子的评论")
    parser.add_argument("--out", default=str(CANDIDATES_FILE))
    parser.add_argument("--seen", default=str(SEEN_FILE))
    parser.add_argument("--headful", action="store_true", help="显示浏览器窗口，方便观察")
    parser.add_argument("--dry-run", action="store_true", help="只打印结果，不写文件")
    asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    main()
