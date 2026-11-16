-- 承诺兑现：把「AI 答应过的事」作为关键事件落库，跨天仍能被检索与追问
CREATE TABLE IF NOT EXISTS "承诺兑现" (
  "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "用户ID" UUID NOT NULL,
  "角色ID" UUID NOT NULL,
  "承诺内容" TEXT NOT NULL,
  "状态" VARCHAR(20) NOT NULL DEFAULT '未兑现',
  "创建时间" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "兑现时间" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "承诺兑现_用户角色_idx" ON "承诺兑现" ("用户ID", "角色ID", "状态");
COMMENT ON TABLE "承诺兑现" IS 'AI 对用户做出的承诺台账：捕获「明天/周末/我请你」类句子，跨天检索未兑现项注入提示词';
