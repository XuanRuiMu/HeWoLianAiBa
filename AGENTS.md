# 和我恋爱吧 - 项目专属规则

## 项目概述

全栈恋爱模拟游戏项目

## GitHub 备份规则

提交信息命名沿用「总控制台」的统一规则；推送与部署由 AI 直接执行，不再经总控制台人工操作（见下文第 2 节与「部署」章节）。

### 1. 仓库信息

- 远程仓库：https://github.com/XuanRuiMu/HeWoLianAiBa
- 主分支：`main`
- 在总控制台 `GIT_REPOS` 中的名称：`和我恋爱吧`

### 2. 提交与推送方式

由 AI 按本文件「部署」章节执行，顺序固定：**整理提交 → 推送 `origin main` → 部署 → 验证**。

不需要再走「总控制台」人工推送流程。禁止改写已推送的历史或强推 `main`；确需改写时先停下问用户。

### 3. 提交信息命名规则

沿用原有命名规范：`YYYY.MM.DD_N`

- `YYYY.MM.DD`：当天日期，点号分隔（如 `2026.07.09`）
- `N`：当天第 N 次提交，从 1 开始递增
- 序号 `N` 由 AI 提交前用 `git log --since=<当天 00:00>` 统计当天已有提交数后加一得出

示例：当天首次推送为 `2026.07.09_1`，第二次为 `2026.07.09_2`。

## 部署

以下内容于 2026-11-04 在本机实际执行并在服务器上验证过，不是推测。

部署属高危操作：动手前先用一句话说明要改哪些文件、影响什么、能否回滚，并取得用户确认（用户已明确要求本轮上线时视为已确认）。

### 1. 服务器现状

- **不用 Docker**：服务器上不存在 `docker` 命令
- 应用目录 `/opt/lianaiba`，**不是 git 仓库**，部署方式为按文件同步
- 登录：`ssh -i "C:\Users\xuanr\.ssh\aliyun_hk_trial" root@47.86.40.118`（主机名 `iZj6c08bwjilei4sstowgyZ`）
- 后端：systemd 服务 `lianaiba.service`，`User=lianaiba`，`WorkingDirectory=/opt/lianaiba/HouDuan`，`ExecStart=/usr/bin/node dist/server.js`，监听 3000
- 前端：nginx 配置 `/etc/nginx/conf.d/lianaiba.conf`，`root /opt/lianaiba/QianDuan/dist`（`/etc/nginx/sites-enabled/lianaiba` 是同一份的软链）
- 隧道：`cloudflared-lianaiba.service`
- 域名：https://hewolianaiba.xuanruimu.top

### 2. 纯静态文件发布（本次实际走的路径）

1. 本地构建：`npm --prefix QianDuan run build`
2. `scp` 上传到服务器 `/tmp/`
3. 在服务器上 `chown lianaiba:lianaiba`、`chmod 644`
4. 先备份旧文件到 `/tmp/<文件名>.旧-YYYYMMDD`（例：`/tmp/block-08.js.旧-20261104`）
5. `mv` 原子覆盖目标文件，例如 `/opt/lianaiba/QianDuan/dist/grass-bg/scripts/block-08.js`；若服务器上还存有 `/opt/lianaiba/QianDuan/public/...` 同名源文件，也一并覆盖，保证两份一致
6. **纯静态改动不需要重启任何服务**，nginx 直接读文件即可（静态资源响应头为 `cache-control: no-cache`）

### 3. 后端变更发布

1. 本地构建：`npm --prefix HouDuan run build`（`tsc` + 复制非 TS 运行时资源）
2. 同步 `HouDuan/dist` 到 `/opt/lianaiba/HouDuan/dist`（同上，先 /tmp、再改属主权限、再原子替换）
3. `systemctl restart lianaiba`
4. 验证：`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/readyz` 为 200，且 `systemctl is-active lianaiba` 为 active

### 4. 数据库迁移

- 代码里的启动迁移链在 [entrypoint.sh](file:///d:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/HouDuan/entrypoint.sh#L11)：`node scripts/run_migration.js QianYi/migrations`，端口/路径以该文件为准
- 该文件是 Docker 镜像入口脚本；**本服务器无 Docker，生产库迁移实际如何执行尚未实测**。遇到后端含迁移时，须先核实（先备份数据库、在临时库试跑），核实清楚前不要动手，也不要编造流程。

### 5. 部署后必查

- 三份 SHA256 一致：本地 `QianDuan/dist`、本地 `QianDuan/public`（同文件存在时）、线上 URL 重新取回的文件
- 首页 200：`Invoke-WebRequest https://hewolianaiba.xuanruimu.top/`
- 后端本机健康检查 200：`127.0.0.1:3000/readyz`
- 三个服务都 active：`systemctl is-active lianaiba nginx cloudflared-lianaiba`

## 本机执行注意（实测踩过的坑）

- 本机 16 GB 内存，`npm test` 会按测试文件数同时起 90 个 worker，内存不够时 vitest 报 `Vitest failed to find the runner` / "failed to find the current suite"，看起来像全量失败。改用 `npx vitest run --maxWorkers=4` 即全绿；这是环境问题，不是代码回归
- 清理进程只按自己启动的 PID 精确结束，**禁止按进程名批量杀 node/chrome**，否则会误杀 `key-shim.js`、总控台网关等无关环境进程
- 上传后必须先改属主与权限再原子 `mv`，避免 nginx 读到半截文件或权限错误
