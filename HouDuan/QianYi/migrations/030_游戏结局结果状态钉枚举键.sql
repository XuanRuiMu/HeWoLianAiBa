-- 030 游戏结局.结果状态 钉死为枚举键（FP-13 同族收尾，照 024 的工程形态做）。
--
-- 根因：结局展示文案曾被当主键写进 `游戏结局.结果状态`（真库实测归一前 1983 行全是中文文案：
--       `在一起了 💕` 1982 行 + `被渣型骗了` 1 行，枚举键 0 行）。文案当键用的后果与性别当键用同族：
--       「按角色性别渲染『被渣男/渣女骗了』」这类需求无法落地 —— 键会随文案改版漂移，
--       读取侧只能靠 `utils/结局.解析结局类型` 的三层兜底往回猜，兜底永远删不掉。
--       写口已修好（`services/胜利失败条件.ts` 的两处 INSERT 恒传 `YouXiJieGuoLeiXing` 枚举键），
--       本迁移补上另一半：把「库里只可能是枚举键」升格为 schema 级不变量。
--
-- 脚本与本迁移的分工（为什么清洗不在本文件里做）：
--   「中文文案 → 枚举键」的映射表（当前文案 + 性别变体文案 + 文案改版前的 `胜利-/失败-` 历史值）
--   只存在于 TS 侧（`backend/src/utils/结局.ts`，且其本身由 `translations.jieJu` 派生）。
--   在本文件重抄一份 CASE 就是造出第二个真源 —— 那正是本任务要消灭的病，故存量清洗归
--   `backend/scripts/归一游戏结局结果状态.ts`（它 import 同一张识别表，不另抄映射）。
--   本文件只负责钉不变量：下面的枚举键清单是 schema 常量，SQL 里无法 import TS，
--   只能落字面量，因此它与 `translations.jieJu` 键集合、`YouXiJieGuoLeiXing`、
--   `utils/结局.结局枚举列表` 的同源关系由 `backend/scripts/__tests__/迁移030结局归一.test.ts`
--   的「三处键集合全等」用例钉住 —— 加结局时漏改本约束，那条用例必红。
--   注意：本文件已进台账（校验和固化），**不得回改**。日后新增结局键时，另起一个迁移
--   `DROP CONSTRAINT IF EXISTS "ck_游戏结局_结果状态"` 再按新键集 `ADD CONSTRAINT`。
--
-- 为什么只有 CHECK、不像 024 那样再配一个归一触发器：
--   024 需要触发器，是因为镜像里旧后端仍会把 '男'/'女' 直接写进性别列，单加 CHECK 会让建角色全 500。
--   本列的写口只有 `xieRuYouXiJieJu` / 结算事务内的那条 INSERT，两处都只传枚举键（`结局落库.test.ts`
--   已把「三处写入参数都是枚举键」钉成用例）；而触发器要归一文案就必须把映射表抄进 SQL，
--   第二真源又回来了。故此处刻意只做 CHECK。
--
-- `jinxing_zhong` 不在允许集合内（查证结论，非猜测）：
--   它不是 `YouXiJieGuoLeiXing` 的成员，只是 `utils/结局.解析结局类型` 的读取侧哨兵值
--   （`结局解析结果 = YouXiJieGuoLeiXing | 'jinxing_zhong'`）；全仓 TS 中它的产生点只有
--   `utils/结局.ts` 的兜底分支与消费它的 `services/战绩.ts`，没有任何写库路径。
--   `游戏结局` 的行仅在结算时插入（此时结局必然已定），历史数据里也不存在 '进行中' 类值
--   （真库归一前 distinct 只有上面那两个文案）。把它放进 CHECK 等于给「结局表里有进行中行」开门。
--
-- 顺序保护（先清洗后加约束）：脏值未清完时 `ADD CONSTRAINT` 会以 check_violation 失败，
--   这里把它转成一条指名清洗脚本的报错。失败即中止启动（entrypoint 迁移不通不 exec），
--   属预期的响亮失败 —— 比静默加不上约束、或静默猜一个结局更安全。
--
-- 幂等：`DROP CONSTRAINT IF EXISTS` + 重新 `ADD CONSTRAINT`；表不存在时整段跳过（只应用了
--       部分增量的新库）。重复执行不删行、不改值，终态一致。
-- 数据安全：只做 DDL，无任何 UPDATE/DELETE；不触碰 角色.结局状态、游戏档案.结果类型 等其它列。

DO $q$
BEGIN
    IF to_regclass('public."游戏结局"') IS NULL THEN
        RAISE NOTICE '030：本库尚无 游戏结局 表，跳过 结果状态 CHECK 的建立';
        RETURN;
    END IF;

    ALTER TABLE "游戏结局" DROP CONSTRAINT IF EXISTS "ck_游戏结局_结果状态";

    BEGIN
        ALTER TABLE "游戏结局"
            ADD CONSTRAINT "ck_游戏结局_结果状态"
            CHECK ("结果状态" IN (
                'sheng_li_ai_qing',
                'sheng_li_hu_shan_sheng_li',
                'sheng_li_shi_po',
                'sheng_li_shen_jing_bing',
                'shi_bai_guo_zao_biao_bai',
                'shi_bai_hu_shan_shi_bai',
                'shi_bai_cuo_wu_shi_po',
                'shi_bai_hao_gan_du_gui_ling',
                'shi_bai_ju_jue_biao_bai',
                'shi_bai_bei_qi_pian',
                'shi_bai_bei_zha_xing_qi_pian',
                'shi_bai_shen_jing_bing',
                'shi_bai_fang_qi_tiao_zhan',
                'shi_bai_mian_da_rao'
            ));
    EXCEPTION
        WHEN check_violation THEN
            -- plpgsql 的 RAISE 只接受单个字符串字面量（`||` 与相邻字面量拼接都会 syntax error，已实测），
            -- 故本条消息写成一行。
            RAISE EXCEPTION '030：游戏结局.结果状态 仍有归一前的显示文案，CHECK 无法建立。请先执行 backend/scripts/归一游戏结局结果状态.ts 做存量清洗（文案→枚举键的唯一映射在 backend/src/utils/结局.ts），清洗完成后重跑本迁移。';
    END;

    RAISE NOTICE '030：游戏结局.结果状态 已钉死为枚举键集合';
END
$q$;
