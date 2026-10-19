-- 媒体去重归属修复：同一 SHA256 允许多条记录（不同上传者各自持有自己的媒体记录），
-- 物理文件仍按 CAS（<根>/<sha256前2位>/<sha256>）单份存储。
-- 原 UNIQUE(SHA256) 会导致后上传者复用他人记录 ID，触发"无权使用该媒体文件"。

ALTER TABLE "媒体文件" DROP CONSTRAINT IF EXISTS "媒体文件_SHA256_key";

CREATE INDEX IF NOT EXISTS idx_媒体文件_SHA256 ON "媒体文件"("SHA256");
