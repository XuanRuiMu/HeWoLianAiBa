# HeWoLianAiBa · 和我恋爱吧

> A full-stack AI romance simulation game — fall in love with a character who has memory, personality, and growth. Real-time chat, a favor-ability system, an AI advisor ("军师"), 3D character interactions, and voice calls. Built end-to-end in TypeScript.

[![Stars](https://img.shields.io/github/stars/XuanRuiMu/HeWoLianAiBa?style=flat&logo=github)](https://github.com/XuanRuiMu/HeWoLianAiBa/stargazers)
[![Forks](https://img.shields.io/github/forks/XuanRuiMu/HeWoLianAiBa?style=flat&logo=github)](https://github.com/XuanRuiMu/HeWoLianAiBa/forks)
[![License: MIT](https://img.shields.io/github/license/XuanRuiMu/HeWoLianAiBa)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/XuanRuiMu/HeWoLianAiBa)](https://github.com/XuanRuiMu/HeWoLianAiBa/commits/main)
[![Issues](https://img.shields.io/github/issues/XuanRuiMu/HeWoLianAiBa)](https://github.com/XuanRuiMu/HeWoLianAiBa/issues)
[![Repo Size](https://img.shields.io/github/repo-size/XuanRuiMu/HeWoLianAiBa)](https://github.com/XuanRuiMu/HeWoLianAiBa)
[![CI](https://img.shields.io/github/actions/workflow/status/XuanRuiMu/HeWoLianAiBa/ci.yml?label=CI)](https://github.com/XuanRuiMu/HeWoLianAiBa/actions)
[![Stack](https://img.shields.io/badge/stack-Vue3%20%2B%20Express5%20%2B%20PostgreSQL%20%2B%20Redis-blue)](https://github.com/XuanRuiMu/HeWoLianAiBa)

> 🌐 [中文](README.md) ｜ English

---

## What is this?

**和我恋爱吧 (HeWoLianAiBa)** is an AI romance simulation game that runs in your browser:

- Fall in love with an AI character with **long-term memory, personality, and favor-ability-driven change**;
- **Real-time chat** (Socket.IO), instant replies;
- The better you chat, the higher the **favor-ability**, shifting the character's attitude and story direction;
- Ask the **AI advisor ("军师")** for relationship advice;
- **3D character** with **voice** interaction, **voice/video calls**, **screenshots**, and **challenges / records**;
- Ships with a **dedicated ops console** ([恋爱吧管理中心](https://github.com/XuanRuiMu/LianAiBaGuanLiZhongXin)) — accounts / chat / bans / audit / stats in one screen.

---

## Core gameplay

| Feature | Description |
| --- | --- |
| 💬 Real-time AI chat | Socket.IO messaging with multimodal input (text / voice / images) |
| 💝 Favor-ability system | Conversation-driven favor changes, affecting attitude & story |
| 👤 Character setup | Generate your own AI character (user persona / profile / memory) |
| 🧠 AI advisor | Toss relationship problems to the 军师 for advice (configurable strategy) |
| 🎭 3D character | Three.js character with movement / pose interaction |
| 🗣️ Voice | TTS voice playback, ASR input, AI voice understanding |
| 📞 Voice / video calls | Real-time calls (WebRTC / Socket.IO signaling) |
| 🏆 Challenges & records | Challenge system, leaderboard, past-record replay |
| 📸 Screenshots | Capture your precious moments |
| 🛡️ Safety & compliance | Content review, safety lexicon, behavior verification, crisis intervention, consent records, data retention |

---

## Tech stack

| Layer | Technology |
| --- | --- |
| **Frontend** (`frontend/`) | Vue 3 + Vite + TypeScript + Pinia + Vue Router + Socket.IO Client + Three.js + PWA |
| **Backend** (`backend/`) | Node.js + Express 5 + TypeScript + PostgreSQL + Redis + Socket.IO + OpenTelemetry + pino logging |
| **AI** | DeepSeek & other LLMs (`AI引擎.ts`) + Prompt builder + sentiment analysis + conversation summaries + key-event extraction |
| **Multimodal** | TTS / ASR / image generation / video understanding (Alibaba Cloud & other vendors) |
| **Deploy** | Docker Compose + nginx + Let's Encrypt (`deploy/`) |
| **Engineering** | husky + commitlint + gitleaks (secret scanning) + CI + Vitest |

---

## Quick start

### Local development

```bash
# 1. Install deps
npm install                      # root (husky/commitlint)
npm --prefix frontend install
npm --prefix backend install

# 2. Configure env (see .env.example files)
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# 3. Init the database
psql -f database/000_baseline.sql        # base tables
psql -f database/001_haoyou_yu_shezhi.sql # friends/settings

# 4. Start
npm --prefix backend run dev     # backend (port 3000)
npm --prefix frontend run dev    # frontend (Vite dev server)
```

> Windows: just run `start.ps1` at the repo root.

### Docker

```bash
docker compose up -d             # backend + frontend + postgres + redis + nginx
```

> See [deploy/备份与恢复.md](deploy/备份与恢复.md) and [deploy/nginx.conf](deploy/nginx.conf).

---

## Database design

The schema reflects the full product domain (`database/`):

```text
用户 · 角色 · 消息 · 好感度 · 记忆 · 对话摘要 · 用户人设 · 游戏档案 · 游戏结局
好友申请 · 好友消息 · 用户设置 · 通知 · 反馈 · 评估 · 媒体文件 · 通话记录
挑战积分 · 战绩 · 封禁记录 · 审计日志 · 关键事件 · 协议留痕 · 夺舍日志 · schema_migrations
```

> AI-facing calls live in `DeepSeek客户端.ts`, `AI引擎.ts` etc., so providers can be swapped easily.

---

## Project structure

```text
HeWoLianAiBa/
├── frontend/                 # Vue 3 frontend
│   └── src/
│       ├── views/            # chat · auth · friend-chat · friend-list · challenges · leaderboard ·
│       │                     # advisor records · past records · notifications · account/security · WeChat · bubble settings …
│       ├── components/       # call UI · advisor guide · profile card · avatar crop · challenge hints …
│       ├── layouts/          # auth layout (login/register)
│       └── … (stores / router / api / config)
├── backend/                  # Express 5 backend
│   └── src/
│       ├── routes/           # auth · message · character · character-detail · friends · favor ·
│       │                     # advisor · challenges · records · media · notifications · settings …
│       ├── services/         # AI engine · AI reply scheduler · favor · memory · summaries · sentiment ·
│       │                     # advisor · TTS · ASR · calls · media · review · audit · records · challenges …
│       ├── socket/           # realtime: chat · calls · auth · notifications · takeover · log push
│       ├── middleware/       # auth · admin · rate limit · security · input validation · IP ban · log tracing
│       └── config/           # AI · favor · character · advisor · challenges · multimodal · TTS · calls · bubble themes …
├── database/                 # SQL schemas (baseline + increments)
├── deploy/                   # docker / nginx / letsencrypt / backups
├── docs/                     # project docs
├── .github/workflows/ci.yml  # CI
└── docker-compose.yml
```

---

## Tests

```bash
npm --prefix frontend test          # Vitest unit + component tests
npm --prefix backend test           # backend unit / integration
```

---

## Related projects

- 🛠️ [恋爱吧管理中心](https://github.com/XuanRuiMu/LianAiBaGuanLiZhongXin) — dedicated ops console (accounts / chat / review / bans / audit / stats)

---

## License

[MIT](LICENSE) — open-source showcase repository. **Made with ❤️ — take an AI romance seriously.**