@..\AGENTS.md
<!-- markdownlint-disable-file MD041 -->
<!-- 说明：第1行为Claude Code引用语法，必须保留 -->

# 和我恋爱吧 - 项目专属规则

<!-- version: 2026-07-07 -->

## 项目概述

全栈恋爱模拟游戏项目。

- 前端：Vue 3 + Vite + TypeScript
- 后端：Node.js + Express + TypeScript + PostgreSQL + Redis
- 部署：Docker Compose

## 关键架构

```text
AuthLayout.vue (父布局: 左侧动画 + 右侧内容区)
  └── router-view
       └── LoginContent.vue (子组件: 只有表单)
⚠️ 注意: LoginView.vue 是废弃文件，路由实际加载的是 AuthLayout + LoginContent
```

## 环境配置

本地开发环境配置见本目录 `.env` 文件。Agent 读取环境变量时请从 `.env` 获取，不要硬编码。

## 项目特定规则

- 前端路由、登录态、军师角色相关修改必须先核对上述架构说明
- 短信认证、DeepSeek AI 调用、好感度计算等涉及外部服务或核心玩法的改动，修改后必须运行对应测试

## 其他规则

- Playwright MCP 测试截图统一保存到和我恋爱吧/测试截图目录

## GitHub 备份规则

每次完成代码修改后，必须对本项目文件夹执行「清理 → 提交 → 推送」闭环，确保仓库始终保持干净可用的最新状态。

### 1. 清理项目文件夹

提交前必须删除过程性文件，只保留有价值的源码与配置：

- 编译产物：`node_modules/`、`dist/`、`*.tsbuildinfo`、`package-lock.json`（已在 `.gitignore` 中声明）
- 测试与日志：`tests/`、`test-results/`、`playwright-report/`、`*.log`
- 系统杂项：`.DS_Store`、`Thumbs.db`
- 调试中间产物、临时截图、过期版本备份
- 已在 `.gitignore` 中声明的其他文件一律不得入库

清理范围以 `.gitignore` 为准；若发现新的过程性文件类型，应同步补充到 `.gitignore`。

### 2. 提交信息命名规则

提交信息格式：`YYYY.MM.DD_N`

- `YYYY.MM.DD`：当天日期，使用点号分隔（如 `2026.07.07`）
- `N`：当天第 N 次提交，从 1 开始递增

`N` 的计算方式：先执行

```bash
git log --oneline --grep="^YYYY.MM.DD" --since=today
```

统计当天已有的提交数量，再加 1 得到本次提交的序号。例如当天已有 2 条以 `2026.07.07` 开头的提交记录，则本次提交信息为 `2026.07.07_3`。

### 3. 推送命令序列

```bash
git add -A
git commit -m "YYYY.MM.DD_N"
git push
```

### 4. 推送前自检

- 确认 `git status` 中无敏感文件（`.env`、凭据文件等）
- 确认远程分支为 `main`
- 若推送失败，先 `git pull` 解决冲突后再推送，禁止使用 `--force`
