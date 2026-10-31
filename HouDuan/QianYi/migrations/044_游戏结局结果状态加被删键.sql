-- 044 游戏结局.结果状态 放行「被对方删除」结局键（照 030 的工程形态做）。
--
-- 背景：新增失败结局 shi_bai_bei_cha_qu（AI 对象自主判断后把玩家删掉）。
-- 030 建立的 ck_游戏结局_结果状态 CHECK 只允许那 14 个键，写口 xieRuYouXiJieJu 恒传枚举键，
-- 新结局键不在白名单里 ⇒ INSERT 触发 check_violation ⇒ 结算事务 ROLLBACK 三次后抛错 ⇒
-- 结局永远落不了库（能编译、能过单测，线上 100% 失败）。
--
-- 为什么不能改 030：030 已进台账（schema_migrations 校验和固化），
-- scripts/迁移器.ts 对已登记版本校验和不一致直接抛错「迁移 030 校验和不匹配」，
-- 启动即红。030 头注也写明「日后新增结局键时，另起一个迁移」。
--
-- 键集合与 src/config/translations.ts 的 fanYi.jieJu 一一对应：
--   枚举            YouXiJieGuoLeiXing（src/types/index.ts）
--   标签文案        fanYi.jieJu
--   趣味句池        fanYi.jieGuoTongGuanChi + fanYi.jieGuoShiBaiChi
--   本 CHECK        ck_游戏结局_结果状态
-- 四处必须全等，由 scripts/__tests__/结局键集合与数据库约束同源.test.ts 钉住。
--
-- 幂等：DROP CONSTRAINT IF EXISTS + 重新 ADD CONSTRAINT；表不存在时整段跳过。
-- 数据安全：只做 DDL，无任何 UPDATE/DELETE，不触碰 角色.结局状态、游戏档案.结果类型 等其它列。

DO $q$
BEGIN
    IF to_regclass('public."游戏结局"') IS NULL THEN
        RAISE NOTICE '044：本库尚无 游戏结局 表，跳过 结果状态 CHECK 的建立';
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
                'shi_bai_mian_da_rao',
                'shi_bai_bei_cha_qu'
            ));
    EXCEPTION
        WHEN check_violation THEN
            RAISE EXCEPTION '044：游戏结局.结果状态 仍有归一前的显示文案，CHECK 无法建立。请先执行 scripts/归一游戏结局结果状态.ts 做存量清洗。';
    END;
END;
$q$;
