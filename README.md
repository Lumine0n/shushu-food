# 鼠鼠吃饭

朋友共同维护的校园吃饭决策工具。它推荐具体食物，而不是只推荐店铺。

完整项目交接书：[`docs/PROJECT-HANDOFF.md`](docs/PROJECT-HANDOFF.md)

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

未填写 Supabase 环境变量时，应用自动使用浏览器本地演示数据。访客可免登录浏览目录、抽取并临时选定食物；登录演示模式后可保存选择、收藏、反馈、添加食物和分享。

## 接入 Supabase

1. 新建 Supabase 项目。
2. 按文件名顺序执行 `supabase/migrations/` 中的迁移。
3. 在 Dashboard 创建 5～10 个邮箱密码账号。
4. 新账号默认是 `inactive`，在 SQL Editor 激活：

```sql
update public.profiles
set status = 'active', role = 'admin', nickname = '鼠鼠'
where id = '<首位用户 UUID>';
```

其他测试用户设置为 `status = 'active'` 即可。

5. 将项目 URL、anon key 和仅服务端使用的 service-role key 写入 `.env.local`。

需要执行最新的 `202609220001_public_food_catalog.sql` 迁移，访客才能读取已上架的地点、食物、标签和图片。个人资料、原始反馈及所有写入仍受登录和原有 RLS 策略保护。未登录的抽取结果只在当前页面显示，不会写入决策历史；收藏、添加清单、反馈和分享链接需要登录。

## 导入美食目录

先校验 CSV：

```bash
npm run import:foods -- data/foods.csv --dry-run
```

确认无误后写入 Supabase：

```bash
npm run import:foods -- data/foods.csv
```

首次用真实目录替换旧演示数据时，显式使用：

```bash
npm run import:foods -- data/foods.csv --replace-catalog
```

`--replace-catalog` 会清空旧地点、菜品和关联决策，只应在确认需要完整替换时使用。普通导入可重复执行，相同地点和食物会更新而不会重复创建。经纬度必须使用高德 GCJ-02；未核准坐标保持 `coordinate_status=estimated`。

## 高德地图

在 `.env.local` 中设置：

```bash
NEXT_PUBLIC_AMAP_KEY=...
NEXT_PUBLIC_AMAP_SECURITY_CODE=...
NEXT_PUBLIC_ENABLE_MAP=true
```

同时在高德控制台配置域名白名单。地图加载失败时，发现页会自动保留附近列表。

## 检查命令

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

管理员可在 Supabase SQL Editor 执行 `supabase/admin-metrics.sql` 查看完成决定次数、选择率、反馈率和用户活跃情况。

## 微信小程序路线

项目已新增 `miniapp/` 小程序前端骨架，与网页共用推荐算法和 Next.js API：

```text
miniapp/                 微信开发者工具项目
app/api/miniapp/         小程序登录与推荐接口
lib/recommendation.ts    网页和小程序共用的推荐规则
```

当前小程序先支持推荐接口联调。真实微信登录需要在服务端配置 `WECHAT_MINIPROGRAM_APPID`、`WECHAT_MINIPROGRAM_SECRET` 和 `SUPABASE_SERVICE_ROLE_KEY`，并在执行 `supabase/migrations/202609040002_wechat_accounts.sql` 后，将受邀用户的 `openid` 预绑定到 `profiles`。未绑定微信会被拒绝进入固定小圈；密钥不会暴露给小程序端。正式会话签发仍需在确定小程序端会话存储方案后接入。
