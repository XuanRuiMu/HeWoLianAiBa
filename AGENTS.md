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

本节是当前实测可用的部署方法。若只改了前端静态文件，可按旧说明走“纯静态文件发布”；若改了后端或需要完整发布，直接按下面的“推荐部署流程”执行。

### 1. 服务器现状

- **不用 Docker**：服务器上不存在 `docker` 命令
- 应用目录 `/opt/lianaiba`，**不是 git 仓库**，部署方式为按文件同步
- 后端：systemd 服务 `lianaiba.service`，`User=lianaiba`，`WorkingDirectory=/opt/lianaiba/HouDuan`，`ExecStart=/usr/bin/node dist/server.js`，监听 3000
- 前端：nginx 配置 `/etc/nginx/conf.d/lianaiba.conf`，`root /opt/lianaiba/QianDuan/dist`
- 隧道：`cloudflared-lianaiba.service`
- 域名：https://hewolianaiba.xuanruimu.top
- 公网 IP：`47.86.40.118`
- SSH 22 端口：**不是公网全开放**。已放行 `218.68.0.0/16` 和阿里云 Workbench 网段 `100.104.0.0/16`。若本机公网 IP 不在允许网段内，直接 SSH 会超时
- 阿里云云助手已启用，可用 AccessKey 通过 API 在服务器执行命令
- Chrome 已安装 DSH Bridge 扩展；本机已注册原生宿主 `com.dsh.bridge`，可通过桥接控制 Chrome 打开阿里云 Workbench 网页终端

### 2. 推荐部署流程（2026-11-18 实测通过）

1. 本地确认代码已提交并推送到 `origin/main`。
2. 本地构建：
   - 后端：`npm --prefix HouDuan run build`
   - 前端：`npm --prefix QianDuan run build`
3. 优先尝试 SSH；若 22 端口超时，不要卡在这里，改走下面第 4 步的云助手或 Workbench。
4. 服务器无法直接 SSH 时，用阿里云云助手执行命令：
   - 在 `/tmp` 拉取 GitHub 最新 `main`：
     ```bash
     rm -rf /tmp/lianaiba-github
     mkdir -p /tmp/lianaiba-github
     cd /tmp/lianaiba-github
     curl -L --fail --retry 3 -o repo.tar.gz https://github.com/XuanRuiMu/HeWoLianAiBa/archive/refs/heads/main.tar.gz
     tar -xzf repo.tar.gz --strip-components=1
     ```
   - 同步代码到 `/opt/lianaiba`：
     ```bash
     cd /opt/lianaiba
     rsync -a --delete /tmp/lianaiba-github/HouDuan/src/ HouDuan/src/
     rsync -a --delete /tmp/lianaiba-github/HouDuan/QianYi/ HouDuan/QianYi/
     rsync -a --delete /tmp/lianaiba-github/HouDuan/scripts/ HouDuan/scripts/
     cp /tmp/lianaiba-github/HouDuan/package.json HouDuan/package.json
     ```
   - 服务器上构建：
     ```bash
     npm --prefix HouDuan run build
     npm --prefix QianDuan run build
     ```
   - 重启并验证：
     ```bash
     systemctl restart lianaiba
     sleep 8
     curl -s -o /dev/null -w "readyz=%{http_code}\n" http://127.0.0.1:3000/readyz
     systemctl is-active lianaiba nginx cloudflared-lianaiba
     ```
5. 若云助手也临时不可用，用 Chrome 打开阿里云 ECS 控制台，进入实例详情，点“远程连接 → 网页连接 → 立即登录”，在 Workbench 网页终端里执行同样命令。
6. 部署后必查：
   - `systemctl is-active lianaiba nginx cloudflared-lianaiba` 全部为 `active`
   - `curl http://127.0.0.1:3000/readyz` 返回 200
   - 公网首页 https://hewolianaiba.xuanruimu.top 返回 200
   - 公网 `/readyz` 返回 200
   - 需要时对比本地与服务器关键文件 SHA256

### 3. 生产日志设置

服务器 `/opt/lianaiba/HouDuan/.env` 当前应保持：

```env
LOG_LEVEL=info
TI_SHI_CI_RI_ZHI_QI_YONG=false
```

- `LOG_LEVEL=info`：生产环境不输出完整提示词和聊天正文。
- `TI_SHI_CI_RI_ZHI_QI_YONG=false`：关闭完整模型输入日志。
- 本地开发可按需打开完整日志，但不要把打开状态复制到服务器。

### 4. 数据库迁移

- 代码里的启动迁移链在 `HouDuan/entrypoint.sh`：`node scripts/run_migration.js QianYi/migrations`
- 本服务器无 Docker；遇到后端含迁移时，先备份数据库、在临时库试跑，核实清楚前不要执行。

### 5. 旧静态文件发布方式（仅适用于纯前端静态小改动）

1. 本地构建：`npm --prefix QianDuan run build`
2. `scp` 上传到服务器 `/tmp/`
3. 在服务器上 `chown lianaiba:lianaiba`、`chmod 644`
4. 先备份旧文件到 `/tmp/<文件名>.旧-YYYYMMDD`
5. `mv` 原子覆盖目标文件
6. 纯静态改动不需要重启服务

## 本机执行注意（实测踩过的坑）

- 本机 16 GB 内存，`npm test` 会按测试文件数同时起 90 个 worker，内存不够时 vitest 报 `Vitest failed to find the runner` / "failed to find the current suite"，看起来像全量失败。改用 `npx vitest run --maxWorkers=4` 即全绿；这是环境问题，不是代码回归
- 清理进程只按自己启动的 PID 精确结束，**禁止按进程名批量杀 node/chrome**，否则会误杀 `key-shim.js`、总控台网关等无关环境进程
- 上传后必须先改属主与权限再原子 `mv`，避免 nginx 读到半截文件或权限错误
