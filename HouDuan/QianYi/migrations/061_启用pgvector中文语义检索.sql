CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '系统表情') THEN
    ALTER TABLE "系统表情"
      ADD COLUMN IF NOT EXISTS "检索文本" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "向量" vector(512);

    CREATE INDEX IF NOT EXISTS "系统表情_向量_hnsw"
      ON "系统表情" USING hnsw ("向量" vector_cosine_ops)
      WHERE "启用" = true AND "向量" IS NOT NULL;
  END IF;
END $$;
