# 鼠鼠吃饭 · 上大周边今天吃什么

一个小网页：回答 5 个小问题（想吃什么肉、主食、口味、预算、怎么吃），每选一个词就有一颗写着字的小球掉进“口味罐”，最后点“摇一摇”，罐子晃一晃，弹出一道**具体的菜**推荐给你——菜名、店名、地址、人均、推荐理由都有。

- 不用安装任何东西，也不用“编译”，就是几个普通文件。
- 数据就是一个文件：`data/foods.json`。想加菜，改它就行。
- 可以免费放到 GitHub Pages 上，生成一个网址发给同学。

> 旧版（Next.js + Supabase + 微信小程序）已经存档在 tag `v0-nextjs-archive`，随时能找回，见文末。

---

## 一、在自己电脑上打开看看

浏览器出于安全原因，**直接双击 `index.html` 会读不到菜单文件**（页面会提示你）。所以需要开一个“本地小服务器”，只要一行命令。

### 方法 A：用 Python（Mac 和大多数电脑自带）

1. 打开“终端”（Windows 叫“命令提示符”或 PowerShell）。
2. 进入项目文件夹。比如项目在桌面上：
   ```bash
   cd ~/Desktop/shushu-food
   ```
3. 输入下面这行，回车：
   ```bash
   python3 -m http.server 8000
   ```
   Windows 上如果提示找不到 `python3`，改成 `python -m http.server 8000`。
4. 打开浏览器，访问 <http://localhost:8000>。
5. 用完了，回到终端按 `Ctrl + C` 关掉。

### 方法 B：用 VS Code / Cursor 的插件

安装 “Live Server” 插件，右键 `index.html` → “Open with Live Server”。

### 想看手机效果？

在电脑浏览器里按 `F12` 打开开发者工具，点左上角的“手机”图标，就能模拟手机屏幕。

---

## 二、文件都是干什么的

```text
index.html         网页的骨架（标题、题目区、罐子区、结果卡片）
style.css          颜色、圆角、按钮动画等外观
app.js             流程：一题一题地问 → 小球入罐 → 摇一摇 → 出结果
jar.js             口味罐：小球的物理效果（弹跳、碰撞、摇晃）
recommend.js       推荐算法：根据你的选择挑一道菜
questions.js       题目和选项（想改问题只改这里）
data/foods.json    美食清单（想加菜只改这里）
tests/             自动测试，检查推荐算法和清单格式对不对
docs/food-list-guide.md   怎样把清单越做越好
```

小球的物理效果用的是 [Matter.js](https://brm.io/matter-js/)，通过网络（CDN）引入；字体用系统字体。如果 Matter.js 打不开，罐子会变成简单的彩色标签。

前端交互规范来自 [emilkowalski/skills](https://github.com/emilkowalski/skills)，已装在 `.cursor/skills/`（Cursor 用）和 `.agents/skills/`（`npx skills add` 的默认路径）。

---

## 三、加一道菜

打开 `data/foods.json`，照着已有的格式，在最后一个 `}` 后面加一个逗号，再粘一段新的：

```json
{
  "id": "f019",
  "food": "番茄牛腩饭",
  "place": "某某小馆",
  "address": "上海市宝山区上大路 xxx 号",
  "protein": "牛肉",
  "staple": "米饭",
  "flavor": "不辣",
  "price": 25,
  "scene": ["一个人", "带走"],
  "tags": ["牛肉", "米饭", "番茄"],
  "reason": "番茄汤汁很下饭，牛腩炖得软。",
  "source": "朋友推荐",
  "sourceUrl": "",
  "addedAt": "2026-10-09",
  "mentions": 1
}
```

每个字段的意思：

| 字段 | 意思 | 只能填这些 |
|---|---|---|
| `id` | 编号，不能和别的重复 | 比如 `f019` |
| `food` | 菜名 | |
| `place` / `address` | 店名 / 地址 | |
| `protein` | 主料 | 牛肉、鸡肉、猪肉、鱼虾、素食、其他 |
| `staple` | 主食 | 米饭、面、粉、汉堡披萨、其他 |
| `flavor` | 口味 | 辣、不辣、清淡 |
| `price` | 人均多少元（填数字，不加引号） | |
| `scene` | 适合怎么吃（可以多选） | 一个人、聚餐、带走 |
| `tags` | 结果卡片上显示的小标签 | 随便写 |
| `reason` | 推荐理由 | |
| `source` / `sourceUrl` | 谁推荐的 / 原帖链接（没有就留 `""`） | |
| `addedAt` | 加进来的日期 | |
| `mentions` | 被几个人推荐过，越大越容易被抽中 | 数字 |

改完以后跑一下测试（见第五节），它会帮你检查有没有填错。

**小提示**：JSON 很挑剔——字符串要用英文双引号 `"`，最后一项后面不能有逗号。改错了网页会显示“菜单没加载出来”，用测试命令能看到具体哪儿错了。

---

## 四、改题目

打开 `questions.js`，每道题长这样：

```js
{
  id: "flavor",          // 题目编号
  name: "口味",          // 简称，结果页说“放宽了口味”时用
  field: "flavor",       // 对应 foods.json 里的哪个字段
  title: "口味偏好？",    // 题目文字
  color: "#FF4D6D",      // 这道题小球的颜色
  relaxRank: 2,          // 找不到菜时的放宽顺序，数字越大越先放宽
  options: [
    { label: "辣", value: "辣", icon: "🌶️" },
    ...
  ]
}
```

每道题都会自动加上“其他”和“都可以”。选了这两个，这道题就不参与筛选。

---

## 五、推荐是怎么算的

1. 选了“其他”或“都可以”的题不管。
2. 先找**所有条件都符合**的菜，从里面随机挑一道（`mentions` 越大，越容易被抽到）。
3. 一道都没有？就按 `relaxRank` 从大到小，一条一条放宽（默认先放宽“场景”，再“预算”“主食”“口味”，最后才放宽“主料”），直到找到为止。结果页会告诉你放宽了哪一条。
4. 点“换一个”，会跳过已经看过的菜；全看完了就重新开始。

### 跑测试

需要装 [Node.js](https://nodejs.org/)（选 LTS 版本，一路下一步即可）。然后在项目文件夹里运行：

```bash
node --test
```

看到 `pass 9`、`fail 0` 就说明一切正常。每次推送到 GitHub，也会自动跑一遍（在仓库的 Actions 页面能看到）。

---

## 六、发布成公开网址（GitHub Pages）

1. 打开 GitHub 上的仓库页面，点上方的 **Settings（设置）**。
2. 左边栏找到 **Pages**。
3. “Build and deployment” 下面，**Source** 选 **Deploy from a branch**。
4. **Branch** 选 `main`，文件夹选 `/ (root)`，点 **Save**。
5. 等一两分钟刷新，页面顶部会出现网址，类似 `https://lumine0n.github.io/shushu-food/`。把它发给同学就行。

以后每次把改动合并到 `main`，网页会自动更新。

---

## 七、部署到腾讯云

这是纯静态网站：把仓库根目录里的 `index.html`、`style.css`、几个 `.js` 和 `data/foods.json` 放到服务器上，用 nginx 当网页服务器即可。不需要 Node 构建，也不需要数据库。

下面用占位符 `YOUR_DOMAIN` 代表你自己的域名。还没有域名和服务器登录信息时，先照着准备，拿到后再替换。

### 1. 把代码放到服务器

用 SSH 登录云服务器后：

```bash
sudo mkdir -p /var/www
sudo git clone https://github.com/Lumine0n/shushu-food.git /var/www/shushu-food
cd /var/www/shushu-food
sudo git checkout main
```

以后更新网站，进这个目录再执行一次 `sudo git pull`。

### 2. 安装 nginx 和证书工具

以常见的 Ubuntu 为例：

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

把示例配置拷过去，并把里面的 `YOUR_DOMAIN` 换成真实域名：

```bash
sudo cp /var/www/shushu-food/deploy/nginx.conf.example /etc/nginx/sites-available/shushu-food
sudo nano /etc/nginx/sites-available/shushu-food
sudo ln -s /etc/nginx/sites-available/shushu-food /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

完整示例见 [deploy/nginx.conf.example](deploy/nginx.conf.example)。它会：

- 用仓库根目录当网站根目录
- 把 HTTP 跳到 HTTPS
- 开启 gzip
- 给 `.js` / `.css` / `.json` 缓存 7 天

### 3. 域名解析和 HTTPS

1. 在域名服务商那里，把 `YOUR_DOMAIN` 的 A 记录指到这台腾讯云服务器的公网 IP。
2. 安全组放行 80 和 443 端口。
3. 申请免费证书（Let’s Encrypt）：

```bash
sudo certbot --nginx -d YOUR_DOMAIN
```

按提示填邮箱、同意条款。成功后浏览器打开 `https://YOUR_DOMAIN` 就能用。证书大约每 90 天到期，certbot 一般会自动续期。

---

## 八、从狐友“上海大学圈”收集美食

`scraper/` 里已经有一套抓取和人工审核工具：

```text
狐友公开帖子 → data/candidates.json（待审核）→ data/foods.json（正式清单）→ 网页推荐
```

第一次使用，安装 Python 依赖和 Chromium：

```bash
pip install -r scraper/requirements.txt
python -m playwright install chromium
```

然后分两步运行：

```bash
# 1. 抓公开帖子，识别出的候选先放进待审核清单
python scraper/fetch_sohu.py

# 2. 一条一条人工确认；只有通过的才进入正式清单
python scraper/review.py
```

审核时输入 `a` 直接通过、`e` 修改后通过、`d` 丢弃、`s` 跳过、`q` 保存退出。脚本会检查主料、主食、口味、价格等字段是否符合网页的格式；自动识别不全时请按 `e` 补齐，不会把坏数据写进网页清单。

实测公开帖子列表不登录也能抓。只有想加 `--comments` 抓评论时，才需要自己的狐友 Cookie。Cookie 放在环境变量 `SOHU_COOKIE`，或者仓库根目录的 `.env` 中：

```text
SOHU_COOKIE=从浏览器复制的 Cookie
```

> 安全提醒：Cookie 相当于你的登录凭证，**千万不要提交到仓库或发给别人**。`.env` 已经在 `.gitignore` 里，账号密码不经过脚本。

完整参数、抓取频率、隐私说明和排错方法见 [scraper/README.md](scraper/README.md)。清单怎么建设见 [docs/food-list-guide.md](docs/food-list-guide.md)。

抓取工具的离线测试：

```bash
python -m unittest discover -s scraper/tests -v
```

---

## 九、找回旧版

旧版代码存档在 tag `v0-nextjs-archive`：

```bash
git checkout v0-nextjs-archive
```

看完回到最新版：`git checkout main`。

---

## 推荐一道菜

知道一道好吃的？在 GitHub 上 [提一个“推荐一道菜”](https://github.com/Lumine0n/shushu-food/issues/new?template=recommend-food.yml)，审核后会加进清单。
