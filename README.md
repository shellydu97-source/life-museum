# 🏛️ 人生博物馆 · Life Museum (v2.2)

> 每个人都有一座属于自己的记忆星空 ✨  
> 云端加密保存 · 手机电脑随时同步 · 专属免登录公开分享

🌐 **在线体验地址**：[https://life-museum-bwo.pages.dev/](https://life-museum-bwo.pages.dev/)

---

## 🌟 核心特性

- **📧 独立个人账号与邮箱验证**：
  - 基于 Supabase Auth，支持邮箱验证码注册与激活。
  - 支持「忘记密码」邮箱一键找回与密码重置。
- **☁️ 云端自动同步**：
  - 本地与云端多副本存储机制（秒开 + 后台静默同步）。
  - 支持多设备（手机、平板、电脑）无缝切换与数据漫游。
- **🔗 免登录访客分享与隐私脱敏**：
  - 馆主可在「我的」页面一键生成专属公开分享链接（如 `?share=xxxx`）。
  - **朋友点开无需注册或登录**即可沉浸式参观。
  - 隐私物理脱敏：设为「🔒 独家」的展厅、展品及「秘密花园」在生成分享数据时由算法物理剔除，访客绝对不可见。
- **📱 移动端单屏紧凑适配**：
  - 针对手机端全面压缩统计指标、展厅卡片、时间轴与展品列表高度。
  - 消除冗长滑动，保留毛玻璃星空美学与平滑过渡微动效。
- **🌌 记忆星空与多维展厅**：
  - 3D/Canvas 记忆星图漫游。
  - 涵盖童年、成长、里程碑、灵感、秘密等丰富展厅。

---

## 🛠️ 技术架构

- **前端界面**：原生 HTML5 + 现代化 CSS3（纯 CSS Variables、毛玻璃 Glassmorphism） + 原生 JavaScript（ES6+），零构建、零打包、开箱即用。
- **网站托管**：[Cloudflare Pages](https://pages.cloudflare.com/)（全球边缘加速，国内访问极速稳定）。
- **云端服务**：[Supabase](https://supabase.com/)（PostgreSQL + GoTrue Auth + Row Level Security 行级安全防护）。

---

## 📂 目录结构

```text
life-museum/
├── index.html              # 主应用入口
├── style.css               # 全局星空与移动端紧凑化样式
├── js/
│   ├── cloud.js            # Supabase 认证、云同步、免登录分享核心模块
│   ├── data.js             # 默认馆藏模型与数据结构迁移
│   ├── effects.js          # 星空粒子背景、音效与微动效
│   ├── main.js             # 路由调度与全局生命周期
│   ├── render-explore.js   # 展厅与展品渲染
│   ├── timeline.js         # 人生时间轴视图
│   ├── editor.js           # 展品添加、编辑与富文本
│   ├── constellation.js    # 记忆星空 Canvas 可视化
│   └── me.js               # 个人设置、云同步管理与公开分享
├── supabase-setup.sql      # Supabase 数据库表结构与 RLS 安全策略脚本
├── 手机适配说明.md         # 移动端优化与设计规范说明
└── README.md               # 项目说明文档
```

---

## 🚀 本地运行与部署

### 1. 本地直接预览
无需安装 Node.js 环境，直接用浏览器打开 `index.html` 即可运行。

### 2. 部署到 Cloudflare Pages
1. 将本项目推送到 GitHub 仓库。
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Workers & Pages** -> **Create application** -> **Pages**。
3. 连接 GitHub 仓库，构建设置留空，部署分支选择 `main` 即可自动持续集成！

---

## 📄 开源许可
MIT License © 2026 Life Museum
