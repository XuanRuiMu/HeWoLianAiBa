-- FP-14 上下文缓存命中率埋点：官方 usage 的缓存命中量（Responses: input_tokens_details.cached_tokens，
-- Chat Completions: prompt_cache_hit_tokens）单点采集落库，与既有 token 口径同表同粒度聚合。
-- 用途：Writer/Director 每轮重发整段历史，命中率直接决定输入按 0.04 还是 2 元/百万 token 计费。
-- 幂等写法，可重复执行。

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'LLM用量' AND column_name = '缓存命中Token'
    ) THEN
        ALTER TABLE "LLM用量" ADD COLUMN "缓存命中Token" BIGINT NOT NULL DEFAULT 0;
    END IF;
END $$;
