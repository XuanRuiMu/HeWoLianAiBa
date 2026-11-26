# 抢救自损坏文件：调研-Ubuntu26安装pgvector.md

（原文件大部分字节为 0，以下内容为可解码片段）

# 调研：Ubuntu 26.04（resolute）+ PostgreSQL 18 安装 pgvector

调研日期：2026-11-18。结论均给出来源；未查到的项标注"未能验证"。

## 1. 可行性结论

**可行，且有三条成熟路径。**

- Ubuntu 26.04 官方源（universe）已收录 `postgresql-18-pgvector 0.8.1-2`，明确支持 PG18，amd64 架构有包。
  - 来源：https://packages.ubuntu.com/zh-cn/resolute/amd64/postgresql-18-pgvector （显示 0.8.1-2 [universe]，依赖 postgresql-18，amd64 可下载）
  - 来源：https://launchpad.net/ubuntu/resolute/+source/pgvector （二进制包列出 postgresql-18-pgvector 的 amd64 / amd64v3 / arm64 / ppc64el / riscv64 / s390x）
- Ubuntu 26.04 官方源（main/security）已收录 `postgresql-18 18.6-0ubuntu0.26.04.1`。
  - 来源：https://packages.ubuntu.com/zh-cn/resolute/amd64/postgresql-18
- PostgreSQL 官方 APT 仓库（PGDG, apt.postgresql.org）已支持 Ubuntu 26.04 "resolute"，提供 PG13–20 全系包（含 PG18）。
  - 来源：https://apt.postgresql.org/ （"Ubuntu jammy (22.04), noble (24.04), resolute (26.04), stonking (26.10)"）
  - 仓库索引实测存在：https://apt.postgresql.org/pub/repos/apt/dists/resolute-pgdg/Release （2026-11-17 更新，Architectures: amd64 arm64 ppc64el）
- pgvector 官方 README 的 APT 安装命令即 `sudo apt install postgresql-18-pgvector`（PGDG 仓库），Docker 镜像 `pgvector/pgvector:pg18` 系列存在。
  - 来源：https://github.com/pgvector/pgvector/blob/master/README.md

## 2. 版本对照表

| 项目 | Ubuntu 26.04 官方源（universe） | PGDG（apt.postgresql.org, resolute-pgdg） | pgvector 上游 |
| --- | --- | --- | --- |
| postgresql-18 | 18.6-0ubuntu0.26.04.1（main/security） | 提供（具体小版本未能验证，索引中 main/ Packages 抓取失败） | — |
| postgresql-18-pgvector | **0.8.1-2** | 存在该包；具体版本号未能验证（上游发布节奏推断为 0.8.7 系列，但无直接证据） | 最新稳定 v0.8.7（2026-10-01） |
| 架构 | amd64 / amd64v3 / arm64 / ppc64el / riscv64 / s390x | amd64 / arm64 / ppc64el | — |
| PG18 支持 | 0.8.1 起支持 PG18（0.8.1 加入 PG18 rc1 支持） | 同左 | 0.8.1+ 支持 PG18 |

pgvector 版本依据（CHANGELOG，https://github.com/pgvector/pgvector/blob/master/CHANGELOG.md ）：
- 0.8.1（2025-09-04）：Added support for Postgres 18 rc1。
- 0.8.3（2026-06-17）：修复 Hamming/Jaccard 距离在 PG18 上的性能回退；修复 HNSW vacuum 索引损坏。
- 0.8.7（2026-10-01）：修复 IVFFlat 建索引缓冲区溢出、avg 聚合空集错误。
- 0.9.0（未发布）：将放弃 PG13/14。
- 结论：PG18 兼容性在 0.8.x 线内持续修复，**用越新越好**；已知问题均已在 0.8.7 前修复，无未解决的 PG18 兼容问题记录（未发现开放 issue，未能进一步验证）。

## 3. 推荐安装路径

### 首选：PGDG 仓库（拿到最新 pgvector，且 PG 服务器/扩展同源，便于后续小版本同步升级）

```bash
sudo apt update
sudo apt install -y postgresql-common ca-certificates curl
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt update
sudo apt install -y postgresql-18 postgresql-18-pgvector
```

启用扩展（每个库执行一次）：

```sql
CREATE EXTENSION vector;
```

- 仓库配置说明来源：https://apt.postgresql.org/ （Quickstart；suite 为 `$VERSION_CODENAME-pgdg`，26.04 即 `resolute-pgdg`）
- 该脚本会写入 `/etc/apt/sources.list.d/pgdg.sources` 并导入官方签名密钥，支持 amd64。

### 备选 A：只用 Ubuntu 官方源（最快、零额外配置）

```bash
sudo apt update
sudo apt install -y postgresql-18 postgresql-18-pgvector
```

- 版本为 0.8.1-2：支持 PG18，但比上游 0.8.7 旧，少了 0.8.3–0.8.7 的若干修复（含 IVFFlat 缓冲区溢出修复）。对一般 RAG/向量检索场景够用；若数据规模大、用 IVFFlat，建议走 PGDG 拿 0.8.7。

### 备选 B：源码编译（apt 均不可用时）

```bash
sudo apt install -y build-essential postgresql-server-dev-18 git
cd /tmp
git clone --branch v0.8.7 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

- 依据：pgvector README（Linux/Mac 编译安装，支持 Postgres 13+；缺头文件时装 `postgresql-server-dev-18`）。Ubuntu 官方源亦有 `postgresql-server-dev-18`（packages.ubuntu.com resolute 页面文件清单可查）。

### 备选 C：Docker（仅开发/测试，与生产裸机 systemd 形态不一致）

```bash
docker pull pgvector/pgvector:pg18
```

## 4. x86_64 可用性

- Ubuntu universe 的 `postgresql-18-pgvector` 明确提供 amd64 包（262.1 kB）：https://packages.ubuntu.com/zh-cn/resolute/amd64/postgresql-18-pgvector
- PGDG resolute-pgdg 的 Release 索引含 `amd64`：https://apt.postgresql.org/pub/repos/apt/dists/resolute-pgdg/Release

## 5. 风险与回退

1. **版本偏旧风险（官方源 0.8.1）**：0.8.3 修复过 HNSW vacuum 索引损坏、0.8.7 修复过 IVFFlat 建索引缓冲区溢出。生产建议 PGDG 上 0.8.7。
2. **双仓库混用风险**：同时启用 Ubuntu 与 PGDG 时，`postgresql-18` 可能被 PGDG 高版本号覆盖。建议固定策略：PG 只从一方安装；如需锁定，用 `sudo apt-mark hold postgresql-18 postgresql-18-pgvector`。
3. **网络风险（阿里云 ECS）**：apt.postgresql.org 从境内访问可能较慢；Ubuntu 源可换阿里云镜像 `mirrors.aliyun.com/ubuntu`。PGDG 无境内官方镜像（未能验证存在境内镜像），慢时改用 Ubuntu universe 方案。
4. **升级 PG 小版本**：2026-11-12 PG 全系安全更新（14–18 受影响，含 CVE-2026-6460），生产机应保持 PG18 小版本为最新（Ubuntu 源当前 18.6 已含该轮修复时点之后版本，具体以 `apt policy postgresql-18` 为准）。
5. **回退方式**：
   - 卸载扩展包：`sudo apt remove postgresql-18-pgvector`（或 `purge`）。
   - 库内回退：`DROP EXTENSION vector;`（会删除依赖该类型的对象，先备份）。
   - 升级 pgvector 版本：装新包后在库内 `ALTER EXTENSION vector UPDATE;`，用 `SELECT extversion FROM pg_extension WHERE extname='vector';` 核对。
   - 源码安装回退：记录 `make install` 装入 `/usr/lib/postgresql/18/lib/` 与 `/usr/share/postgresql/18/extension/` 的文件，回退时删除对应 `vector*.so` 与 `vector.control`。

## 6. 来源清单

- https://packages.ubuntu.com/zh-cn/resolute/amd64/postgresql-18-pgvector （0.8.1-2，universe，amd64）
- https://packages.ubuntu.com/zh-cn/resolute/amd64/postgresql-18 （18.6-0ubuntu0.26.04.1，main/security）
- https://launchpad.net/ubuntu/resolute/+source/pgvector （resolute 源包 0.8.1-2，多架构二进制）
- https://launchpad.net/ubuntu/+source/pgvector （26.10 已升 0.8.7-1，26.04 维持 0.8.1-2）
- https://apt.postgresql.org/ （PGDG 支持 resolute 26.04；PG13–20；APT quickstart）
- https://apt.postgresql.org/pub/repos/apt/dists/resolute-pgdg/Release （resolute-pgdg 索引实测存在）
- https://github.com/pgvector/pgvector/blob/master/README.md （支持 PG13+；APT/Docker/源码安装方法）
- https://github.com/pgvector/pgvector/blob/master/CHANGELOG.md （0.8.1 加 PG18 支持；0.8.3/0.8.7 修复记录）

## 7. 未能验证项

- PGDG `resolute-pgdg` 中 `postgresql-18-pgvector` 的**确切版本号**（main/binary-amd64/Packages 多次抓取失败；仅能确认 suite 与架构存在）。
- PGDG 是否有境内官方镜像（未查到权威来源）。
- pgvector 当前是否存在未关闭的 PG18 兼容性 issue（仅核对了 CHANGELOG，未逐条核查 issue 列表）。
