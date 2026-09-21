import { test, expect } from '@playwright/test';
import { createConsoleCollector } from './console-error-collector';

test.setTimeout(120000);

// 字体文件加载失败属资源层噪音（public/grass-bg 字体，与 FP-02 改动无关）。
// Chromium 将资源 URL 放在 location 而非 text 中，故按 location 精确过滤，不放宽 text 口径。
function 断言无业务错误(collector: import('./console-error-collector').ConsoleErrorCollector, 消息: string) {
  const 剩余 = collector
    .getErrors()
    .filter((e) => !/\.(woff2?|ttf|otf)(\?.*)?$/.test(e.location?.url || ''));
  if (剩余.length > 0) {
    throw new Error(
      `${消息}:\n${剩余.map((e) => `[${e.type.toUpperCase()}] ${e.text} at ${e.location?.url}`).join('\n')}`,
    );
  }
  // 告警不再额外豁免：GL 驱动初始化消息与 429 已由 console-error-collector 单源白名单处理。
  // 旧正则 /performance warning|READ-usage|GL Driver|WebGL/ 里的 `WebGL` 宽到能吞掉任何真实
  // WebGL 告警，并且整体屏蔽的正是「问题 1」要求消除的 READ-usage 回读类 ⇒ 该缺陷回归也不会红灯。
  const 警告 = collector.getWarnings();
  if (警告.length > 0) {
    throw new Error(`${消息}（警告）:\n${警告.map((w) => w.text).join('\n')}`);
  }
}

const 测试用户 = {
  id: 'fp02-visual',
  shou_ji_hao: '13800138000',
  yong_hu_ming: '视觉测试用户',
  ni_cheng: '视觉昵称',
  xing_bie: 'female',
  mu_biao_xing_bie: 'male',
  mo_ren_xing_bie: 'female',
  xing_ge_xuan_ze: 'INTJ',
  ren_she_biao_qian: 'neiLianXueBa',
  yun_xu_zha_nan_zha_nv: false,
  tou_xiang: null,
  sheng_ri: null,
  qian_ming: '视觉签名',
  jiao_se: null,
  neng_li: [],
  huo_yue_ren_she_id: null,
  hai_wang_fen_shu: 0,
  chuang_jian_shi_jian: new Date().toISOString(),
  geng_xin_shi_jian: new Date().toISOString(),
};

const 用户设置 = {
  uid: 'fp02-uid',
  shou_ji_hao: '13800138000',
  tou_xiang: null,
  qian_ming: '视觉签名',
  qian_ming_ke_jian_xing: 'gong_kai',
  qian_ming_bai_ming_dan: [],
  liao_tian_bei_jing: 'moRen',
  gong_kai_zhang_hao: true,
  gong_kai_shou_ji_hao: false,
  gong_kai_you_xiang: false,
  bang_ding_you_xiang: '',
};

async function 准备已登录页(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    // 令牌真源是 sessionStorage（utils/令牌存储.ts 的 huiHuaCunChu），写进 localStorage 应用读不到
    window.sessionStorage.setItem('令牌', 'fp02-visual-token');
  });
  await page.route('**/socket.io/**', (route) => route.abort());
  // 阻断 Web 字体下载：无头环境字体加载缓慢会导致截图等待字体超时，降级为系统字体不影响布局校验
  await page.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (route) => route.abort());
  await page.route('**/api/**', (route) => {
    const 路径 = decodeURIComponent(new URL(route.request().url()).pathname);
    // 仅拦截后端代理接口（/api/ 前缀），放行 Vite 源码模块（/src/api/*.ts）
    if (路径 !== '/api' && !路径.startsWith('/api/')) return route.fallback();
    if (路径.endsWith('/api/认证/信息')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: 测试用户 }),
      });
    }
    if (路径.endsWith('/api/用户设置') || 路径.endsWith('/api/用户设置/聊天背景')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: 用户设置 }),
      });
    }
    if (路径.startsWith('/api/通知')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], wei_du_shu: 0 } }),
      });
    }
    if (路径.endsWith('/api/资料/封禁状态')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: {
            bei_feng_jin: false,
            ji_bie: 'zheng_chang',
            wei_gui_ci_shu: 0,
            jie_feng_shi_jian: null,
            shen_su_zhuang_tai: 'wu',
          },
        }),
      });
    }
    return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) });
  });
}

test('FP-02 个人设置页桌面截图与控制台', async ({ page }) => {
  const collector = createConsoleCollector(page);
  await 准备已登录页(page);
  await page.goto('/zhang-hao-an-quan');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.ming-pian')).toBeVisible();
  await page.locator('#biao-qian-xingXiang').click();
  for (const 卡 of ['#tou-xiang', '#qian-ming', '#yong-hu-ming', '#mo-ren-xing-bie']) {
    await expect(page.locator(卡).first()).toBeVisible();
  }
  await page.locator('#biao-qian-zhangHao').click();
  await expect(page.locator('#mi-ma').first()).toBeVisible();
  await page.locator('#biao-qian-waiGuan').click();
  await expect(page.locator('#liao-tian-bei-jing').first()).toBeVisible();
  await page.locator('.yonghu-xuanxiang').click();
  await expect(page.locator('.yonghu-xiala')).toBeVisible();
  await page.waitForTimeout(500);
  const 横溢 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(横溢).toBeLessThanOrEqual(1);
  await page.screenshot({ path: '../测试截图/FP02-个人设置-桌面.png', timeout: 60000 });
  await page.mouse.click(10, 300);
  await page.locator('#biao-qian-xingXiang').click();
  await page.locator('#yong-hu-ming').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '../测试截图/FP02-个人设置-桌面-下部.png', timeout: 60000 });
  断言无业务错误(collector, 'FP-02 桌面个人设置页不应有控制台错误');
});

test('FP-02 个人设置页移动截图与控制台', async ({ browser }) => {
  const shouJi = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await shouJi.newPage();
  const collector = createConsoleCollector(page);
  await 准备已登录页(page);
  await page.goto('/zhang-hao-an-quan');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.ming-pian')).toBeVisible();
  await page.locator('#biao-qian-zhangHao').click();
  await expect(page.locator('#mi-ma').first()).toBeVisible();
  await page.waitForTimeout(500);
  const 横溢 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(横溢).toBeLessThanOrEqual(1);
  await page.screenshot({ path: '../测试截图/FP02-个人设置-移动.png', timeout: 60000 });
  await page.locator('#biao-qian-xingXiang').click();
  await expect(page.locator('#mo-ren-xing-bie').first()).toBeVisible();
  await page.locator('#mo-ren-xing-bie').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '../测试截图/FP02-个人设置-移动-下部.png', timeout: 60000 });
  断言无业务错误(collector, 'FP-02 移动个人设置页不应有控制台错误');
  await shouJi.close();
});
