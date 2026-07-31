# PROGRESS.md - 日志系统大厂级重构

## 元信息
- 任务：将后端日志系统升级为大厂级（OTel全链路追踪 + pino-pretty + 热重载 + 冷存归档）
- 状态：进行中
- 循环计数：3

## 停止条件（必须可机器验证）
1. 后端 `npm run test` 全部通过
2. 后端 `npm run build` 成功
3. 后端 `npm run lint` 零报错
4. 日志文件轮转/冷存功能可工作
5. OTel traceId 自动注入到每条日志

## 熔断上限
| 类型 | 上限 | 当前 | 状态 |
| --- | --- | --- | --- |
| 总循环次数 | 9 | 3 | 正常 |
| 单问题修复次数 | 5 | 0 | 正常 |

## 范围边界

### 做什么
- FP-01✅：核心引擎（OTel.ts + 日志引擎.ts）
- FP-02：门面重构+中间件+集成（debug日志.ts重构 + 日志追踪.ts中间件 + server.ts接入）
- FP-03：测试更新 + 全量验证

### 不做什么（防过度烘焙）
- 不改动任何业务逻辑代码
- 不改动前端代码
- 不添加Sentry/Grafana等需要外部账号的服务
- 不修改现有测试断言逻辑

### 禁止触碰
- backend/src/services/ 下的所有业务服务文件
- backend/src/routes/ 下的业务路由（除 server.ts）

## 待处理功能点

| ID | 描述 | 验收标准 | 依赖 | 状态 | 循环 |
| --- | --- | --- | --- | --- | --- |

## 已完成（仅保留一行摘要）

- FP-01 已完成：OTel.ts + 日志引擎.ts（Pino v10 + pino-pretty + pino-roll轮转 + gzip冷存 + OTel traceId注入 + 热重载）
- FP-02 已完成：debug日志.ts 委托日志引擎.ts（导出签名全保留）+ 日志追踪.ts 中间件（AsyncLocalStorage + X-Request-Id + qing_qiu_id 自动注入日志）+ server.ts 接入 OTel 初始化与中间件挂载
- FP-03 已完成：全量测试 320/320 通过（含 FP-02 追踪测试 5 个 + 并发防重入/关闭不挂起测试 2 个），tsc 构建成功，lint 零报错

## 当前决策

| 时间 | 决策 | 影响范围 |
| --- | --- | --- |
| 2026-07-31 | OTel SDK + pino-pretty + 双写(stdout+冷存) + 热重载 | 全部3个FP |
| 2026-07-31 | 开发/测试模式改用 fs.createWriteStream 直接写文件保证 flush 语义；pino redact 通配符 `*.字段` 覆盖嵌套敏感字段；AsyncLocalStorage 接入 pino mixin 自动注入 qing_qiu_id | FP-02 |
| 2026-07-31 | 初始化防重入（yiChuShiHua 提前置位）；guanBiRiZhiYinQing 流关闭加 5s 超时兜底 + error 监听 | FP-02 收尾 |

## 阻塞与遗留问题

（无）

Self-Harness：本轮发现 2 个弱点（pino 异步落盘坑、熔断计数不同步），2 个自动级提案已应用并通过回归（5/5），0 个待确认/禁止自动项。
