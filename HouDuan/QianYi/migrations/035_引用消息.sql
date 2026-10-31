-- FP-08a 缺陷5（右键「引用」）后端半边：消息级「被引用消息ID」列
-- 旧口径：`消息` 表没有任何可存放「这条消息引用了哪条消息」的槽位，整条引用链路在前端是纯 UI 死胡同
--         （状态存而不传）、后端零命中、出参亦无该字段 ⇒ R4 契约断层（PROGRESS『根因映射』R4）。
-- 新口径：`被引用消息ID` 存放被引用那条消息的 `消息`.`ID`（同一会话内的另一条消息，角色或用户发的皆可）；
--         NULL = 本条消息没有引用任何人。本列只存**身份**，不存摘要副本：
--         引用摘要一律在读取时按 ID 现取（同一份真源，不留第二条会漂移的缓存），
--         列表接口本就返回整会话消息，消费方按 ID 在自身列表内解析即可。
--
-- 删除语义（显式定案，两条理由）：
--  ① 一律 ON DELETE SET NULL，绝不级联删用户消息内容 —— 引用是「一条消息指向另一条」的元数据，
--     删掉被引用的原消息不能连带删掉「引用了它」那条消息本身（那等于因别人的生命周期销毁用户数据）。
--     这也与本库既有同族写法一致：`对话摘要`.`起始消息ID`、`通知`… 指向 `消息`(`ID`) 的外键全是 SET NULL
--     （database/000_baseline.sql:228），`消息`.`媒体ID` 的既有终态同样是 SET NULL（迁移 033 注释）。
--  ② 引用失效（原消息被删）后本列变 NULL，读回即「无引用」，与「从未引用」同形；
--     而**写入**侧不接受失效引用：引用不存在/跨会话/跨用户/已撤回一律 4xx（见 services/消息.ts
--     的 `yanZhengBeiYinYong`），因此库内不会留下指向不存在行的引用。
--     已撤回的原消息走的是 已撤回 标记而非删除，其外键不受影响，由消费侧渲染为撤回占位（FP-08b）。
--
-- 自引用：`ID` 由服务端 gen_random_uuid() 生成，插入时不可能等于本行 ID；应用层另在写入前拒掉
--         自引用（幂等重放路径可构造）。本迁移再钉一条 CHECK 作为**结构性不变式**：
--         任何路径（含未来新增的写口、人工修数）都不可能出现「消息引用自己」。
--         该 CHECK 对 NULL 恒为真，故存量行一行都不受影响。
--
-- 纯增量：无 UPDATE / 无 DELETE / 不改任何既有列的类型、约束、默认值；可重复执行。

-- 1. 列 + 外键（幂等：列已存在时整条 ADD COLUMN 跳过，内联外键同名约束由建表语句已给出）
ALTER TABLE "消息" ADD COLUMN IF NOT EXISTS "被引用消息ID" UUID
    REFERENCES "消息"("ID") ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '消息' AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = '消息_被引用消息ID_fkey'
    ) THEN
        ALTER TABLE "消息"
            ADD CONSTRAINT "消息_被引用消息ID_fkey"
            FOREIGN KEY ("被引用消息ID") REFERENCES "消息"("ID") ON DELETE SET NULL;
    END IF;
END $$;

-- 2. 结构性不变式：禁止自引用（列已存在但约束缺失的库也能补齐）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '消息' AND constraint_type = 'CHECK'
        AND constraint_name = '消息_不得自引用'
    ) THEN
        ALTER TABLE "消息" ADD CONSTRAINT "消息_不得自引用" CHECK ("ID" <> "被引用消息ID");
    END IF;
END $$;

-- 3. 外键侧索引：`消息` 是自引用表，删行时 Postgres 必须按本列反查引用方；
--    无索引则账号注销/数据到期这类批量删除退化成逐行全表扫（O(n²)），拖垮整条删除事务。
CREATE INDEX IF NOT EXISTS "消息_被引用消息ID_索引" ON "消息" ("被引用消息ID");

COMMENT ON COLUMN "消息"."被引用消息ID" IS '本条消息引用的同会话另一条消息 ID（FK → 消息(ID) ON DELETE SET NULL）；NULL = 未引用。摘要不落库，读取时按 ID 现取';
