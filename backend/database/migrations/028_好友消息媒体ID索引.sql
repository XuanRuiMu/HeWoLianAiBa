-- 028 好友消息媒体引用索引（FP-21）。
--
-- 为什么单开一个迁移而不是改 027：027 已在库上执行并登记 schema_migrations 台账，
-- 台账 checksum 不允许回改（FP-15 的 ledger 完整性），而本文件是独立关注点（查询性能），
-- 与 027 的「列形态统一」分开更符合一条迁移一件事。
--
-- 根因：媒体读取授权（backend/src/services/媒体存储.ts::MEI_TI_KE_DU_YU_JU）在
-- 「好友消息参与方」这条新增规则上要按 媒体ID 反查 "好友消息"。该表现有索引只有
-- (发送者ID, 接收者ID, 创建时间) 与 (接收者ID, 已读)（016 / 001_haoyou_yu_shezhi.sql），
-- 没有任何以 媒体ID 打头的索引 ⇒ 每一次「非上传者读一张好友图片」都要全表扫一遍好友消息。
-- 好友消息只增不删，图片列表一次回 50 条 ⇒ 没有这个索引就是每张图一次全表扫，属可预见的
-- 自我 DoS 面。027 已把该列统一成 UUID，故索引按 UUID 形态建（TEXT 形态下会因类型不一致失败，
-- 正是我们想在错误顺序下看到的响信号）。
--
-- 幂等：CREATE INDEX IF NOT EXISTS。
-- 回滚：DROP INDEX IF EXISTS "idx_好友消息_媒体ID";

CREATE INDEX IF NOT EXISTS "idx_好友消息_媒体ID" ON "好友消息" ("媒体ID");
