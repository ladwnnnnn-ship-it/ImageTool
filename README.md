# Image Task Studio

私人批量修图工作台。一次上传最多 10 张图片，由 `gpt-5.4-nano` 理解自然语言并生成逐图任务，确认后再由 `gpt-image-2` 逐张修图。

## 支持的指令

```text
第1张去掉右下角水印。
第2、4、7张删除顶部文字。
第三张到第五张去掉左下角标志，保持人物不变。
除第2张外，其他图片都去掉底部水印。
清除图1文字。
图2和图4都把右下角的标记弄掉，其他不要动。
```

## 本地运行

要求 Node.js 22 或更高版本。

```powershell
Copy-Item .env.example .env
# 编辑 .env，填写 N1N_API_KEY 和 APP_PASSWORD
npm install

# 终端一：后端
$env:N1N_API_KEY="你的密钥"
$env:APP_PASSWORD="你的访问密码"
npm run dev:server

# 终端二：前端
npm run dev
```

访问 `http://localhost:5173`。Vite 会把 `/api` 转发到 `http://localhost:3000`。

## 生产运行

```powershell
npm run build
$env:N1N_API_KEY="你的密钥"
$env:APP_PASSWORD="你的访问密码"
npm start
```

生产服务默认监听 `3000` 端口，并同时提供网页和 API。设置 `APP_PASSWORD` 后，浏览器会弹出私人访问密码框，用户名填写任意值或 `studio`。

## Render 部署

1. 把项目推送到 GitHub。
2. 在 Render 新建 Blueprint，选择仓库中的 `render.yaml`。
3. 在 Render 控制台填写 `N1N_API_KEY` 和 `APP_PASSWORD`。
4. 部署完成后使用 Render 提供的 HTTPS 地址访问，无需购买域名或办理中国大陆 ICP 备案。

## 隐私

- API Key 只存在于服务端环境变量。
- 图片通过内存上传，不写入本地磁盘或数据库。
- 生成结果 URL 由中转站返回，其保留期限以中转站策略为准。
- 仅处理自有或已获授权的图片。
