# 双站部署（简洁版 + 旧版 Next.js）

同一台腾讯云服务器同时托管两个入口。本文只描述生产布局和 Nginx/PM2 约定，不含任何密钥或登录密码。

## 当前布局

| 入口 | 内容 | 服务器路径 | 进程 |
|---|---|---|---|
| https://shushufood.site/ | 简洁版摇罐子静态站 | `/var/www/shushufood` | Nginx 直接出文件 |
| https://www.shushufood.site/ | 同上 | `/var/www/shushufood` | 同上 |
| https://app.shushufood.site/ | 旧版 Next.js + Supabase | `/opt/shushu-food` | PM2 `shushu-food` → `127.0.0.1:3100` |

不要改简洁版静态文件，也不要改 `/etc/nginx/sites-available/shushufood.site` 里指向 `/var/www/shushufood` 的 `root`。旧版只走独立 vhost。

代码来源：

- 简洁版：分支 `cursor/restart-simple-b228`，发布到 `/var/www/shushufood`
- 旧版：`origin/main`（归档 tag `v0-nextjs-archive`），发布到 `/opt/shushu-food`

## DNS

在 DNSPod（`shushufood.site` 的 NS 为 `cuckoo.dnspod.net` / `slateblue.dnspod.net`）添加：

```text
类型  A
主机  app
值    43.142.37.200
```

完整记录名是 `app.shushufood.site`，必须指向 `43.142.37.200`。主域名 `shushufood.site` 与 `www` 已指向该 IP，不要改。

未加这条 A 记录时：

- 公网打不开 `https://app.shushufood.site/`（NXDOMAIN）
- Let’s Encrypt 无法签发证书
- 服务器上 HTTP 反代和 PM2 仍可工作；可用 `Host: app.shushufood.site` 访问 `http://43.142.37.200/` 做内网验收

## 环境变量

旧版读取 `/opt/shushu-food/.env.local`。已有且构建/运行会用到：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

当前文件里没有、因此未启用的项（缺了也不挡网页基本浏览）：

- `NEXT_PUBLIC_AMAP_KEY`
- `NEXT_PUBLIC_AMAP_SECURITY_CODE`
- `NEXT_PUBLIC_ENABLE_MAP`（缺省按关闭，发现页走附近列表）
- `NEXT_PUBLIC_SENTRY_DSN`
- `WECHAT_MINIPROGRAM_APPID`
- `WECHAT_MINIPROGRAM_SECRET`

若以后打开地图，还需要在高德控制台把 `app.shushufood.site` 加入域名白名单。密钥不要提交进 Git。

## Nginx

独立文件：`/etc/nginx/sites-available/app.shushufood.site`，软链到 `sites-enabled`。完整示例见同目录 [`app.shushufood.site.nginx.conf`](./app.shushufood.site.nginx.conf)。

要点：

- `server_name app.shushufood.site;`
- `proxy_pass http://127.0.0.1:3100;`
- 转发 `Host`、`X-Forwarded-Host`、`X-Forwarded-Proto`
- `proxy_redirect` 去掉 `localhost:3100`，避免登录跳转暴露内网端口
- ACME 挑战目录留给 certbot
- **不要**把备份文件放进 `sites-enabled/`

改完后：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 证书（DNS 就绪后）

```bash
sudo certbot --nginx -d app.shushufood.site
sudo nginx -t
```

Certbot 会改这个 vhost、加上 443。主站证书仍是 `/etc/letsencrypt/live/shushufood.site/`，不要混用到 `app`。

## PM2 / 构建

```bash
cd /opt/shushu-food
git pull --ff-only origin main
# 保留 .env.local
npm ci          # lockfile 没变时可省略
NODE_OPTIONS=--max-old-space-size=1024 npm run build
pm2 restart shushu-food --update-env
pm2 save
```

进程名必须是 `shushu-food`，监听 `127.0.0.1:3100`。机器内存约 2G，构建前可先 `pm2 stop shushu-food`，构建结束后再 start；简洁版静态站不受影响。

同机还有 `ajunai.site`、`server-test` 等站点，不要停错进程、不要改别人的 Nginx。

## 验收

```bash
curl -I https://shushufood.site/
# 应为静态 HTML，标题含「上大周边今天吃什么」，且 /jar.js、/data/foods.json 为 200

curl -I http://127.0.0.1:3100/login
# Next.js 200

# DNS 生效前：
curl -I -H "Host: app.shushufood.site" http://127.0.0.1/login

# DNS + 证书生效后：
curl -I https://app.shushufood.site/login
curl -I https://app.shushufood.site/discover
```

主站必须仍是摇罐子问答，不能跳到 Next.js 登录页。
