# IP Checker

基于 Cloudflare Workers 的多线路出口 IP 检测页。浏览器并行访问三个独立检测点，用于判断当前网络是否存在域名分流。

**在线使用：** https://ip-route-checker.0xaa-codeislaw.workers.dev

## 检测线路

- 国内线路：IPIP
- 海外线路：当前 Cloudflare Worker
- 全球线路：IP.SB，连接失败时回退到 IPify

页面会展示各线路的出口 IP、位置、运营商和 ASN，并比较成功结果是否一致。

## 隐私

- 检测请求由访问者的浏览器直接发往对应检测点。
- 项目不使用 Cookie、分析脚本或广告脚本。
- Worker 不写入数据库、KV、日志服务或其他持久化存储。
- IPIP、Cloudflare、IP.SB 或 IPify 会收到访问其服务所必需的网络请求；使用本项目即代表访问者接受这些第三方服务各自的隐私政策。

## 本地运行

需要 Node.js 20 或更高版本：

```sh
npx wrangler dev
```

## 部署

登录 Cloudflare 后执行：

```sh
npx wrangler deploy
```

Cloudflare 接口位于 `/api/ip`，静态页面位于 `public/`。项目不需要 API 密钥、数据库或环境变量。

## 许可证

[MIT](LICENSE)
