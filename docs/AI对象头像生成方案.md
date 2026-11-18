# AI 对象头像：最终生成方案与实测链路

更新时间：2026-11-18

## 一、结论（先看这段）

头像功能现在是真实可用的，不是占位图：

1. 角色一确认落库，`routes/角色.ts` 的 `/确认` 会同步调用 `services/头像生成.ts::生成角色头像`，出图后把图片地址写进 `角色.头像`，并同时写 `头像描述`。
2. 本机数据库里 4 个角色全部是 `/api/媒体/<sha256>` 形式的真实图片引用，磁盘文件存在，尺寸 1024×962（1024×1024 裁掉底部 6% 水印后的高度）。
3. 出图接口是硅基流动 `Kwai-Kolors/Kolors`，密钥来自 `TU_XIANG_SHENG_CHENG_API_MI_YAO`（51 位，已配置），开关 `TU_XIANG_SHENG_CHENG_QI_YONG=true`。
4. 相关单测 16 项全绿（风格选择确定性、提示词组装、裁剪入库、失败入队、演化硬上限 2 次）。

## 二、链路（逐段）

```
POST /api/生成角色/MBTI生成            → 生成人设（含 MBTI/年龄/身份/爱好/外貌），暂存待确认
       ↓ 用户点“就 TA 了”
POST /api/生成角色/确认
   ├─ baoCunJiaoSe()                  → 插 角色 表、好感度 表、游戏档案 表
   ├─ 生成角色头像()
   │     ├─ 选择头像风格()             → 按年龄档/气质/身份/爱好打分，同角色 ID 哈希取前 3 名之一（确定性）
   │     ├─ 组装头像提示词()           → 画风锚点 + 主体模板 + 视线约束 + 构图约束，负面词单列
   │     ├─ 等待生成队列()             → Redis SET NX PX 10s，全机串行，规避 Kolors IPM 限流
   │     ├─ diaoYongShengTuJieKou()   → POST {BASE}/images/generations，body: model/prompt/negative_prompt/image_size
   │     ├─ 裁掉PNG底部(6%)            → 去「AI生成」合规水印（纯 zlib 重编码，不依赖 sharp）
   │     ├─ liuShiBaoCunMeiTi()        → 落 uploads/media/<前2位>/<sha256>，写 媒体文件 表
   │     └─ UPDATE 角色 SET 头像, 头像描述
   ├─ 失败 → 入 Redis 重试队列(touXiangShengCheng) → 重试消费者 60s 轮询补生成
   └─ shengChengRenSheKa()             → 异步写 自述卡
前端：/api/角色/详情 或 /api/用户设置 → tou_xiang / dui_xiang_tou_xiang → 媒体签名 URL → <img>
```

## 三、本轮修掉的真实缺陷

| # | 缺陷 | 证据 | 处置 |
|---|---|---|---|
| 1 | 头像补生成永不触发：入队写 `touXiangShengCheng`，消费者判 `头像生成` 直接 return | 重试队列.ts:4 与 重试消费者.ts:14 字面量不一致 | 统一按队列类型分发；补 `重试消费者分发.test.ts` 4 项用例 |
| 2 | 补生成时把 `yuanYin` 同时当 用户ID 和 角色ID 用，且转调头像演化（演化有 2 次硬上限，补生成会被静默拒绝） | 旧 重试消费者.ts:19-23 | 改为按 角色ID 查 角色 表还原人设，调 生成角色头像；查不到只记 warn 不抛错 |
| 3 | 生产部署 `rsync` 只同步 src/QianYi/scripts/package.json，昵称库 `微信昵称/昵称大全.md` 不在其中；而 `昵称解析.ts` 用固定 3 层上跳定位 | 部署脚本 vs `昵称解析.ts:4-11`；Docker 内 `/app/dist/utils` 上跳 3 层 = `/` | 改为候选路径探测（环境变量 `NI_CHENG_KU_LU_JING` 优先 → `__dirname` 逐级上溯 8 层 → `process.cwd()` 逐级上溯），与已有的 `表情包库.ts` 探测策略对齐；补 3 项用例（真实文件/缺失降级/显式覆盖） |

## 四、头像目录清理

`头像/` 324 MB、2408 个文件，全部是调研中间产物（各平台样张、watermark 方差图、ST-CardGen 上游克隆、Python 依赖副本、Blender 探针脚本）。运行期只读 `HouDuan/src/config/头像风格库.json` 与 `头像匹配规则.json`，这两个文件早已在 `config/` 内、且在 `.gitignore` 之外正常入库。

全仓 grep 确认：`HouDuan/src`、`QianDuan/src` 没有任何代码引用 `头像/` 下文件（仅两处 JSON 的 `laiYuan` 注释文本提到来源路径，属说明文字，不影响运行）。

处置：整目录删除；删除后后端构建、前端构建、前后端全量测试、lint 全部通过（见第五节）。

## 五、验证记录

| 门禁 | 命令 | 结果 |
|---|---|---|
| 后端类型 | `npx tsc --noEmit` | 0 错误 |
| 后端构建 | `npm run build` | 成功，6 个 JSON 运行时资源就位 |
| 后端 lint | `npm run lint` | 0 问题 |
| 后端测试 | `npx vitest run --maxWorkers=4` | 87 文件 / 1038 通过 / 12 跳过 |
| 前端类型 | `npm run typecheck` | 0 错误 |
| 前端构建 | `npm run build` | 成功，dist 8.7 MB（门禁 15 MB） |
| 前端 lint | `npm run lint` | 0 问题 |
| 前端测试 | `npx vitest run --maxWorkers=4` | 95 文件 / 1311 通过 |
| 真实数据 | `psql` 查 角色/媒体文件 | 4 角色头像均为 /api/媒体/，文件落盘 1024×962 |
| 视觉 | Chrome headless 截图 | 320/390/768/844×390/1280/1920 六档见 `.agents/evidence/traces/` |

## 六、遗留（需要产品决定，不在本轮擅自改）

- 待确认阶段（用户还没点“就 TA 了”）的角色头像仍是 MBTI emoji。调研报告的"两级方案"建议这一阶段改用 DiceBear 确定性头像（seed=角色ID，毫秒出图、永不空窗），确认后再由 Kolors 覆盖。这会改变首次创建页的视觉基线，属于产品决策，未动。
- Kolors 免费层的 IPM 限流已由 Redis 串行锁 + 2 次重试 + 补生成队列覆盖，但没有主动的余额/额度探针；若官方取消免费额度，只会在日志里表现为连续失败。
