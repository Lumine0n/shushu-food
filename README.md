# 鼠鼠吃饭

朋友共同维护的校园吃饭决策工具。它推荐具体食物，而不是只推荐店铺。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

未填写 Supabase 环境变量时，应用自动使用浏览器本地演示数据，可以直接体验登录、推荐、选择、反馈、收藏、记录和分享流程。

## 接入 Supabase

1. 新建 Supabase 项目。
2. 用 Supabase CLI 执行 `supabase/migrations/202609040001_initial.sql`。
3. 在 Dashboard 创建 5～10 个邮箱密码账号。
4. 新账号默认是 `inactive`，在 SQL Editor 激活：

```sql
update public.profiles
set status = 'active', role = 'admin', nickname = '鼠鼠'
where id = '<首位用户 UUID>';
```

其他测试用户设置为 `status = 'active'` 即可。

5. 将项目 URL、anon key 和仅服务端使用的 service-role key 写入 `.env.local`。

## 导入种子食物

先校验 CSV：

```bash
npm run import:foods -- data/foods.sample.csv --dry-run
```

确认无误后写入 Supabase：

```bash
npm run import:foods -- data/foods.sample.csv
```

经纬度必须是高德 GCJ-02 坐标。脚本可重复执行，相同地点和食物会更新而不会重复创建。

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

当前小程序先支持推荐接口联调。真实微信登录需要在服务端配置 `WECHAT_MINIPROGRAM_APPID` 和 `WECHAT_MINIPROGRAM_SECRET`，并完成 `openid → profiles` 绑定及会话签发；密钥不会暴露给小程序端。
