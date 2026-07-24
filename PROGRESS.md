# PROGRESS.md - 大厂级优化循环

## 元信息
- 任务：将"和我恋爱吧"项目从能跑提升到大厂级（可观测性 + CI/CD + 代码质量）
- 启动时间：2026-07-23
- 熔断上限：33轮（11功能点 × 3）
- 当前循环：1

## 停止条件（可机器验证）
1. 所有功能点状态 ∈ {已完成, 已跳过, 已阻塞}
2. 前端 `npm run build` 成功
3. 后端 `npm run build` 成功
4. 前端 `npm run test` 全部通过
5. 后端 `npm run test` 全部通过
6. 前后端 lint 零报错

## 范围边界

### 做什么
- 可观测性：结构化日志、健康检查、metrics暴露、前端错误边界、Web Vitals上报
- CI/CD：GitHub Actions流水线、覆盖率门槛、commitlint+husky
- 代码质量：清理临时文件、统一migration、.env.example、前端错误处理统一

### 不做什么（防过度烘焙）
- 不集成Sentry/Grafana等需外部账号的服务（只做hook和端点暴露）
- 不做API规范文档（用户明确排除）
- 不做容灾备份（用户明确排除）
- 不重写现有业务逻辑
- 不修改现有测试断言
- 不主动创建README/文档（除非.env.example）

### 禁止触碰
- 现有业务逻辑代码（除非为接入日志/错误处理必须）
- 现有API响应格式
- 现有测试用例的断言

## 待处理功能点

（FP-01~FP-11 全部已完成，详细摘要见下方「已完成」区块；本轮阶段4 已压缩待处理区块。注：先前摘要记「聊天页面.vue:107 有 1 个 vue/valid-v-for 残留 ERROR」——经本轮独立复核为**误报**：上一轮 `eslint . --fix` 已修复该错并随 c857f6e 入库，当前 `eslint .` 0 错误，无需改动。）

## 已完成（仅保留一行摘要）
- FP-01：用 pino 重构 backend/src/utils/debug日志.ts，multistream 输出 JSON 到 stdout + logs/debug.log；保留全部导出函数签名（debug日志/sheZhiZuiDiRiZhiJiBie/guanBiRiZhiLiu/jiLu*/chuangJianHTTPRiZhiZhongJianJian 等）；新增 withRequestId 注入 qing_qiu_id；LOG_LEVEL 环境变量控制级别；保留敏感字段过滤；测试 11→18 全通过，build/lint 零报错，dev 启动日志为 JSON 格式
- FP-03：前端全局错误边界（错误边界.vue 用 onErrorCaptured + main.ts 三类全局监听 + utils/错误上报.ts 可配置 hook 为 FP-04 预留 + App.vue 最外层包裹 + 20 测试用例全通过）
- FP-05：创建 .github/workflows/ci.yml，两个并行 job（frontend/backend），含 lint+build+test，backend 挂 postgres:16+redis:7 服务，npm 缓存加速，YAML 语法验证通过
- FP-10：重写backend/.env.example（清除原文件中真实凭据，补齐ADMIN_PHONES/LOG_LEVEL/MIN_GAN_*/ALLOWED_ORIGINS共18项），新增frontend/.env.example（无自定义env引用），修复root/backend两处.gitignore误忽略.env.example
- FP-08：删除backend下tmp-regex-test.js/debug-path.ts/backend-dev.err/validate_init_sql.js四个临时文件，清理eslint.config.mjs中对应的死ignore条目，build/lint通过，测试无回归（全量3个超时为flaky，单独重跑全部通过）
- FP-09：删除空目录backend/migrations/（含.gitkeep），将根database/002_add_user_test_column.sql移入backend/database/migrations/（唯一migration目录）；根database/001_init.sql为与backend/database/init.sql重复的init脚本（非migration），按任务提示保留原位；代码无硬编码migration路径引用，build/lint/test全通过（273 tests passed）
- FP-11：新增 utils/错误处理.ts（CuoWuFenLei 六分类枚举 jianQuan/wangLuo/fuWuQi/yeWu/shuRu/weiZhi + fenLeiCuoWu 按 axios status/code/cuo_wu_ma 自动分类 + huoQuCuoWuTiShi 走 huoQuFanYi 返回用户友好提示），translations.ts tongYong 新增 wangLuoCuoWu/fuWuQiCuoWu/dengLuGuoQi/qingQiuChaoShi/shuRuCuoWu/weiZhiCuoWu 六键，请求.ts 响应拦截器接入分类与网络/服务器错误 chuFaCuoWuShangBao 上报（401 清令牌跳登录与业务错误 cuo_wu_ma 逻辑保留不变），新增 27 测试用例，build/test/lint 全通过（318 tests passed）
- FP-07：新建根 package.json（private:true + prepare:husky），安装 husky@9.1.7 @commitlint/cli@21 @commitlint/config-conventional@21，创建 commitlint.config.js（继承 config-conventional 默认规则）；npx husky init + npx husky 创建 .husky/_/ 包装器（core.hooksPath=.husky/_）；.husky/pre-commit 用 set -e + && 链接跑 frontend npm run lint + npx vue-tsc -b 与 backend npm run lint + npx tsc --noEmit（因禁止改子 package.json 且无 typecheck 脚本，直接调用 typecheck 命令）；.husky/commit-msg 跑 npx --no -- commitlint --edit ${1}；验证：不规范消息被拒(exit 1)、规范消息通过(exit 0)、前后端 build 成功
- FP-02：新增 routes/健康检查.ts（GET /health 检查 PostgreSQL SELECT 1 + Redis PING 返回 {zhuangTai,shu_ju_ku,huan_cun,shi_jian_chuo}，200/503 状态码；GET /metrics 用 prom-client v15.1.3 暴露 Prometheus 文本格式，含 collectDefaultMetrics 默认进程指标 + 自定义 Counter http_qing_qiu_zong_shu 和 Histogram http_qing_qiu_hao_shi_haomi 标签 fang_fa/lu_jing/zhuang_tai_ma），server.ts 在 chuangJianHTTPRiZhiZhongJianJian 之后挂 prom-client finish 事件采集中间件、在 IP封禁/限流/认证之前注册 /health 和 /metrics（无认证无限流），新增 6 测试用例，build/test/lint 全通过（286 tests passed），curl 实测 /health 返回 jianKang、/metrics 返回 text/plain; version=0.0.4 含 process_*/nodejs_*/http_qing_qiu_* 指标
- FP-06：frontend vite.config.ts（test 字段在 vite.config.ts 而非 vitest.config.ts）+ backend vitest.config.ts 添加 v8 coverage 配置（reporter text/text-summary/html/lcov，reportsDirectory ./coverage，阈值 lines/functions 60 + branches 50 + statements 60），前端新增 pool: 'threads' 解决 forks 池超时，exclude 按前后端结构分别配置；安装 @vitest/coverage-v8@4.1.10（前端）和 @vitest/coverage-v8@4.1.6（后端），vitest v4 需单独安装 coverage provider（非内置）；三处 .gitignore（前端/后端/根）添加 coverage/；未修改 package.json scripts（通过 npx vitest run --coverage 运行）；前端覆盖率 Stmts 68.26%/Branches 63.45%/Funcs 63.67%/Lines 69.43%（332 tests），后端 Stmts 75.4%/Branches 59.31%/Funcs 90.42%/Lines 77.4%（297 tests），全部高于阈值，build/test 零回归
- FP-04：新增 backend/routes/日志接收.ts（POST /api/logs 校验 lei_xing∈{cuoWu,xingNengZhiBiao}+xiang_qing 必填，错误级 error/性能级 info 经 xieRuRiZhi 写 pino JSON 日志，标签"前端错误上报"/"前端性能指标"），server.ts 在限流之后认证之前注册 /logs；前端 utils/错误上报.ts 新增 moRenShangBaoHanShu（sendBeacon+Blob 优先，回退 fetch keepalive，Error 序列化为 name/message/stack，POST /api/logs body={lei_xing,xiang_qing}）；新增 utils/性能监控.ts（web-vitals onLCP/onINP/onCLS/onFCP/onTTFB 回调经 chuFaCuoWuShangBao 带 fuJia.shangBaoLeiXing=xingNengZhiBiao 上报，幂等初始化）；main.ts 调 chuShiHuaCuoWuShangBao+chuShiHuaXingNengJianKong；新增 backend 日志接收.test.ts（端点校验/日志级别/错误处理）+ frontend 性能监控.test.ts（8 用例 mock web-vitals 回调）+ 错误边界.test.ts FP-04 默认上报 7 用例，build/test/lint 全通过（backend 297 + frontend 332 tests passed）

## 已跳过/已阻塞
（无）

## 当前决策
- 日志库选pino（性能优于winston，JSON原生）
- metrics端点用prom-client库（Prometheus标准）
- Web Vitals用官方web-vitals库
- CI用GitHub Actions（项目已是Git仓库结构）

## 元循环摘要
Self-Harness：本轮发现 3 个弱点（W-新1：PROGRESS 待处理区块未压缩，FP-05 仍标"待开始"；W-新2：范围外业务文件 lint 未全量独立验证致"假完成"；W-新3：验证脚本 lint --fix 副作用污染工作树），0 个自动级提案，3 个待确认/禁止自动项待用户决策（见阶段4 AskUserQuestion 交付）。

阶段4 收尾（2026-07-24）：3 项待确认已全部决策——① 入库方式：已走「总控制台」非交互推送成功（beaffbb..c857f6e main→main，55 文件 +2874/−6381，远端 ls-remote 确认 c857f6e5f08）；② lint 残留：经独立复核为误报（已随 c857f6e 修复，当前 `eslint .` 0 错误），无需修；③ harness 提案：维持「仅记 EVIDENCE.md、不自动应用」。6 项停止条件经本轮独立重跑复核全过（前端 build✅/332✅/lint0；后端 build✅/297✅/lint0），工作区 0 改动、main 与 origin/main 同步。阶段4 关闭。

## 阶段5 修复遗留/发现问题（2026-07-24 晚）

- 触发：用户要求"将遗留问题及发现的一切问题修复并推送"。先全量复验——前端 `vue-tsc -b`✅/`eslint .`✅（0 错误 0 警告）/`vitest` 332✅；后端 `tsc --noEmit`✅/`eslint .`✅（0 错误 0 警告）/`vitest` 297✅。结论：阶段4 摘要所记"聊天页面.vue:107 lint 残留"经本轮独立复验为**误报**（当前 0 错误），非真实遗留。
- 修复1（真实缺陷·内容作 key）：`frontend/src/views/聊天页面.vue` 批注项 `v-for` 的 `:key` 原用 `piZhuXiang?.nei_rong`（消息内容）作键——内容变化会触发 Vue 误重挂。根因：`PiZhuXiang` 接口在构建批注 Map 时丢弃了稳定字段 `xu_hao`。修复：接口加 `xu_hao: number`，Map 构建时保留该字段，`:key` 改为 `'pizhu-' + piZhuXiang?.xu_hao`。类型检查/lint/test 全过。
- 修复2（flaky 测试·超时余量）：FP-08 记录"全量 3 个超时为 flaky，单独重跑全部通过"。隔离重跑复现：管理员后台×2（16/16）、通知×2（9/9）均 0 失败——即"隔离通过、全量超时"，逻辑推定为**全量并行下的时序/资源竞争超时**（非逻辑 bug）。据此做标准 cure：① 放宽 3 个 Socket 等待助手的真实定时器余量（`管理员后台` 5000/5000/3000→15000、`通知` 5000/5000→15000），并把 `dengDaiLianJie` 的 `socket.on` 改 `socket.once` 防悬挂监听；② 后端 `vitest.config.ts` 无 `testTimeout` 故所有 `it` 受默认 5000ms 上限约束——全量负载下集成测试（Socket/HTTP/DB）易超 5s 被 vitest 掐断，加 `testTimeout: 15000`。两项改动**不改动任何断言/逻辑**，真实失败仍会超时（仅更晚），不掩盖 bug。
- 复验（修复2 后）：全量后端 `vitest` **连跑 2 次均 297/297（EXIT=0）**，此前全量超时失败的 `消息撤回:273` 现已稳定通过；前端 332✅ 不变。
- 收尾：发现工作树误删 `和我恋爱吧进度对话记录.txt`（非本次改动、非总控制台清理路径），已 `git restore` 还原，避免推送夹带未授权删除；临时 git 配置与驱动脚本保持无残留。
- 推送：依 P0「所有修改须上传 + 禁手动 push 须走总控制台」再次走「总控制台」非交互推送，提交信息过 commitlint 规范。
