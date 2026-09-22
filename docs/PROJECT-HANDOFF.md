# 鼠鼠吃饭项目交接书

> 文档版本：v0.1
> 更新日期：2026-09-22
> 交接状态：MVP 已可本地运行，正式站点已部署；访客免登录改动正在收尾
> 适用对象：下一位开发者、产品维护者、数据维护者和部署维护者

这份文档是接手项目所需的单一入口。它同时包含项目说明、实现参考、日常操作和故障排查。所有状态都以当前代码和当前服务器配置为准，不以早期产品构思为准。

## 1. 项目速览

| 项目 | 当前值 |
|---|---|
| 名称 | 鼠鼠吃饭 |
| 定位 | 上海大学宝山校区及周边熟人圈的吃饭决策工具 |
| GitHub | <https://github.com/Lumine0n/shushu-food> |
| 本地目录 | `/Users/lugia/Documents/美食软件` |
| 当前分支 | `codex/guest-food-draw` |
| 最新已提交版本 | `78ce8a0`，`fix: preserve public origin behind nginx` |
| 正式域名 | <https://shushufood.site> |
| 正式服务器 | 腾讯云 Ubuntu，公网 IP `43.142.37.200` |
| Supabase 项目 | `https://szknxluzjuiffgjgmbdb.supabase.co` |
| Web 进程 | PM2 进程 `shushu-food` |
| Next.js 内网端口 | `127.0.0.1:3100` |
| 反向代理 | Nginx |
| 小程序目录 | `miniapp/` |

### 状态标记

- **已完成**：代码已经实现，且已提交或有明确验证记录。
- **开发中**：代码已经开始实现，但还不能当作生产能力交接。
- **待验证**：代码存在，需要在真实 Supabase、正式域名、手机或地图环境验证。
- **待部署**：本地或分支已经准备好，但还没有推到正式服务器。
- **长期规划**：当前 MVP 不做，只有在真实用户反馈支持后再排期。

## 2. 项目背景与目标

### 2.1 要解决的问题

学生每天不是找不到餐厅，而是在以下几个问题上反复纠结：

1. 现在到底吃什么。
2. 到店之后具体点哪一道。
3. 这个建议是否来自真正认识的人。
4. 价格、距离和用餐场景是否合适。

大众点评、短视频和聊天记录分别解决了一部分问题，但信息分散、结果太多、熟人经验难以积累。鼠鼠吃饭把朋友实际吃过的“某家店的某一道菜”整理成可直接执行的答案。

### 2.2 MVP 目标

首版服务 5～10 位固定用户，验证一个完整闭环：

```text
打开产品
  -> 设置位置、预算、距离和口味
  -> 得到 1～3 道具体食物
  -> 查看店铺或地图
  -> 选择“就吃这个”
  -> 下次打开完成三秒反馈
  -> 收藏或生成公开分享卡
```

产品当前追求的是“少纠结、能出发、推荐可信”，不是做全国餐饮平台，也不是先做复杂社交。

### 2.3 目标用户与起步范围

- 首批用户：上海大学宝山校区的舍友、同学和饭搭子。
- 地理范围：宝山校区、上大路、聚丰园路及步行可达范围。
- 设备：手机优先的响应式网页；小程序作为下一阶段入口。
- 内容：食堂窗口、餐厅、小吃、快餐、夜宵、饮品和甜品。
- 关系：先服务固定熟人圈，不开放公开注册和多个圈子。

### 2.4 本次明确不做

- 好友申请、多个圈子和公开注册。
- 复杂运营后台，先用脚本和 Supabase Dashboard。
- 机器学习、AI 生成评价和口味相似度模型。
- 评论区、排行榜、签到、投票和新生指南。
- 推送通知、邮件提醒、支付、团购和商家端。
- 全国、多校园和国内云迁移架构。

## 3. 产品和用户流程

### 3.1 访客流程

当前分支正在把公开浏览和抽取改成免登录：

```text
首页 / 发现页
  -> 读取公开地点和菜品
  -> 抽取推荐
  -> 查看店铺 / 菜品详情
  -> 临时选择“就吃这个”
  -> 收藏、反馈、添加或上传时跳转登录
```

访客的推荐结果只保存在当前页面，不写入 `decisions`，也不会产生个人历史。

### 3.2 已登录成员流程

```text
邮箱密码登录
  -> 设置条件
  -> 推荐最多 9 个候选，分三组查看
  -> 选择本次食物
  -> 下次打开看到待反馈卡片
  -> 选择 again / neutral / avoid
  -> 收藏、添加食物、生成分享卡
```

演示模式下，登录状态和本地数据保存在浏览器 `localStorage`。配置 Supabase 后，成员数据写入 Supabase 并受 RLS 保护。

### 3.3 页面和权限

| 路径 | 用途 | 访客 | 登录成员 |
|---|---|---:|---:|
| `/` | 吃什么决策器 | 可抽取、临时选择 | 可保存决策和反馈 |
| `/discover` | 附近店铺列表、搜索、地图 | 可访问 | 可访问 |
| `/place/[id]` | 店铺详情和店内菜品 | 可访问 | 可访问 |
| `/food/[id]` | 菜品详情、朋友反馈 | 可看脱敏基础信息 | 可收藏、分享、查看圈内反馈 |
| `/login` | 邮箱密码登录或演示登录 | 可访问 | 已登录时回首页 |
| `/record` | 添加店铺、菜品或记录 | 显示登录提示 | 可提交 |
| `/me` | 收藏、历史、待反馈、退出 | 显示登录提示 | 可访问 |
| `/share/[token]` | 公开分享卡片 | 可访问 | 可访问 |

### 3.4 页面行为约定

- 地图未配置或加载失败时，发现页自动切回附近店铺列表。
- 价格未知时不伪造单品价格；推荐和详情可以显示店铺人均作为参考。
- 位置为估算坐标时，页面显示“等待高德校准”。
- 未登录点击收藏、反馈、添加和分享管理，会保留当前目标并跳转 `/login?next=...`。
- 公开分享页不显示作者昵称、邮箱和原始评价文本，只显示菜品、地点、价格、标签和匿名汇总。

## 4. 当前开发进度

### 4.1 已完成

#### 产品和 Web MVP

- Next.js App Router、TypeScript、Tailwind CSS 项目基础。
- 首页吃什么决策器。
- 预算、距离、用餐类型、供应方式、想吃标签和排除标签。
- 推荐结果、换一组、推荐理由、详情和“就吃这个”。
- `again / neutral / avoid` 三秒反馈。
- 收藏、历史、待反馈和分享卡片。
- 发现页已经从“菜品列表”改成“附近店铺列表”。
- 店铺详情页 `app/place/[id]/page.tsx`。
- 搜索菜品时可以反查对应店铺。

#### 真实目录

- `data/foods.csv` 当前包含 9 个地点、18 道推荐菜。
- 地点、菜品、标签、备注和来源分开保存。
- 地点人均价格与单品价格分开保存。
- 未知单品价格保持空值，推荐时可回退到地点人均价格。
- 不推荐内容保留在店铺备注，不会误生成推荐菜。

#### Supabase 和安全边界

- Supabase Auth 邮箱密码登录。
- Postgres 表、索引、约束、触发器和 RLS 迁移。
- 食物图片 `food-images` Storage bucket 及上传策略。
- 分享 token 使用随机令牌，数据库只保存 SHA-256 哈希。
- 固定成员圈，账号由管理员预建，默认状态为 `inactive`。
- 最新匿名读取迁移允许访客读取公开地点、菜品、标签和图片，但不允许匿名写入。

#### 地图和部署

- 高德地图 JS API 2.0 已接入。
- 9 个地点标记可以加载，地图失败有列表回退。
- 域名已备案，DNS 已指向腾讯云服务器。
- Let's Encrypt HTTPS 已部署，HTTP 自动跳转 HTTPS。
- Nginx 已修复 `localhost:3100` 泄露到公网的问题。
- PM2 运行 Next.js，生产入口为 `https://shushufood.site`。

#### 微信小程序基础

- `miniapp/` 包含首页、登录页和微信开发者工具配置。
- `/api/miniapp/recommend` 和 `/api/miniapp/auth/login` 已有接口骨架。
- 微信 `code2Session`、openid 映射迁移和服务端密钥读取已预留。
- 推荐规则复用 `lib/recommendation.ts`，避免网页和小程序分叉。

### 4.2 开发中，尚未视为生产完成

当前分支 `codex/guest-food-draw` 有一批未提交改动，主要是“免登录抽食物、登录后维护数据”：

- 访客公开读取真实 Supabase 目录。
- 访客首页抽取和临时选择。
- 访客点击写操作时跳转登录。
- `/record` 和 `/me` 的登录提示。
- 小程序首页默认免登录进入。
- 新迁移 `supabase/migrations/202609220001_public_food_catalog.sql`。

这批改动已经通过本地类型检查、单元测试、构建和 Playwright 演示流，但还没有完成：

1. 在 Supabase SQL Editor 执行最新公开目录迁移。
2. 用正式 Supabase 数据验证匿名读取和 RLS。
3. 用正式域名验证地图白名单和访客流程。
4. 提交、推送并部署到服务器。

当前工作树还保留两份用户自行保存的未跟踪文档。它们不属于访客功能改动，不要删除，也不要在不确认的情况下加入提交：

- `AI-校园美食数据整理任务.md`
- `AI-项目交接与下一步.md`

### 4.3 待验证

- 高德控制台白名单对 `shushufood.site` 和 `www.shushufood.site` 的正式生效情况。
- 9 个地点的 GCJ-02 坐标和具体入口。
- 正式 Supabase 账号激活、停用账号和 RLS 全权限矩阵。
- 真实图片上传、Storage 公读和失败后无图保存。
- 中国大陆网络环境下的 DNS、HTTPS、Supabase 请求和地图 SDK。
- 375px 手机宽度下的首页、发现页、店铺详情和反馈。

### 4.4 待部署

- 访客免登录分支。
- 最新公开目录迁移。
- 坐标校准后的数据文件。
- 小程序正式 API 域名和合法域名配置。

### 4.5 长期规划

- 微信小程序真实会话和 openid 到 profiles 的完整绑定。
- 小程序端真实目录、反馈、收藏和清单维护。
- App 外壳或跨端客户端，先等网页和小程序验证留存。
- 在真实使用数据足够后再考虑口味相似度和更复杂排序。

## 5. 技术架构

```text
手机浏览器
  │
  ├── Next.js App Router
  │     ├── Middleware：刷新 Supabase 会话、保护非公开页面
  │     ├── AppStore：加载目录、处理推荐和写操作
  │     └── 页面/组件：决策器、发现、地图、详情、记录、我的
  │
  ├── Supabase Auth / Postgres / Storage
  │     ├── Auth：邮箱密码和未来微信身份映射
  │     ├── Postgres：地点、菜品、标签、反馈、决策、收藏、分享
  │     ├── RLS：活跃成员和匿名公开读取边界
  │     └── Storage：公开食物图片
  │
  └── 高德地图 JS API
        └── 地图标记、视口范围、地点点击和列表回退

微信小程序
  │
  └── Next.js Route Handlers
        ├── /api/miniapp/recommend
        └── /api/miniapp/auth/login

公网请求
  -> Nginx 443 / 80
  -> PM2
  -> Next.js 127.0.0.1:3100
```

### 5.1 关键目录

| 目录或文件 | 作用 |
|---|---|
| `app/` | Next.js 页面和 Route Handlers |
| `components/` | 页面组件、决策器、地图、导航和登录提示 |
| `lib/app-store.tsx` | 客户端状态、Supabase 读写、演示模式行为 |
| `lib/recommendation.ts` | 距离、过滤、评分、去重和稳定扰动 |
| `lib/types.ts` | Profile、Place、FoodItem、Decision 等核心类型 |
| `lib/access.ts` | 公开路径和登录跳转规则 |
| `lib/supabase/` | 浏览器端和服务端 Supabase client |
| `data/` | 当前真实 CSV 和数据确认说明 |
| `scripts/import-foods.ts` | CSV 校验、幂等 upsert 和目录替换 |
| `supabase/migrations/` | 数据库迁移，必须按文件名顺序执行 |
| `supabase/admin-metrics.sql` | 管理员指标查询 |
| `miniapp/` | 微信开发者工具项目 |
| `e2e/` | Playwright 移动端核心流程 |

## 6. 数据模型和数据管理

### 6.1 核心表

| 表 | 用途 | 关键约束 |
|---|---|---|
| `profiles` | Auth 用户资料、昵称、角色、状态 | `id` 对应 `auth.users` |
| `places` | 店铺/食堂/地点、地址、坐标、人均、备注 | `normalized_name + address` 唯一 |
| `food_items` | 具体菜品 | `place_id + normalized_name` 唯一 |
| `tags` | 标签字典 | `name` 唯一 |
| `food_item_tags` | 菜品和标签多对多关系 | 复合主键 |
| `food_item_images` | 图片 URL 和排序 | 关联菜品、上传者 |
| `experiences` | 用户对菜品的当前态度和理由 | `user_id + food_item_id` 唯一，upsert |
| `favorites` | 用户收藏 | `user_id + food_item_id` 主键 |
| `decisions` | 一次决策的筛选条件和最终选择 | 只允许本人读取和写入 |
| `decision_candidates` | 一次决策的前 9 个候选 | 决策内 rank 1～9 唯一 |
| `share_links` | 公开分享 token 的哈希和有效期 | 默认 30 天，支持撤销 |
| `wechat_accounts` | 小程序 AppID 和 openid 映射 | 只由服务端使用 |

### 6.2 CSV 实际表头

当前导入脚本要求以下表头。早期 `AI-校园美食数据整理任务.md` 中的简化表头不能直接替代它：

```csv
place_name,place_category,address,latitude_gcj02,longitude_gcj02,coordinate_status,average_price_yuan,place_notes,food_name,description,price_yuan,meal_type,service_modes,tags,image_url,source
```

字段规则：

- `latitude_gcj02`、`longitude_gcj02` 使用高德 GCJ-02，不当作 WGS-84。
- `coordinate_status` 使用 `verified`、`estimated` 或 `pending`。
- `average_price_yuan` 是店铺人均，`price_yuan` 是具体菜品价格，可以为空。
- `service_modes` 和 `tags` 用英文竖线 `|` 分隔。
- `image_url` 只能为空或 HTTPS 地址。
- `source` 记录实地观察、高德地图、菜单或用户整理来源。
- 不确定的价格和坐标留空或标记待确认，不编造精确数值。

### 6.3 当前真实目录

当前 `data/foods.csv`：

- 9 个地点。
- 18 道具体菜品。
- 来源统一为 `用户实地整理-2026-09`。
- 地点坐标目前统一为 `estimated`。
- 具体菜品价格大多未知，推荐卡会显示店铺人均作为参考。

优先核验：

1. 马厂老火锅上大路 682 号 26 楼的具体入口。
2. Popeyes 上大路 682 号的楼层。
3. 火箭狗披萨聚丰园路 91 弄 1 号 122 的门牌格式。
4. Fan 土耳其烤肉饭在弘基广场内的具体铺位。
5. 汉堡王经纬汇 9 号楼的标准高德地址。

### 6.4 导入流程

先只校验：

```bash
npm run import:foods -- data/foods.csv --dry-run
```

确认通过后幂等导入：

```bash
npm run import:foods -- data/foods.csv
```

首次完全替换旧目录：

```bash
npm run import:foods -- data/foods.csv --replace-catalog
```

`--replace-catalog` 会调用 `admin_reset_food_catalog()`，删除旧决策并清空地点，连带删除菜品、标签关联和图片关联。它是破坏性操作，只能在确认备份和替换范围后执行。

导入脚本使用 `SUPABASE_SERVICE_ROLE_KEY`，只能在服务端环境运行，不能放到浏览器、CSV 或公开文档中。

## 7. 推荐算法

### 7.1 输入

```ts
type DecisionInput = {
  latitude: number;
  longitude: number;
  budgetMaxCents?: number;
  distanceMeters: number;
  mealTypes: ("正餐" | "夜宵" | "甜品" | "饮品" | "小吃")[];
  serviceModes: ("堂食" | "带走" | "外卖")[];
  wantedTags: string[];
  excludedTags: string[];
};
```

### 7.2 硬过滤

推荐前会排除：

- 关闭地点和停售菜品。
- 超出距离的地点。
- 超出预算或价格未知的菜品；如果菜品价格未知，会尝试使用地点人均。
- 不匹配用餐类型或供应方式的菜品。
- 命中排除标签的菜品。
- 当前用户标记为 `avoid` 的菜品。

### 7.3 评分和结果分组

总分约 100 分，加 0～5 分由决策 ID 和食物 ID 生成的稳定扰动：

| 因素 | 上限 |
|---|---:|
| 想吃标签匹配 | 30 |
| 圈内其他用户 `again` | 25 |
| 距离 | 20 |
| 预算契合度 | 15 |
| 用户自己的历史正面反馈 | 10 |
| 稳定扰动 | 0～5 |

严格匹配少于 3 个时，只放宽想吃标签，不放宽预算、距离、排除标签和状态过滤。排序后前 3 个尽量来自不同地点，再补足到最多 9 个。页面通过 3 个一组实现“换一组”。

## 8. 登录、权限和安全

### 8.1 网页登录

- 生产网页当前使用 Supabase Auth 邮箱密码。
- 不开放公开注册，管理员先在 Supabase Dashboard 创建账号。
- 新账号由触发器创建 `profiles`，默认 `inactive`。
- 只有在数据库中激活后，才应获得成员写权限。
- 未配置 Supabase 时使用演示模式，演示登录按钮只用于本地验证，不代表真实账号。

激活示例：

```sql
update public.profiles
set status = 'active', role = 'member', nickname = '同学昵称'
where id = (
  select id from auth.users where email = '同学邮箱'
);
```

首位管理员将 `role` 改为 `admin`。真实 UUID 和邮箱不要写入公开项目书。

### 8.2 访客与成员边界

最新公开目录迁移只给 `anon` 以下读取权限：

- `places` 中的营业地点。
- `food_items` 中的上架菜品。
- 菜品标签、标签关联和图片。

匿名用户不能读取或写入：

- `profiles`。
- `experiences` 原始评价和作者信息。
- `favorites`。
- `decisions` 和 `decision_candidates`。
- `share_links` 管理数据。
- 新增地点、菜品、标签和图片上传。

中间件不会把 `/api/*` 强制重定向成 HTML 登录页，API 应自行返回 JSON 错误。

### 8.3 敏感信息规则

以下信息只能通过密码管理器、服务器环境变量或受限的部署平台设置交接：

- `SUPABASE_SERVICE_ROLE_KEY`。
- `WECHAT_MINIPROGRAM_SECRET`。
- 高德安全密钥和未公开的 API 配置。
- 服务器 SSH 密码、私钥和 PM2 环境变量。

`.env.local` 必须保持在本机或服务器，不得提交到 GitHub。若密码曾在聊天、截图或日志中暴露，应立即更换。

## 9. 高德地图接入

### 9.1 环境变量

```bash
NEXT_PUBLIC_AMAP_KEY=你的高德 JS API Key
NEXT_PUBLIC_AMAP_SECURITY_CODE=你的高德安全密钥
NEXT_PUBLIC_ENABLE_MAP=true
```

未配置 Key 或开关不是 `true` 时，地图组件会显示“地图尚未配置”，发现页保留附近店铺列表。

### 9.2 当前实现

`components/amap-view.tsx` 使用高德 JS API 2.0：

- 默认中心点为宝山校区中心。
- 根据地点生成标记。
- 点击标记放大并显示店铺详情入口。
- 地图移动后计算当前视口内的地点数。
- 12 秒加载超时或 SDK 异常时报告 `error`，发现页自动回列表。

### 9.3 白名单和坐标验收

在高德控制台配置实际访问域名，不要把带路径的 URL 当作域名。正式环境至少验证：

- `shushufood.site`。
- `www.shushufood.site`。
- 开发环境需要时再添加对应本地域名或端口策略。

当前 CSV 坐标是地址估算值，地图能显示不等于定位准确。每个地点核验后，将 `coordinate_status` 改为 `verified`，并保留来源。

## 10. 微信小程序路线

### 10.1 当前状态

`miniapp/` 是微信开发者工具项目骨架，不是已经发布的小程序：

- 首页现在设计为免登录抽食物。
- 推荐接口目前仍使用 `demoFoods`、`demoPlaces` 和 `demoExperiences`。
- 登录接口可以调用微信 `code2Session`，并检查 `wechat_accounts` 的 openid 绑定。
- 当前登录接口只返回 `wechat_verified`，尚未签发正式小程序会话。
- 小程序 `apiBaseUrl` 仍是本地开发地址，生产必须改为 HTTPS 合法域名。

### 10.2 需要补齐的服务端配置

```text
WECHAT_MINIPROGRAM_APPID
WECHAT_MINIPROGRAM_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

三个值都只能在服务端使用。小程序端只拿到接口响应和短期会话标识，不接触 AppSecret 或 service-role key。

### 10.3 推荐实施顺序

1. 先完成正式网页的访客推荐和登录后维护闭环。
2. 把 `/api/miniapp/recommend` 改为读取 Supabase 公开目录。
3. 确认微信 openid 与 `profiles` 的绑定和会话策略。
4. 接入收藏、反馈、清单维护和图片上传。
5. 在微信公众平台配置 request 合法域名、业务域名和 TLS。
6. 用真实微信账号进行体验版测试，再申请发布。

## 11. 本地开发和验证

### 11.1 初始化

```bash
cd "/Users/lugia/Documents/美食软件"
npm install
cp .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3100
```

未填 Supabase 时会进入演示数据模式。开发时也可以用 3102 或 3103，但要同步修改访问地址和 Playwright 配置，避免多个 Next 进程抢占同一端口。

### 11.2 环境变量

`.env.example` 是模板，变量含义如下：

| 变量 | 浏览器可见 | 用途 |
|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是 | 浏览器端受 RLS 保护的 anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 否 | 导入脚本和服务端管理操作 |
| `NEXT_PUBLIC_AMAP_KEY` | 是 | 高德地图 JS API Key |
| `NEXT_PUBLIC_AMAP_SECURITY_CODE` | 是 | 高德安全配置，按控制台要求限制域名 |
| `NEXT_PUBLIC_ENABLE_MAP` | 是 | 地图功能开关 |
| `NEXT_PUBLIC_SENTRY_DSN` | 是 | Sentry 客户端 DSN，可选 |
| `WECHAT_MINIPROGRAM_APPID` | 否 | 微信小程序 AppID |
| `WECHAT_MINIPROGRAM_SECRET` | 否 | 微信小程序 AppSecret |

### 11.3 检查命令

```bash
npm run typecheck
npm test -- --run
npm run lint
npm run build
npm run test:e2e
```

当前本地结果：

- TypeScript：通过。
- Vitest：3 个测试文件、12 个测试通过。
- ESLint：0 个错误，导入脚本有 4 个 `console` 警告。
- Next.js 生产构建：通过。
- Playwright：3 个移动端核心流程通过。

这些结果主要覆盖演示模式和本地浏览器，不等于正式 Supabase、地图和服务器验收通过。

### 11.4 构建注意事项

不要让 `next dev` 和 `next build` 同时操作同一个 `.next` 目录。此前出现过开发资源被生产构建覆盖，导致页面 404 的情况。构建前先停止本地开发进程，或使用独立工作目录。

## 12. Supabase 初始化和迁移

在 Supabase SQL Editor 中按文件名顺序执行：

```text
supabase/migrations/202609040001_initial.sql
supabase/migrations/202609040002_wechat_accounts.sql
supabase/migrations/202609040003_profile_self_read.sql
supabase/migrations/202609170001_food_catalog_metadata.sql
supabase/migrations/202609220001_public_food_catalog.sql
```

迁移职责：

1. `202609040001_initial.sql`：核心表、枚举、RLS、Storage、分享函数和标签函数。
2. `202609040002_wechat_accounts.sql`：微信身份映射基础表。
3. `202609040003_profile_self_read.sql`：允许账号读取自己的资料，避免未激活账号出现 `.single()` 转换错误。
4. `202609170001_food_catalog_metadata.sql`：地点人均、备注、坐标状态、来源字段和目录重置函数。
5. `202609220001_public_food_catalog.sql`：只给匿名用户公开读取上架目录。

初始化后创建 5～10 个账号，并将测试账号激活。迁移执行后，用匿名客户端和成员客户端分别验证 RLS，不能只看 SQL Editor 是否显示成功。

## 13. 腾讯云生产部署

### 13.1 服务器结构

| 项目 | 值 |
|---|---|
| 操作系统 | Ubuntu |
| 项目目录 | `/opt/shushu-food` |
| 运行用户 | `ubuntu` |
| Node 服务 | Next.js `127.0.0.1:3100` |
| 进程管理 | PM2，进程名 `shushu-food` |
| 反向代理配置 | `/etc/nginx/sites-available/shushufood.site` |
| 启用配置 | `/etc/nginx/sites-enabled/shushufood.site` |
| 证书目录 | `/etc/letsencrypt/live/shushufood.site/` |
| 证书到期 | 2026-12-20，Certbot 已配置自动续期 |

服务器同机还有旧项目 `ajunai.site` 等进程。任何 Nginx、PM2 或端口操作都不能误删或覆盖其他站点。

### 13.2 推荐部署流程

只有代码已经推送到远端、迁移已执行、备份和回滚点明确后才部署：

```bash
cd /opt/shushu-food
git config --global --add safe.directory /opt/shushu-food  # 仅在出现 dubious ownership 时执行
sudo -u ubuntu -H git pull --ff-only origin main
sudo -u ubuntu -H npm ci
sudo -u ubuntu -H npm run typecheck
sudo -u ubuntu -H npm test -- --run
sudo -u ubuntu -H npm run build
sudo chown -R ubuntu:ubuntu /opt/shushu-food/.next
sudo -u ubuntu -H pm2 restart shushu-food --update-env
sudo -u ubuntu -H pm2 save
sudo nginx -t
sudo systemctl reload nginx
curl -I https://shushufood.site
```

如果当前 PM2 进程不存在，需要先在项目目录由 `ubuntu` 用户启动一次：

```bash
sudo -u ubuntu -H pm2 start npm --name shushu-food -- start -- -H 127.0.0.1 -p 3100
sudo -u ubuntu -H pm2 save
```

### 13.3 Nginx 约定

站点配置必须包含：

- `server_name shushufood.site www.shushufood.site`。
- 443 SSL 监听和 Certbot 证书。
- `proxy_pass http://127.0.0.1:3100`。
- `Host`、`X-Forwarded-Host`、`X-Forwarded-Proto` 等转发头。
- `proxy_redirect`，避免 Next.js 把内部 `localhost:3100` 暴露给用户。

备份文件不要放进 `/etc/nginx/sites-enabled/`。例如 `shushufood.site.save` 会被 Nginx 当成第二份配置，触发 `duplicate listen options`。备份应放到 `/root/` 或其他不被 include 的目录。

### 13.4 发布后验收

```bash
curl -I https://shushufood.site
curl -I https://www.shushufood.site
curl -sS https://shushufood.site/ | head
sudo -u ubuntu -H pm2 status
sudo -u ubuntu -H pm2 logs shushu-food --lines 100
sudo nginx -t
```

重点看：

- HTTP 是否 301/308 跳转到 HTTPS。
- HTTPS 是否不再跳转到 `localhost:3100`。
- PM2 是否只有一个 `shushu-food` 实例在线。
- 首页、发现页、地图失败回退和登录页是否可以从中国大陆访问。

## 14. 指标和试用计划

管理员可以在 Supabase SQL Editor 执行 `supabase/admin-metrics.sql`。当前关注：

- 决策次数。
- 决策选择率。
- 选择后的反馈率。
- 周活跃和第二周留存。
- 分享链接创建和访问转化。

建议试用顺序：

1. 先由项目发起人完成 5 次真实决策，检查推荐是否符合直觉。
2. 邀请 2～3 位同学，观察是否能在 10 秒内得到答案。
3. 扩大到 5～10 位固定用户，连续使用两周。
4. 每周只修影响“得到答案、选择、反馈”的问题。

MVP 验收目标：

- 每位活跃用户每周至少发起 2 次决策。
- 推荐选择率达到 30%。
- 已选择食物的反馈率达到 30%。
- 第二周留存超过 50%。
- 地图失败不影响推荐、详情和反馈。
- 未登录用户拿不到成员身份和原始评价。
- 核心流程在 375px 手机宽度可用。

## 15. 测试清单

### 15.1 单元和组件

- 距离计算、硬过滤、价格回退、标签放宽、评分和稳定扰动。
- 同店去重、最多 9 个候选、零结果和少于 3 个候选。
- 名称标准化、CSV 校验、分享 token 哈希。
- 定位拒绝、空结果、请求失败、地图失败和会话失效。
- 快速重复点击和重复反馈 upsert。

### 15.2 数据库集成

- 匿名用户只能读公开目录。
- inactive 用户不能写入业务数据。
- member 只能修改自己创建的基础内容。
- admin 可以维护全部内容。
- 反馈、收藏和候选选择的唯一约束有效。
- 分享函数不返回昵称、邮箱和原始评价。
- 决策只能选择自身候选项。

### 15.3 Playwright 核心流程

当前 `e2e/core-flow.spec.ts` 覆盖：

1. 访客抽食物，收藏时跳转登录，登录后进入记录页。
2. 演示用户完成决策、选择和吃后反馈。
3. 未登录查看分享卡，不显示成员身份。

正式验收还应补充真实 Supabase 和正式域名环境：

- 搜索店铺，打开地图标记，进入店铺详情。
- 新增菜品和重复名称提示。
- 图片上传失败后无图保存。
- 分享链接过期和撤销。
- inactive、member、admin 的权限矩阵。

## 16. 已知问题和风险

| 风险 | 影响 | 处理方式 |
|---|---|---|
| 访客免登录改动还未部署 | 正式站仍可能要求登录 | 执行最新迁移，测试后再发布分支 |
| 坐标为 estimated | 地图标记可能偏移 | 逐个高德核验并改为 `verified` |
| 单品价格不完整 | 价格展示是人均参考 | 继续补充菜单价，不能把人均冒充单品价 |
| 小程序推荐仍用 demo 数据 | 小程序和网页目录不一致 | 改 API 读取 Supabase 公开目录 |
| 小程序未签发正式会话 | 登录后不能完成维护操作 | 确定会话 token 方案并补齐绑定 |
| Supabase 和高德是外部依赖 | 国内网络可能出现超时或失败 | 保留列表回退，增加正式域名监控 |
| 同服务器有其他站点 | 错误 Nginx/PM2 操作会影响旧项目 | 修改前先检查配置和进程归属 |
| `.next` 所有者错误 | PM2 或构建失败 | 构建统一使用 `ubuntu`，必要时修复 chown |

## 17. 后续两周执行路线

### 第 1 阶段：收尾当前分支

1. 审阅 `git diff`，确认免登录边界没有误放开写操作。
2. 在 Supabase 执行 `202609220001_public_food_catalog.sql`。
3. 运行 typecheck、单元测试、lint、build、E2E。
4. 用匿名浏览器验证首页、发现、店铺和菜品详情。
5. 用成员账号验证收藏、添加、反馈、分享。
6. 提交并推送，部署腾讯云。

### 第 2 阶段：真实数据质量

1. 核验 9 个地点的高德坐标和入口。
2. 补充 50～100 道真实菜品，优先覆盖食堂和高频店。
3. 补充单品价格、营业时间、图片和供应方式。
4. 用 `--dry-run` 检查 CSV 后再导入。

### 第 3 阶段：小范围试用

1. 邀请 5～10 位同学。
2. 记录选择率、反馈率、复用意愿和网络问题。
3. 只根据真实阻塞问题做一轮小修复。
4. 再决定是否推进小程序真实登录和 App 外壳。

## 18. 交接检查清单

### 代码

- [ ] 接手人已 clone `https://github.com/Lumine0n/shushu-food.git`。
- [ ] 接手人已阅读本文件、`README.md`、`data/foods-confirmation.md`。
- [ ] 接手人知道当前分支有未提交的访客免登录改动。
- [ ] 接手人能在本地运行首页、发现页、店铺详情和记录页。
- [ ] 接手人已运行 typecheck、test、lint、build、E2E。

### Supabase

- [ ] 五个迁移按顺序执行。
- [ ] 公开目录迁移已执行。
- [ ] 5～10 个固定账号已创建并激活。
- [ ] 首位管理员角色已设置。
- [ ] 真实数据已通过 `--dry-run`。
- [ ] 正式导入前已有可恢复备份或 CSV 原件。

### 高德

- [ ] JS API Key 和安全密钥已通过环境变量配置。
- [ ] 正式域名白名单已配置。
- [ ] 9 个地点坐标已逐个核验。
- [ ] 地图失败时附近列表仍可用。

### 服务器

- [ ] `/opt/shushu-food` 使用正确远端和分支。
- [ ] PM2 只有一个 `shushu-food` 在线实例。
- [ ] Nginx `nginx -t` 通过。
- [ ] `curl -I https://shushufood.site` 不泄露 localhost。
- [ ] Certbot 自动续期检查通过。
- [ ] `.env.local`、service-role key、微信 Secret 未进入 Git。

### 微信小程序

- [ ] `miniapp/app.js` 已替换为 HTTPS 生产 API 地址。
- [ ] 微信公众平台已配置合法域名。
- [ ] 真实目录接口已替代 demo 数据。
- [ ] openid 绑定和会话策略已完成。
- [ ] 体验版已用真实微信账号验证。

## 19. 紧急故障排查

### 页面跳转到 `localhost:3100`

检查 Nginx 转发头和 `proxy_redirect`：

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://shushufood.site
```

同时确认 `middleware.ts` 使用 `x-forwarded-host` 和 `x-forwarded-proto` 生成公开地址。

### `EADDRINUSE: 127.0.0.1:3100`

```bash
sudo ss -ltnp | grep ':3100'
sudo -u ubuntu -H pm2 list
sudo -u ubuntu -H pm2 logs shushu-food --lines 100
```

只保留一个正式 Next 进程。不要为了“清空端口”停止同机其他项目。

### Nginx `duplicate listen options`

```bash
ls -la /etc/nginx/sites-enabled/
sudo mv /etc/nginx/sites-enabled/shushufood.site.save /root/shushufood.site.save
sudo nginx -t
sudo systemctl reload nginx
```

只有确认文件是备份副本时才移动，不能凭文件名删除正式站点配置。

### PM2 找不到进程

```bash
cd /opt/shushu-food
sudo -u ubuntu -H pm2 list
sudo -u ubuntu -H pm2 start npm --name shushu-food -- start -- -H 127.0.0.1 -p 3100
sudo -u ubuntu -H pm2 save
```

### 构建后 502 或页面 404

```bash
curl -I http://127.0.0.1:3100
sudo -u ubuntu -H pm2 logs shushu-food --lines 100
sudo chown -R ubuntu:ubuntu /opt/shushu-food/.next
sudo -u ubuntu -H npm run build
sudo -u ubuntu -H pm2 restart shushu-food --update-env
```

### 地图白屏

按顺序检查：

1. `NEXT_PUBLIC_ENABLE_MAP=true`。
2. `NEXT_PUBLIC_AMAP_KEY` 已配置并重启/重新构建。
3. 高德域名白名单与浏览器实际域名一致。
4. 安全密钥配置正确。
5. 观察页面是否已回退到附近店铺列表。
6. 检查地点坐标是否为有效 GCJ-02 数值。

## 20. 关键文件索引

### 产品和设计

- `shu-food-map-design-v1.md`：完整产品方向稿。
- `shu-food-map-design-精简版.md`：早期精简构思。
- `AI-项目交接与下一步.md`：早期交接记录，不替代本文件。
- `AI-校园美食数据整理任务.md`：给 AI 整理数据用的任务说明，不是当前 CSV 的最终格式。

### 数据和数据库

- `data/foods.csv`：当前 9 个地点、18 道菜。
- `data/foods-confirmation.md`：数据来源、坐标状态和待核验地址。
- `scripts/import-foods.ts`：CSV 校验和导入。
- `supabase/migrations/`：按文件名顺序执行的迁移。
- `supabase/seed.sql`：基础标签种子。
- `supabase/admin-metrics.sql`：管理员指标查询。

### Web 和测试

- `app/page.tsx`：首页。
- `app/discover/page.tsx`：发现页和店铺列表/地图切换。
- `app/place/[id]/page.tsx`：店铺详情。
- `app/food/[id]/page.tsx`：菜品详情。
- `components/decision-builder.tsx`：决策器交互。
- `components/amap-view.tsx`：高德地图加载和回退。
- `lib/app-store.tsx`：应用状态和数据写入。
- `lib/recommendation.ts`：推荐算法。
- `middleware.ts`：会话刷新和页面保护。
- `e2e/core-flow.spec.ts`：移动端核心流程。

### 小程序

- `miniapp/README.md`：开发者工具联调说明。
- `miniapp/app.js`：API 基地址。
- `miniapp/pages/index/`：免登录推荐首页。
- `miniapp/pages/login/`：微信登录入口。
- `app/api/miniapp/recommend/route.ts`：推荐接口骨架。
- `app/api/miniapp/auth/login/route.ts`：微信 code2Session 骨架。

## 21. 交接原则

1. 先保证“抽到一个能吃的答案”，再扩展社交和智能推荐。
2. 地图是浏览方式，不是核心闭环；地图挂掉不能阻断推荐。
3. 真实数据优先于数量，未知信息明确标注，不编造精确价格和坐标。
4. 所有用户数据表保持 RLS，匿名只读公开目录。
5. 迁移优先于手工改线上表，破坏性目录替换必须先备份。
6. 每次改动都同时检查手机宽度、国内网络、空结果、错误和重复点击。
7. 不把密码、API Key、service-role key、微信 Secret 写进代码或项目书。
