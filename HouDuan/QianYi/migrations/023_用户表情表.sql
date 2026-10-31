-- 023 用户自定义表情表（FP-06b，用户问题 #11「表情包可以从本地添加」）。
--
-- 根因：表情面板的「表情包」页签数据源是前端编译期常量（frontend/src/utils/表情包库.ts 的
--       BIAO_QING_BAO_LIE_BIAO 14 条 + canvas 现渲染），全库没有任何用户自定义表情的存储位，
--       因此用户无法添加、换设备/换端登录后也拿不到自己已有的表情。
-- 判定口径（对齐 QQ/微信）：用户主动「添加到表情」的本地图才是表情包（可复用、存面板、无气泡），
--       从相册/粘贴直接发出的图是图片消息（带气泡）。故本表只登记 类别='biaoqingshu' 的媒体。
--
-- 设计约束：
--   1) 不冗余存 SHA256 —— 内容哈希的唯一真源是 "媒体文件"."SHA256"，本表按 媒体ID 外键取，
--      避免同一事实两处可写（FP-08 已把「二套真源」列为系统性缺陷）。
--   2) 排序是用户资产的一部分，必须落库而非 localStorage，否则「所有端一致」不成立。
--   3) 级联删除：账号注销随 "用户" CASCADE；单张媒体行被清理时该表情条目随之消失。
--      反向不成立——删除 "用户表情" 行不会删 "媒体文件" 行，故删表情不影响已发出的历史
--      表情消息（"消息"."媒体ID" 外键是 ON DELETE SET NULL，见 database/000_baseline.sql:389）。
--
-- 幂等：IF NOT EXISTS + 约束内联于建表语句，重复执行为无副作用空操作。

CREATE TABLE IF NOT EXISTS "用户表情" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "媒体ID" UUID NOT NULL REFERENCES "媒体文件"("ID") ON DELETE CASCADE,
    "短名" VARCHAR(30) NOT NULL DEFAULT '',
    "排序" INTEGER NOT NULL DEFAULT 0,
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "用户表情_同一媒体不重复" UNIQUE ("用户ID", "媒体ID"),
    CONSTRAINT "用户表情_排序非负" CHECK ("排序" >= 0)
);

CREATE INDEX IF NOT EXISTS "idx_用户表情_用户ID_排序" ON "用户表情" ("用户ID", "排序");
