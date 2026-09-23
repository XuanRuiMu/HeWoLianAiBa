-- FP-21（用户裁决 L-01＝「引用 + 图文同区两端都做」）后端半边：`好友消息` 补齐与 `消息` 同构的两列
--
-- 旧口径：`好友消息` 只有 发送者ID/接收者ID/内容/类型/媒体ID/已读/撤回/创建时间（backend/database/migrations/016），
--         `routes/好友.ts` 的 插入消息 语句也只写这五列 ⇒ ①一条好友消息无法承载「文字/图片/文字」的先后顺序
--         （前端只能把一段图文按序拆成多条消息发出去，拆开的那一刻顺序语义就丢了，见 PROGRESS F6/F7 的同族根因）；
--         ②没有任何可存放「这条消息引用了哪条消息」的槽位，引用在好友链路上是纯 UI 死胡同（R4 契约断层的原形态）。
-- 新口径：两列的**语义、约束形态、删除语义**与 033（`消息`.`内容块`）/035（`消息`.`被引用消息ID`）逐条同构。
--         同构的目的不是抄一份 DDL，而是让**同一份**服务端判定与投影能同时服务两张表：
--           写入前裁定 = services/消息.ts::yanZhengBeiYinYong（本文件把它参数化到 好友 面向，禁好友版第二份校验函数）；
--           出参块投影 = services/消息.ts::yingSheKuaiChuCan 那唯一一条算式（好友侧只给面向参数，不给第二份实现）；
--           块结构清洗/兼容投影 = services/消息内容块.ts 那唯一真源。
--
-- "内容块"：有序块数组，元素形态与 033 逐字相同（JSON 键沿用出参的拼音下划线风格）
--             { "lei_xing": "wenzi",  "nei_rong": "文字…" }
--             { "lei_xing": "tupian", "mei_ti_id": "媒体文件ID" }
--           "内容" 与 "媒体ID" 自本迁移起在好友表上同样是**兼容投影**（由 paiShengJianRong 单点派生），
--           现存读取方（好友消息列表、通知摘要）零改动即继续读到顺序正确、文本完整的消息。
--           历史行零改写：本列 NULL 即「旧数据/旧客户端」，读取侧按 内容 + 媒体ID + 类型 反构等价块数组。
--
-- "被引用消息ID"：本条好友消息引用的**同一好友对内**另一条好友消息 ID；NULL = 本条没有引用任何人。
--           本列只存**身份**、不存摘要副本：摘要一律在读取时按 ID 现取（同一份真源，不留第二条会漂移的缓存），
--           好友消息列表接口本就返回该好友对的整段消息，消费方按 ID 在自身列表内解析即可。
--
-- 删除语义（显式定案，与 035 同一套理由）：
--  ① 一律 ON DELETE SET NULL，绝不级联删用户消息内容 —— 引用是「一条消息指向另一条」的元数据，
--     删掉被引用的原消息不能连带删掉「引用了它」那条消息本身（那等于因别人的生命周期销毁用户数据）。
--     本库同族写法一致：`消息`.`被引用消息ID`（035）、`好友消息`.`媒体ID`（027 终态）全是 SET NULL。
--     好友表尤须如此：账号注销按 发送者ID/接收者ID 的 CASCADE 成批删行，若引用侧也 CASCADE，
--     一次注销会顺着引用链连带删掉别人的用户消息。
--  ② 引用失效（原消息被删）后本列变 NULL，读回即「无引用」，与「从未引用」同形；
--     而**写入**侧不接受失效引用：引用不存在 / 跨用户（403）/ 跨好友对 / 已撤回 / 自引用一律 4xx
--     （唯一入口 services/消息.ts::yanZhengBeiYinYong），因此库里不会留下指向不存在行的引用。
--     已撤回的原消息走的是 `撤回` 标记而非删行（routes/好友.ts 的 撤回 语句），其外键不受影响，
--     由消费侧渲染为撤回占位（与 FP-08b/FP-26 同口径）。
--
-- 自引用：`ID` 由服务端 gen_random_uuid() 生成，插入时不可能等于本行 ID；应用层另在写入前拒掉自引用。
--         本迁移再钉一条 CHECK 作为**结构性不变式**：任何路径（含未来新增写口、人工修数）都不可能出现
--         「好友消息引用自己」。该 CHECK 对 NULL 恒为真，故存量行一行都不受影响。
--
-- 外键侧索引：`好友消息` 自此是自引用表，删行时 Postgres 必须按本列反查引用方；无索引则账号注销/数据到期
--         这类批量删除退化成逐行全表扫（O(n²)），拖垮整条删除事务。与 035 的第 3 步同因。
--
-- 与两条建库路径的关系：本文件与 database/001_haoyou_yu_shezhi.sql（compose initdb 那份 DDL）同形态。
--         内联 `REFERENCES` 在 Postgres 里生成的约束名就是 <表>_<列>_fkey ⇒ 两条路径的 pg_constraint 行
--         逐字相同；「干净卷」与「现网重放」得到同一形态这一事实由
--         src/routes/__tests__/好友媒体真库.test.ts 的「两条路径全等」用例钉住（本迁移必须继续成立）。
--
-- 纯增量：无 UPDATE / 无 DELETE / 不改任何既有列的类型、约束、默认值；可重复执行。

-- 1. 内容块列（幂等：列已存在时整条 ADD COLUMN 跳过）
ALTER TABLE "好友消息" ADD COLUMN IF NOT EXISTS "内容块" JSONB;

-- 2. 引用列 + 外键（幂等；内联外键的自动命名与 database/001 那份 DDL 同名，故下面第 3 步在两条路径上都是空操作）
ALTER TABLE "好友消息" ADD COLUMN IF NOT EXISTS "被引用消息ID" UUID
    REFERENCES "好友消息"("ID") ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '好友消息' AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = '好友消息_被引用消息ID_fkey'
    ) THEN
        ALTER TABLE "好友消息"
            ADD CONSTRAINT "好友消息_被引用消息ID_fkey"
            FOREIGN KEY ("被引用消息ID") REFERENCES "好友消息"("ID") ON DELETE SET NULL;
    END IF;
END $$;

-- 3. 结构性不变式：禁止自引用（列已存在但约束缺失的库也能补齐）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = '好友消息' AND constraint_type = 'CHECK'
        AND constraint_name = '好友消息_不得自引用'
    ) THEN
        ALTER TABLE "好友消息" ADD CONSTRAINT "好友消息_不得自引用" CHECK ("ID" <> "被引用消息ID");
    END IF;
END $$;

-- 4. 外键侧索引（防删号 O(n²)，见文件头）
CREATE INDEX IF NOT EXISTS "好友消息_被引用消息ID_索引" ON "好友消息" ("被引用消息ID");

COMMENT ON COLUMN "好友消息"."内容块" IS '有序好友消息内容块数组 [{lei_xing:"wenzi",nei_rong},{lei_xing:"tupian",mei_ti_id}]（迁移 036，与 消息.内容块 同构）；NULL = 旧数据或旧客户端，读取侧由 内容+媒体ID+类型 反构（不回填历史行）';
COMMENT ON COLUMN "好友消息"."被引用消息ID" IS '本条好友消息引用的同一好友对内另一条好友消息 ID（FK → 好友消息(ID) ON DELETE SET NULL）；NULL = 未引用。摘要不落库，读取时按 ID 现取';
COMMENT ON COLUMN "好友消息"."内容" IS '兼容投影：文字块按序拼接、图片块以 [图片] 占位内联；有 内容块 的行由 消息内容块.ts 派生写入，无 内容块 的行仍是唯一真源（迁移 036）';
COMMENT ON COLUMN "好友消息"."媒体ID" IS '兼容投影：首个图片块引用的媒体（FK → 媒体文件 ON DELETE SET NULL，迁移 027）；读取方不得据此假设"一条好友消息只有一张图"（迁移 036）';
