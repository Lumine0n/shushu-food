# 鼠鼠吃饭微信小程序

这是与 Next.js 网页共用后端的微信小程序前端骨架，使用微信开发者工具打开 `miniapp/` 目录即可开始联调。

## 联调前准备

1. 在微信公众平台注册小程序，取得 AppID。
2. 在开发者工具中配置 `project.config.json` 的 `appid`。
3. 开发阶段勾选“不校验合法域名、web-view 业务域名、TLS 版本以及 HTTPS 证书”。
4. 将本地 API 地址配置为可访问的 HTTPS 隧道地址，或部署 Vercel 预览环境。

## 当前状态

- 首页可以调用 `/api/miniapp/recommend` 获取推荐。
- 登录页调用 `/api/miniapp/auth/login`，后端已预留 `code2Session` 交换逻辑。
- 真实用户绑定和会话签发需要配置 `WECHAT_MINIPROGRAM_APPID`、`WECHAT_MINIPROGRAM_SECRET`，并补齐服务端 profiles 映射。
- 推荐算法与网页共用 `lib/recommendation.ts`，避免两端规则分叉。
