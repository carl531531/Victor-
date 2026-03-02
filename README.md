# Victor Nova Defense

一个经典《导弹指挥官》风格的塔防游戏。

## 部署到 Vercel 指南

### 1. 准备 GitHub 仓库
- 在 GitHub 上创建一个新的仓库。
- 将此代码推送到您的 GitHub 仓库：
  ```bash
  git init
  git add .
  git commit -m "Initial commit"
  git remote add origin <您的仓库URL>
  git branch -M main
  git push -u origin main
  ```

### 2. 在 Vercel 上部署
- 登录 [Vercel](https://vercel.com)。
- 点击 **"Add New"** -> **"Project"**。
- 导入您的 GitHub 仓库。
- **配置环境变量 (Environment Variables)**:
  - 如果您使用了 Gemini AI 功能，请添加 `GEMINI_API_KEY`。
- 点击 **"Deploy"**。

## 本地开发

安装依赖：
```bash
npm install
```

启动开发服务器：
```bash
npm run dev
```

构建生产版本：
```bash
npm run build
```

## 技术栈
- React 19
- Vite
- Tailwind CSS 4
- Motion (Framer Motion)
- Lucide React
