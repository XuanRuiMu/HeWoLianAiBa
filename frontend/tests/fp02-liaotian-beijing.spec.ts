import { test, expect } from '@playwright/test';
import { createConsoleCollector } from './console-error-collector';

test.setTimeout(120000);

const ZI_DING_YI_BEI_JING = 'https://cdn.example.com/beijing/fp02.jpg';
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const HAO_YOU_ID = '11111111-1111-4111-8111-111111111111';

function 断言无业务错误(collector: import('./console-error-collector').ConsoleErrorCollector, 消息: string) {
  const 剩余 = collector
    .getErrors()
    .filter((e) => !/\.(woff2?|ttf|otf)(\?.*)?$/.test(e.location?.url || ''));
  if (剩余.length > 0) {
    throw new Error(
      `${消息}:\n${剩余.map((e) => `[${e.type.toUpperCase()}] ${e.text} at ${e.location?.url}`).join('\n')}`,
    );
  }
  // 告警不再额外豁免（GL 驱动初始化与 429 由 console-error-collector 单源处理）；
  // 旧正则的 `WebGL` 过宽，且屏蔽的正是「问题 1」的 READ-usage 回读类告警。
  const 警告 = collector.getWarnings();
  if (警告.length > 0) {
    throw new Error(`${消息}（警告）:\n${警告.map((w) => w.text).join('\n')}`);
  }
}

const 测试用户 = {
  id: 'fp02-uid',
  shou_ji_hao: '13800138000',
  yong_hu_ming: '背景测试用户',
  ni_cheng: '背景昵称',
  tou_xiang: null,
  mo_ren_xing_bie: 'female',
  jiao_se: null,
  neng_li: [],
};

const 用户设置 = {
  uid: 'fp02-uid',
  shou_ji_hao: '13800138000',
  tou_xiang: null,
  qian_ming: null,
  qian_ming_ke_jian_xing: 'gong_kai',
  qian_ming_bai_ming_dan: [],
  liao_tian_bei_jing: ZI_DING_YI_BEI_JING,
  gong_kai_zhang_hao: true,
  gong_kai_shou_ji_hao: false,
  gong_kai_you_xiang: false,
  bang_ding_you_xiang: '',
};

async function 准备自定义背景页(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    // 令牌真源是 sessionStorage（utils/令牌存储.ts 的 huiHuaCunChu），写进 localStorage 应用读不到
    window.sessionStorage.setItem('令牌', 'fp02-beijing-token');
  });
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (route) => route.abort());
  await page.route('https://cdn.example.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1PX }),
  );
  await page.route('**/api/**', (route) => {
    const 请求 = new URL(route.request().url());
    const 路径 = decodeURIComponent(请求.pathname);
    if (路径 !== '/api' && !路径.startsWith('/api/')) return route.fallback();
    if (路径.endsWith('/api/认证/信息')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 测试用户 }) });
    }
    if (路径 === '/api/用户设置' || 路径.startsWith('/api/用户设置/')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 用户设置 }) });
    }
    if (路径.includes('/api/聊天/会话/') && 路径.endsWith('/消息')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], zong_shu: 0, hai_you_geng_duo: false } }),
      });
    }
    if (路径.startsWith('/api/角色/详情/')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { jiao_se: { id: 'test-huihua', 名字: '测试角色', 头像: null }, dang_an_zhuang_tai: null },
        }),
      });
    }
    if (路径.endsWith('/api/聊天/多模态配置')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: {
            yuYinLiJieQiYong: false,
            shiPinLiJieQiYong: false,
            tuXiangShengChengQiYong: false,
            shiPinShengChengQiYong: false,
            meiRiShengChengShangXian: 0,
          },
        }),
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
          shu_ju: { bei_feng_jin: false, ji_bie: 'zheng_chang', wei_gui_ci_shu: 0, jie_feng_shi_jian: null, shen_su_zhuang_tai: 'wu' },
        }),
      });
    }
    if (路径 === '/api/好友/列表') {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { lie_biao: [{ id: HAO_YOU_ID, yong_hu_ming: 'haoYou', ni_cheng: '好友昵称', tou_xiang: null, qian_ming: null }] },
        }),
      });
    }
    if (路径.startsWith('/api/好友/消息/')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [] } }),
      });
    }
    return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) });
  });
}

test('FP-02 聊天页自定义背景桌面截图与控制台', async ({ page }) => {
  const collector = createConsoleCollector(page);
  await 准备自定义背景页(page);
  await page.goto('/chat/test-huihua');
  const 聊天区 = page.locator('main.xiaoxi-quyu');
  await expect(聊天区).toBeVisible({ timeout: 30000 });
  await expect(聊天区).toHaveClass(/beijing-ziDingYi/);
  const 内联背景 = await 聊天区.evaluate((el) => (el as HTMLElement).style.backgroundImage);
  expect(内联背景).toContain(ZI_DING_YI_BEI_JING);
  const 铺满 = await 聊天区.evaluate((el) => getComputedStyle(el).backgroundSize);
  expect(铺满).toBe('cover');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '../../.agents/evidence/traces/FP-02-聊天页-自定义背景-桌面.png', timeout: 60000 });
  断言无业务错误(collector, 'FP-02 聊天页自定义背景不应有控制台错误');
});

test('FP-02 好友聊天页自定义背景移动截图与控制台', async ({ browser }) => {
  const 上下文 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await 上下文.newPage();
  const collector = createConsoleCollector(page);
  await 准备自定义背景页(page);
  await page.goto(`/hao-you/${HAO_YOU_ID}`);
  const 聊天区 = page.locator('main.xiaoxi-quyu');
  await expect(聊天区).toBeVisible({ timeout: 30000 });
  await expect(聊天区).toHaveClass(/beijing-ziDingYi/);
  const 内联背景 = await 聊天区.evaluate((el) => (el as HTMLElement).style.backgroundImage);
  expect(内联背景).toContain(ZI_DING_YI_BEI_JING);
  await page.waitForTimeout(500);
  await page.screenshot({ path: '../../.agents/evidence/traces/FP-02-好友聊天-自定义背景-移动.png', timeout: 60000 });
  断言无业务错误(collector, 'FP-02 好友聊天页自定义背景不应有控制台错误');
  await 上下文.close();
});
