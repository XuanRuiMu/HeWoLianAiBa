import { test, expect } from '@playwright/test';
import { baoZhengCeShiZhangHao, zhuRuJiaJuShenFen } from './测试夹具';

test.describe('吴昊阳与草地融合', () => {
  test.setTimeout(180000);

  test('草地就绪后角色同步显现', async ({ page }) => {
    await zhuRuJiaJuShenFen(page, await baoZhengCeShiZhangHao(page.request));
    await page.goto('/profile-setup?moshi=putong', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(45000);
    const zhuangTai = await page.evaluate(() => {
      const iframe = document.querySelector('.grass-bg-iframe') as HTMLIFrameElement | null;
      if (!iframe) return { wuKuang: true };
      try {
        const doc = iframe.contentDocument;
        const cw = iframe.contentWindow as unknown as Record<string, unknown> | null;
        const wuD = cw?.['__wuD'] as { state?: () => unknown; logs?: string[] } | undefined;
        const menKongFn = cw?.['__caoDiMenKongZhuangTai'] as (() => Record<string, unknown>) | undefined;
        return {
          src: iframe.src,
          // FP-01 单道路化后 v9 覆盖层与静态兜底图已整体删除（`__wuOverlayReady`/
          // `__wuJingTaiDouDi`/`#wuhaoyang-static` 都不再存在），角色是否显现只能按
          // T3 契约判：门控道路 + 已揭示 + 引擎平面在 reveal 里推进。
          menKong: typeof menKongFn === 'function' ? menKongFn() : null,
          zhuJueZhuGuan: !!cw?.['__wuZhuJueZhuGuan'],
          yiXiaoHui: !!(cw && cw['__wuYiXiaoHui']),
          jingTuCunZai: !!doc?.getElementById('wuhaoyang-static'),
          youCuoWu: ((cw?.['__wuD'] as { logs?: string[] } | undefined)?.logs || []).slice(-3),
          diaoShi: typeof wuD?.state === 'function' ? wuD.state() : null,
        };
      } catch (e) {
        return { duQuShiBai: String(e).slice(0, 120) };
      }
    });
    console.log(`WU_RONGHE=${JSON.stringify(zhuangTai)}`);
    await page.screenshot({ path: '../测试截图/wuhaoyang.png' });
    const menKong = (zhuangTai as { menKong?: Record<string, unknown> }).menKong || {};
    const diaoShi = (zhuangTai as { diaoShi?: Record<string, unknown> }).diaoShi || {};
    expect(menKong.daoLu, `门控道路必须是 T3 主道路：${JSON.stringify(zhuangTai)}`).toBe('zhuDao');
    expect(menKong.yiJieLu, `草地揭示门必须已开：${JSON.stringify(zhuangTai)}`).toBe(true);
    expect(typeof diaoShi.revealProgress === 'number' && (diaoShi.revealProgress as number) > 0,
      `角色必须与草地同步进入 reveal：${JSON.stringify(zhuangTai)}`).toBe(true);
    expect(diaoShi.daoLu, `角色平面必须走主道路挂载：${JSON.stringify(zhuangTai)}`).toBe('zhuDao');
  });

  test('引擎失效时门控不揭示：背景保持隐藏且不误报静态', async ({ page }) => {
    await zhuRuJiaJuShenFen(page, await baoZhengCeShiZhangHao(page.request));
    await page.route('**/references/*patched*', (luYou) => luYou.abort());
    await page.goto('/profile-setup?moshi=putong', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(12000);
    const menKong = await page.evaluate(() => {
      const iframe = document.querySelector('.grass-bg-iframe') as HTMLIFrameElement | null;
      if (!iframe) return { wuKuang: true };
      const cw = iframe.contentWindow as unknown as Record<string, unknown> | null;
      const tu = iframe?.contentDocument?.getElementById('wuhaoyang-static') as HTMLImageElement | null;
      const menKongZhuangTai = cw?.['__caoDiMenKongZhuangTai'] as (() => unknown) | undefined;
      return {
        fuJiHuo: iframe.classList.contains('is-active'),
        yiJieLu: !!cw?.['__caoDiYiJieLu'],
        menKong: typeof menKongZhuangTai === 'function' ? menKongZhuangTai() : null,
        // FP-01 单道路化后这条静态兜底图已不存在；断言按「揭示前屏幕上不得有角色静态图」
        // 的事实形态给：元件不存在，或存在但计算样式不可见，两者都算通过（回归时才会红）
        jingTuKeJian: tu
          ? (tu as HTMLElement).offsetParent !== null && (iframe.contentDocument as Document).defaultView!.getComputedStyle(tu).display !== 'none'
          : false,
        fuTiShi: !!document.querySelector('.cao-di-shibai-ti-shi'),
      };
    });
    console.log(`MENKONG_SHIXIAO=${JSON.stringify(menKong)}`);
    await page.screenshot({ path: '../测试截图/wuhaoyang-jingtai.png' });
    expect(menKong?.yiJieLu, '引擎失效时不应揭示').toBe(false);
    expect(menKong?.fuJiHuo, '门控未通过时父页应保持隐藏').toBe(false);
    expect(menKong?.jingTuKeJian, '揭示前静态兜底不应提前显示').toBe(false);
  });
});
