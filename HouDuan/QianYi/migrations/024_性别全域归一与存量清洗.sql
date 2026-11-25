-- 024 性别取值全域归一 + 存量清洗（FP-13，用户问题 #4 的同源缺陷）。
--
-- 根因：`角色.性别` 同时共存 nv(10565) / 女(71) / female(19) / 男(2) 四种写法，
--       而消费点按单一字面量比对 —— `AI输入准备.ts` 与 `角色生成.ts` 都用 `=== '女'`，
--       于是 10565 个 nv 女性角色全部被映射成 nan（男性）人设喂给大模型；
--       挑战结算同样因写法不匹配把 nv/nan 对局错计进 nan_nan 组（`ck_挑战积分_组别` 是合法值，
--       所以错算不报错，属静默数据损坏）。
--
-- 规范形态（本迁移与 backend/src/utils/性别.ts 共同固定）：
--   内部规范形态 = 'nan' | 'nv'
--     → `角色.性别`、`挑战对局.玩家性别`、`挑战对局.对象性别` 三列唯一的落库形态，
--       也是喂给大模型的 AI 上下文形态（AIJiaoSeXinXi.xing_bie）。
--   展示形态 = '男' | '女' | '未知'
--     → 只存在于代码与 API 回显（战绩文案、挑战对局回显），由 utils/性别 单向转换，不落库。
--
-- 本文件的 CASE 识别表与 utils/性别.ts 的 男写法集合/nan/male、女写法集合/nv/female 一一对应，
-- 无法识别者的兜底也同为 'nan'（与 读回性别 一致）。两处任一改动必须同步另一处。
--
-- 为什么是「归一触发器 + CHECK」而不是只加 CHECK：
--   镜像内仍在跑的旧后端把 '男'/'女' 直接写进这三列，单加 CHECK 会让每次建角色/开赛
--   立刻炸成 500。BEFORE 触发器先把任意写法归一成二值（旧容器继续可用），
--   CHECK 再作为 schema 级不变量兜住绕过触发器的写入 —— 库内不可能出现第三种写法。
--
-- 幂等：UPDATE 带 WHERE 谓词；函数 CREATE OR REPLACE；触发器/CHECK 先 DROP IF EXISTS。
--       表不存在（只应用了部分增量的新库）时该表整段跳过，不报错。
-- 数据安全：只归一取值，不删行；不触碰 游戏档案/角色 的其他列与历史数据。

-- ============================================================
-- 0. 标量归一函数：任意写法 → 'nan' | 'nv'
-- ============================================================
CREATE OR REPLACE FUNCTION hanShu_xingBieErZhi(原始值 TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- NULL 原样返回，交给列上的 NOT NULL 去拒，避免把「漏传字段」洗成男性
    IF 原始值 IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN CASE lower(btrim(原始值))
        WHEN '女'     THEN 'nv'
        WHEN 'nv'     THEN 'nv'
        WHEN 'female' THEN 'nv'
        WHEN '男'     THEN 'nan'
        WHEN 'nan'    THEN 'nan'
        WHEN 'male'   THEN 'nan'
        ELSE 'nan'
    END;
END;
$$;

-- ============================================================
-- 1. 表级归一触发函数
-- ============================================================
CREATE OR REPLACE FUNCTION hanShu_guiYiJiaoSeXingBie()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW."性别" := hanShu_xingBieErZhi(NEW."性别");
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION hanShu_guiYiTiaoZhanXingBie()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW."玩家性别" := hanShu_xingBieErZhi(NEW."玩家性别");
    NEW."对象性别" := hanShu_xingBieErZhi(NEW."对象性别");
    RETURN NEW;
END;
$$;

-- ============================================================
-- 2. 存量清洗 + 触发器 + CHECK（按表存在性条件执行）
-- ============================================================
DO $q$
DECLARE
    角色归一行数 INTEGER := 0;
    对局归一行数 INTEGER := 0;
BEGIN
    -- ---------- 角色 ----------
    IF to_regclass('public."角色"') IS NULL THEN
        RAISE NOTICE '024：本库尚无 角色 表，跳过该表清洗';
    ELSE
        UPDATE "角色"
           SET "性别" = hanShu_xingBieErZhi("性别")
         WHERE "性别" IS NULL OR "性别" NOT IN ('nan', 'nv');
        GET DIAGNOSTICS 角色归一行数 = ROW_COUNT;
        RAISE NOTICE '024：角色.性别 归一影响 % 行', 角色归一行数;

        DROP TRIGGER IF EXISTS trg_角色_归一性别 ON "角色";
        CREATE TRIGGER trg_角色_归一性别
        BEFORE INSERT OR UPDATE OF "性别" ON "角色"
        FOR EACH ROW
        EXECUTE FUNCTION hanShu_guiYiJiaoSeXingBie();

        ALTER TABLE "角色" DROP CONSTRAINT IF EXISTS "ck_角色_性别";
        ALTER TABLE "角色" ADD CONSTRAINT "ck_角色_性别" CHECK ("性别" IN ('nan', 'nv'));
    END IF;

    -- ---------- 挑战对局 ----------
    IF to_regclass('public."挑战对局"') IS NULL THEN
        RAISE NOTICE '024：本库尚无 挑战对局 表，跳过该表清洗';
    ELSE
        -- 玩家性别/对象性别 原为 VARCHAR(2)（旧数据 '男'/'女' 各 1 字符），
        -- 内部规范形态 'nan' 需 3 字符，必须先放宽列宽再清洗。
        -- varchar 增长为纯元数据变更，不重写表、不锁数据。
        -- 必须先判宽再改：列已被本迁移放宽过一次后，其上已挂归一触发器，
        -- 再次执行 ALTER TYPE 会报 "cannot alter type of a column used in a trigger definition"，
        -- 迁移就不可重复执行了（幂等测试实测踩到，故加此条件）。
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = '挑战对局'
               AND column_name IN ('玩家性别', '对象性别')
               AND character_maximum_length < 10
        ) THEN
            ALTER TABLE "挑战对局" ALTER COLUMN "玩家性别" TYPE VARCHAR(10);
            ALTER TABLE "挑战对局" ALTER COLUMN "对象性别" TYPE VARCHAR(10);
        ELSE
            RAISE NOTICE '024：挑战对局 性别列宽已满足要求，跳过 ALTER TYPE';
        END IF;

        UPDATE "挑战对局"
           SET "玩家性别" = hanShu_xingBieErZhi("玩家性别"),
               "对象性别" = hanShu_xingBieErZhi("对象性别")
         WHERE "玩家性别" IS NULL OR "玩家性别" NOT IN ('nan', 'nv')
            OR "对象性别" IS NULL OR "对象性别" NOT IN ('nan', 'nv');
        GET DIAGNOSTICS 对局归一行数 = ROW_COUNT;
        RAISE NOTICE '024：挑战对局.玩家性别/对象性别 归一影响 % 行', 对局归一行数;

        DROP TRIGGER IF EXISTS trg_挑战对局_归一性别 ON "挑战对局";
        CREATE TRIGGER trg_挑战对局_归一性别
        BEFORE INSERT OR UPDATE OF "玩家性别", "对象性别" ON "挑战对局"
        FOR EACH ROW
        EXECUTE FUNCTION hanShu_guiYiTiaoZhanXingBie();

        ALTER TABLE "挑战对局" DROP CONSTRAINT IF EXISTS "ck_挑战对局_玩家性别";
        ALTER TABLE "挑战对局" ADD CONSTRAINT "ck_挑战对局_玩家性别" CHECK ("玩家性别" IN ('nan', 'nv'));
        ALTER TABLE "挑战对局" DROP CONSTRAINT IF EXISTS "ck_挑战对局_对象性别";
        ALTER TABLE "挑战对局" ADD CONSTRAINT "ck_挑战对局_对象性别" CHECK ("对象性别" IN ('nan', 'nv'));
    END IF;
END
$q$;
