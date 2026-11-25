# 和我恋爱吧 · HeWoLianAiBa

> 全栈 AI 恋爱模拟游戏 —— 和一个有记忆、有性格、会成长的角色恋爱。实时聊天、好感度系统、AI 军师支招、3D 角色互动、语音通话，全栈 TypeScript 构建。

[![Stars](https://img.shields.io/github/stars/XuanRuiMu/HeWoLianAiBa?style=flat&logo=github)](https://github.com/XuanRuiMu/HeWoLianAiBa/stargazers)
[![Forks](https://img.shields.io/github/forks/XuanRuiMu/HeWoLianAiBa?style=flat&logo=github)](https://github.com/XuanRuiMu/HeWoLianAiBa/forks)
[![License: MIT](https://img.shields.io/github/license/XuanRuiMu/HeWoLianAiBa)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/XuanRuiMu/HeWoLianAiBa)](https://github.com/XuanRuiMu/HeWoLianAiBa/commits/main)
[![Issues](https://img.shields.io/github/issues/XuanRuiMu/HeWoLianAiBa)](https://github.com/XuanRuiMu/HeWoLianAiBa/issues)
[![Repo Size](https://img.shields.io/github/repo-size/XuanRuiMu/HeWoLianAiBa)](https://github.com/XuanRuiMu/HeWoLianAiBa)
[![CI](https://img.shields.io/github/actions/workflow/status/XuanRuiMu/HeWoLianAiBa/ci.yml?label=CI)](https://github.com/XuanRuiMu/HeWoLianAiBa/actions)
[![Stack](https://img.shields.io/badge/stack-Vue3%20%2B%20Express5%20%2B%20PostgreSQL%20%2B%20Redis-blue)](https://github.com/XuanRuiMu/HeWoLianAiBa)

> 🌐 简体中文 ｜ [English](README_EN.md)

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
| **前端**（`QianDuan/`）| Vue 3 + Vite + TypeScript + Pinia + Vue Router + Socket.IO Client + Three.js + PWA |
| **后端**（`HouDuan/`）| Node.js + Express 5 + TypeScript + PostgreSQL + Redis + Socket.IO + OpenTelemetry + pino 日志 |
| **AI** | DeepSeek 等 LLM 接入（`AI引擎.ts`）+ Prompt 构建器 + 情感分析 + 对话摘要 + 关键事件提取 |
| **多模态** | TTS / ASR / 图像生成 / 视频理解（阿里云等供应商接入）|
| **部署** | Docker Compose + nginx + Let's Encrypt（`BuShu/`）|
| **工程规范** | husky + gitleaks（密钥扫描）+ CI + Vitest |

---

