# 抢救自损坏文件：服务器pgvector安装验证记录.md

（原文件大部分字节为 0，以下内容为可解码片段）

# 服务器 pgvector 安装与验证记录

日期：2026-11-18。目标：验证"方案 A（pgvector + 512 维中文 embedding）"在生产服务器上确实可行。

## 服务器环境（实测）

- 实例：i-j6c08bwjilei4sstowgy（阿里云 cn-hongkong，ecs.e-c1m1.large，2C2G），公网 47.86.40.118
- 系统：Ubuntu 26.04.1 LTS（与调研结论一致）
- PostgreSQL：18.6（Ubuntu 18.6-1.pgdg26.04+2，PGDG 源已配置且在线），服务 active
- 业务库：lianaiba（40 张表，含"系统表情"表 40 行）
- 连接方式：SSH 22 超时（公网未放行），改用阿里云云助手 RunCommand API 执行，全部成功

## 已完成的操作（全部实测通过）

1. **安装扩展包**：`apt-get install -y postgresql-18-pgvector` → 装上 **0.8.7-1.pgdg26.04+2**（正是调研推荐的上游最新版）
2. **启用扩展**：`CREATE EXTENSION vector;` → `vector|0.8.7`
3. **功能冒烟测试**：建临时表 → 插入 3 条 4 维向量 → 余弦距离排序返回正确（0 / 0.087 / 0.333）→ 建 HNSW cosine 索引成功 → 清理
4. **业务表升级**：给"系统表情"表新增两列：
   - `检索文本 text`（存中文重写后的检索文本）
   - `向量 vector(512)`（bge-small-zh-v1.5 维度）
5. **建索引**：`系统表情_向量_hnsw`（HNSW，vector_cosine_ops，partial：仅启用且向量非空）
6. **端到端向量查询验证**：插入一条 512 维测试向量 → 按 `<=>` 余弦距离排序查询命中正确 → 删除测试行。当前向量列 0 行（待灌入真实数据），表结构/索引/查询链路全部就绪

## 当前状态

- pgvector 0.8.7 已在生产库 lianaiba 生效
- "系统表情"表已具备 检索文本 + 向量(512) 两列和 HNSW 索引
- 尚未灌入真实向量（40 行存量待离线向量化后回填）

## 遗留说明

- 服务器 PG 版本是 18.6（高于调研时的预期小版本），PGDG 源已就位，后续升级 pgvector 只需 apt 拉新包 + `ALTER EXTENSION vector UPDATE;`
- 生产库的库/表/列全部使用中文名，后续检索 SQL 需用 `\"系统表情\"` 转义
- 云助手执行记录保留在阿里云（InvokeId：t-hk073hmtmsnl7uo 等），可审计
