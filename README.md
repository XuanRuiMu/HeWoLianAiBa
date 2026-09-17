# 和我恋爱吧 · HeWoLianAiBa

> 全栈 AI 恋爱模拟游戏 —— 和一个有记忆、有性格、会成长的角色恋爱。实时聊天、好感度系统、AI 军师支招、3D 角色互动、语音通话，全栈 TypeScript 构建。

[![Stars](https://img.shields.io/github/stars/XuanRuiMu/HeWoLianAiBa?style=flat&logo=github)](https://github.com/XuanRuiMu/HeWoLianAiBa/stargazers)
[![Forks](https://img.shields.io/github/forks/XuanRuiMu/HeWoLianAiBa?style=flat&logo=github)](https://github.com/XuanRuiMu/HeWoLianAiBa/forks)
[![Last Commit](https://img.shields.io/github/last-commit/XuanRuiMu/HeWoLianAiBa)](https://github.com/XuanRuiMu/HeWoLianAiBa/commits/main)
[![Issues](https://img.shields.io/github/issues/XuanRuiMu/HeWoLianAiBa)](https://github.com/XuanRuiMu/HeWoLianAiBa/issues)
[![Repo Size](https://img.shields.io/github/repo-size/XuanRuiMu/HeWoLianAiBa)](https://github.com/XuanRuiMu/HeWoLianAiBa)
[![CI](https://img.shields.io/github/actions/workflow/status/XuanRuiMu/HeWoLianAiBa/ci.yml?label=CI)](https://github.com/XuanRuiMu/HeWoLianAiBa/actions)
[![Stack](https://img.shields.io/badge/stack-Vue3%20%2B%20Express5%20%2B%20PostgreSQL%20%2B%20Redis-blue)](https://github.com/XuanRuiMu/HeWoLianAiBa)

---

## 这是什么？

**和我恋爱吧** 是一款跑在浏览器里的 AI 恋爱模拟游戏：

- 与一个 **有长期记忆、有角色性格、会随好感度变化** 的 AI 角色恋爱；
- **实时聊天**（Socket.IO），随时秒回；
- 聊得越好 **好感度** 越高，角色对你的态度与剧情随之改变；
- 可以把你 AI 角色的烦恼抛给 **AI 军师**，让它给你支招；
- 支持 **3D 角色形象** 与 **语音** 互动、**语音 / 视频通话**、**截图留念**、**挑战 / 战绩** 玩法；
- 附带**专属管理后台**（[恋爱吧管理中心](https://github.com/XuanRuiMu/LianAiBaGuanLiZhongXin)），账号 / 聊天 / 封禁 / 审计 / 统计一屏管理。

---

## 核心玩法

| 玩法 | 说明 |
| --- | --- |
| 💬 AI 实时聊天 | Socket.IO 实时消息，多模态输入（文字 / 语音 / 图片）|
| 💝 好感度系统 | 对话驱动好感度变化，影响角色态度与剧情走向 |
| 👤 角色设定 | 可生成专属 AI 角色（用户人设 / 角色档案 / 记忆系统）|
| 🧠 AI 军师 | 恋爱难题抛给军师，AI 给建议（策略配置可调）|
| 🎭 3D 角色互动 | Three.js 角色形象，动作 / 姿态互动 |
| 🗣️ 语音能力 | TTS 播放角色语音、ASR 语音输入、AI 语音理解 |
| 📞 语音 / 视频通话 | 实时通话（WebRTC / Socket.IO 信令）|
| 🏆 挑战与战绩 | 挑战任务体系、积分榜、过往战绩回看 |
| 📸 截图留念 | 记录你们的美好瞬间 |
| 🛡️ 安全合规 | 内容审核、安全词库、行为验证、危机干预、协议留痕、数据保存期限 |

---

## 技术栈

| 层 | 技术 |
| --- | --- |
| **前端**（`frontend/`）| Vue 3 + Vite + TypeScript + Pinia + Vue Router + Socket.IO Client + Three.js + PWA |
| **后端**（`backend/`）| Node.js + Express 5 + TypeScript + PostgreSQL + Redis + Socket.IO + OpenTelemetry + pino 日志 |
| **AI** | DeepSeek 等 LLM 接入（`AI引擎.ts`）+ Prompt 构建器 + 情感分析 + 对话摘要 + 关键事件提取 |
| **多模态** | TTS / ASR / 图像生成 / 视频理解（阿里云等供应商接入）|
| **部署** | Docker Compose + nginx + Let's Encrypt（`deploy/`）|
| **工程规范** | husky + commitlint + gitleaks（密钥扫描）+ CI + Playwright E2E + Vitest |

---

## 快速开始

### 本地开发

```bash
# 1. 安装依赖
npm install                      # 根目录（husky/commitlint）
npm --prefix frontend install
npm --prefix backend install

# 2. 配置环境变量（参照 .env.example）
cp .env.example .env             # 根配置
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# 3. 初始化数据库
psql -f database/000_baseline.sql        # 基础表
psql -f database/001_haoyou_yu_shezhi.sql # 好友/设置

# 4. 启动
npm --prefix backend run dev     # 后端（默认 3000）
npm --prefix frontend run dev    # 前端（Vite dev server）
```

> Windows 用户也可直接在根目录运行 `start.ps1` 一键启动。

### Docker 部署

```bash
docker compose up -d             # backend + frontend + postgres + redis + nginx
```

> 完整部署与备份见 [deploy/备份与恢复.md](deploy/备份与恢复.md)、[deploy/nginx.conf](deploy/nginx.conf)。

---

## 数据库设计

表结构体现完整的产品域建模（`database/`）：

```text
用户 · 角色 · 消息 · 好感度 · 记忆 · 对话摘要 · 用户人设 · 游戏档案 · 游戏结局
好友申请 · 好友消息 · 用户设置 · 通知 · 反馈 · 评估 · 媒体文件 · 通话记录
挑战积分 · 战绩 · 封禁记录 · 审计日志 · 关键事件 · 协议留痕 · 夺舍日志 · schema_migrations
```

> 详细 API 见 [docs/API文档](docs/)；面向 AI 的调用有 `DeepSeek客户端.ts`、`AI引擎.ts` 等独立模块，便于替换供应商。

---

## 项目结构

```text
HeWoLianAiBa/
├── frontend/                  # Vue 3 前端
│   └── src/
│       ├── views/             # 聊天页面·登录·好友聊天·好友列表·挑战主页·挑战积分榜·
│       │                      # 军师记录详情·过往战绩·通知·账号与安全·添加微信·气泡设置…
│       ├── components/        # 通话界面·军师指导·用户资料卡·头像裁剪·挑战渣型提示…
│       ├── layouts/           # 认证布局（登录/注册）
│       └── …（stores / router / api / config）
├── backend/                   # Express 5 后端
│   └── src/
│       ├── routes/            # 认证·消息·角色·角色详情·好友·好感度·军师·挑战·战绩·
│       │                      # 媒体·通知·用户设置·资料·管理员·功能开关·健康检查…
│       ├── services/          # AI引擎·AI回复调度器·好感度·记忆·对话摘要·情感分析·
│       │                      # 军师·TTS·语音转写·通话·媒体·审核·审计·战绩·挑战·通知…
│       ├── socket/            # 实时通信：聊天·通话·认证·通知·夺舍·日志推送
│       ├── middleware/        # 认证·管理员·限流·安全·输入验证·IP封禁·日志追踪
│       └── config/            # AI·好感度·角色·军师·挑战·多模态·TTS·通话·气泡主题…
├── database/                  # SQL 建表（基线 + 增量）
├── deploy/                    # docker/nginx/letsencrypt/备份
├── docs/                      # 项目文档
├── 吴昊阳3D模型*/              # 3D 角色模型资产（GLB/Blender）
├── .github/workflows/ci.yml   # CI
└── docker-compose.yml
```

---

## 测试

```bash
npm --prefix frontend test          # Vitest 单测 + 组件测试
npm --prefix frontend run test:e2e  # Playwright E2E（fp-*.spec.ts 全流程）
npm --prefix backend test           # 后端单元 / 集成测试
```

前端 E2E 覆盖完整用户旅程：认证 → 聊天 → 好友 → 军师 → 挑战 → 收尾（见 `frontend/tests/`）。

---

## 相关项目

- 🛠️ [恋爱吧管理中心](https://github.com/XuanRuiMu/LianAiBaGuanLiZhongXin) —— 专属运营管理后台（账号 / 聊天 / 审核 / 封禁 / 审计 / 统计）

---

## 许可证

本仓库仅作项目开源展示。**Made with ❤️ —— 认真谈一场 AI 恋爱。**