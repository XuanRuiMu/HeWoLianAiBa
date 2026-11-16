-- 当前心情 + 心情强度：让 AI 拥有跨轮持续、带自然衰减的真实情绪状态。
-- 心情由模型每轮判（写「当前心情」与「心情强度」），代码只负责存取与自然衰减。
-- 「心情来源」记触发这条心情的那句话，供军师解释 TA 为什么这么想。
ALTER TABLE "角色" ADD COLUMN IF NOT EXISTS "当前心情" VARCHAR(20);
ALTER TABLE "角色" ADD COLUMN IF NOT EXISTS "心情强度" SMALLINT;
ALTER TABLE "角色" ADD COLUMN IF NOT EXISTS "心情来源" VARCHAR(200);
ALTER TABLE "角色" ADD COLUMN IF NOT EXISTS "心情更新时刻" BIGINT;

COMMENT ON COLUMN "角色"."当前心情" IS 'TA 此刻的情绪状态，取值见 Prompt构建器 的心情描述表；空值表示尚未判定';
COMMENT ON COLUMN "角色"."心情强度" IS '情绪强度 0-100，越高衰减越慢、表达越极端';
COMMENT ON COLUMN "角色"."心情来源" IS '触发这条心情的对方原话（≤200 字），只给军师解释用，不进聊天提示词';
COMMENT ON COLUMN "角色"."心情更新时刻" IS '最近一次判定的毫秒时间戳，用于计算自然衰减';