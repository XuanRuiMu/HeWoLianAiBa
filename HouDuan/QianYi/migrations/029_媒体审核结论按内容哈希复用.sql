-- 029 媒体审核结论表（L-47：视觉审核结论按内容哈希复用）。
--
-- 根因：`shenHeTuPianAnQuan` 此前没有任何按 SHA256 的结果缓存，同一张图每上传一次就完整重过一遍
--       视觉审核（token 与延迟真计进 LLM用量）。复判非确定性 ⇒ 当初判「合规」的图可能在复判时被
--       误判违规，而 routes/表情.ts 的违规记账（`类型='用户表情'`）落在点「添加到表情」的人账上
--       —— 用户做纯收藏动作却背违规记录。
-- 口径：内容安全结论是**字节**的属性，不是「某人某次上传」的属性 ⇒ 主键只有 SHA256，
--       跨用户共享一份结论。违规结论同样复用（一次判定长期生效），管理员撤销一条结论即解除该哈希。
-- 真源：本表只由 services/DeepSeek视觉审核.ts 在模型真的给出判定时写入；
--       「图片读取失败」「审核服务不可用」这类兜底不是审核结论，一律不落表（否则一次故障就永久污染）。
--       其余模块只读不写。
-- 不外键 "媒体文件"：媒体行会随表情回收/账号注销被删，而内容结论要跨上传长期复用，
--       绑外键会让结论随一次回收一起消失。
--
-- 幂等：IF NOT EXISTS + 约束内联于建表语句，重复执行为无副作用空操作。

CREATE TABLE IF NOT EXISTS "媒体审核结论" (
    "SHA256" CHAR(64) PRIMARY KEY,
    "违规" BOOLEAN NOT NULL,
    "类别" VARCHAR(40) NOT NULL DEFAULT '',
    "理由" TEXT NOT NULL DEFAULT '',
    "严重程度" VARCHAR(10),
    "审核时间" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "媒体审核结论_哈希形态" CHECK ("SHA256" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "媒体审核结论_严重程度合法"
        CHECK ("严重程度" IS NULL OR "严重程度" IN ('qing_wei', 'zhong_deng', 'yan_zhong'))
);
