-- 和我恋爱吧 - 多媒体消息基础设施迁移脚本（FP-20）
-- PostgreSQL 16
-- 所有表名/字段名使用中文标识符，SQL 中用双引号包裹
-- 本脚本幂等，可重复执行；磁盘存储采用内容寻址（CAS）：backend/uploads/media/<sha256前2位>/<sha256>

-- 1. 媒体文件表（CAS 元数据，同哈希全库唯一）
CREATE TABLE IF NOT EXISTS "媒体文件" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "SHA256" CHAR(64) NOT NULL UNIQUE,
    "原始文件名" TEXT NOT NULL,
    "MIME" VARCHAR(100) NOT NULL,
    "大小字节" BIGINT NOT NULL,
    "类别" VARCHAR(20) NOT NULL CHECK ("类别" IN ('tupian', 'biaoqingshu', 'yuyin', 'wenjian')),
    "宽" INTEGER,
    "高" INTEGER,
    "时长毫秒" INTEGER,
    "上传者ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 消息表新增媒体引用列（非文本消息指向媒体文件，撤回/删除置空不级联删盘上文件）
ALTER TABLE "消息" ADD COLUMN IF NOT EXISTS "媒体ID" UUID REFERENCES "媒体文件"("ID") ON DELETE SET NULL;

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_媒体文件_上传者ID ON "媒体文件"("上传者ID");
CREATE INDEX IF NOT EXISTS idx_消息_媒体ID ON "消息"("媒体ID");
