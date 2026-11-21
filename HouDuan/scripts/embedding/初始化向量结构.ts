import { 数据库 } from '../../src/数据库'

async function main(): Promise<void> {
  await 数据库.query('CREATE EXTENSION IF NOT EXISTS vector')
  await 数据库.query('ALTER TABLE "系统表情" ADD COLUMN "检索文本" text NOT NULL DEFAULT \'\'')
  await 数据库.query('ALTER TABLE "系统表情" ADD COLUMN "向量" vector(512)')
  await 数据库.query(
    'CREATE INDEX IF NOT EXISTS "系统表情_向量_hnsw" ON "系统表情" USING hnsw ("向量" vector_cosine_ops) WHERE "启用" = true AND "向量" IS NOT NULL',
  )
  const result = await 数据库.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['系统表情'])
  console.log(JSON.stringify(result.rows))
  process.exit(0)
}
void main()
