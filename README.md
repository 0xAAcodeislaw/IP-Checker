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

## 部署

### 方法一：Wrangler（推荐）

需要 Node.js 20 或更高版本。克隆仓库并登录 Cloudflare：

```sh
git clone https://github.com/0xAAcodeislaw/IP-Checker.git
cd IP-Checker
npx wrangler login
npx wrangler deploy
```

Wrangler 会同时部署 `src/index.js` 和 `public/` 中的静态资源。

### 方法二：粘贴到 Workers 在线编辑器

无需安装任何工具：

1. 打开 [`deploy/worker.js`](deploy/worker.js)，点击 GitHub 的 **Raw**，复制全部内容。
2. 在 Cloudflare 控制台进入 **Workers & Pages**，创建一个 Worker。
3. 点击 **Edit code**，删除默认代码，粘贴刚才复制的全部代码。
4. 点击 **Deploy**。

这个文件已内嵌 HTML、CSS 和浏览器脚本，不需要绑定静态资源、环境变量或数据库。不能只粘贴 `src/index.js`，它依赖 Wrangler 配置的静态资源绑定。

### 方法三：上传到 Cloudflare Pages

1. 下载并解压本仓库。
2. 在 Cloudflare 控制台进入 **Workers & Pages**，选择创建 Pages 应用并使用 **Drag and drop your files**。
3. 上传 [`deploy/pages`](deploy/pages) 整个目录，然后点击 **Deploy site**。

也可以先生成 ZIP：

```sh
cd deploy/pages
zip -r ../ip-checker-pages.zip .
```

再上传 `deploy/ip-checker-pages.zip`。ZIP 根目录必须直接包含：

```text
_worker.js
index.html
app.js
styles.css
```

`_worker.js` 使用 Pages Advanced Mode 提供 `/api/ip`；仅上传 `public/` 会缺少这个接口。Cloudflare 官方说明：[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) 和 [Advanced Mode](https://developers.cloudflare.com/pages/functions/advanced-mode/)。

### 重新生成部署文件

修改 `src/` 或 `public/` 后执行：

```sh
node scripts/build-deploy-files.mjs
```

该命令会重新生成 `deploy/worker.js` 和 `deploy/pages/`。请勿直接修改生成文件。

## 许可证

[MIT](LICENSE)
