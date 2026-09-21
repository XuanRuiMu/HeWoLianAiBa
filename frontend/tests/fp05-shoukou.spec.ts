import { test, expect } from '@playwright/test';
import { createConsoleCollector } from './console-error-collector';

test.setTimeout(120000);

async function 重试截图(page: import('@playwright/test').Page, 路径: string) {
  let 最后错误: unknown = null;
  for (let 轮 = 1; 轮 <= 3; 轮++) {
    try {
      await page.screenshot({ path: 路径, timeout: 60000 });
      return;
    } catch (e) {
      最后错误 = e;
      await page.waitForTimeout(1000);
    }
  }
  throw 最后错误;
}

function 断言控制台干净(collector: import('./console-error-collector').ConsoleErrorCollector, 消息: string) {
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
    throw new Error(
      `${消息}（警告）:\n${警告.map((w) => `${w.text} at ${w.location?.url || '未知来源'}:${w.location?.lineNumber ?? '?'}`).join('\n')}`,
    );
  }
}

const HAO_YOU_ID = '22222222-2222-4222-8222-222222222222';
const WO_DE_ID = 'fp05-uid';

const 测试用户 = {
  id: WO_DE_ID,
  shou_ji_hao: '13800138005',
  yong_hu_ming: '收口测试用户',
  ni_cheng: '收口昵称',
  tou_xiang: null,
  mo_ren_xing_bie: 'female',
  jiao_se: null,
  neng_li: [],
};

function 用户设置() {
  return {
    uid: WO_DE_ID,
    shou_ji_hao: '13800138005',
    tou_xiang: null,
    qian_ming: null,
    qian_ming_ke_jian_xing: 'gong_kai',
    qian_ming_bai_ming_dan: [],
    liao_tian_bei_jing: 'miWuSenLin',
    qi_pao_zi_ji: 'tianKongLan',
    qi_pao_ai: 'yingFen',
    gong_kai_zhang_hao: true,
    gong_kai_shou_ji_hao: false,
    gong_kai_you_xiang: false,
    bang_ding_you_xiang: '',
  };
}

const 聊天消息 = [
  {
    id: 'fp05-x1',
    hui_hua_id: 'test-huihua',
    fa_song_zhe_id: WO_DE_ID,
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '收口验证消息',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
  },
  {
    id: 'fp05-x2',
    hui_hua_id: 'test-huihua',
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: 'AI收口回复',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
  },
];

const 好友消息 = [
  {
    id: 'fp05-h1',
    fa_song_zhe_id: WO_DE_ID,
    jie_shou_zhe_id: HAO_YOU_ID,
    nei_rong: '好友收口消息',
    lei_xing: 'wenben',
    mei_ti_id: null,
    yi_du: true,
    yi_che_hui: false,
    shi_jian_chuo: Date.now(),
  },
  {
    id: 'fp05-h2',
    fa_song_zhe_id: HAO_YOU_ID,
    jie_shou_zhe_id: WO_DE_ID,
    nei_rong: '好友收口回复',
    lei_xing: 'wenben',
    mei_ti_id: null,
    yi_du: true,
    yi_che_hui: false,
    shi_jian_chuo: Date.now(),
  },
];

async function 准备收口页(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    // 令牌真源是 sessionStorage（utils/令牌存储.ts 的 huiHuaCunChu），写进 localStorage 应用读不到
    // ⇒ 路由守卫判未登录并跳回登录页，页面元素自然全部找不到
    window.sessionStorage.setItem('令牌', 'fp05-shoukou-token');
  });
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (route) => route.abort());
  await page.route('**/api/**', (route) => {
    const 请求 = new URL(route.request().url());
    const 路径 = decodeURIComponent(请求.pathname);
    if (路径 !== '/api' && !路径.startsWith('/api/')) return route.fallback();
    if (路径.endsWith('/api/认证/信息')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 测试用户 }) });
    }
    if (路径 === '/api/用户设置' || 路径.startsWith('/api/用户设置/')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 用户设置() }) });
    }
    if (路径.includes('/api/聊天/会话/') && 路径.endsWith('/消息')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: 聊天消息, zong_shu: 2, hai_you_geng_duo: false } }),
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
    if (路径.startsWith('/api/资料/名片/')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: {
            id: HAO_YOU_ID,
            yong_hu_ming: 'haoYou',
            ni_cheng: '好友昵称',
            tou_xiang: null,
            qian_ming: null,
            shi_hao_you: true,
            shi_zi_ji: false,
            qi_pao_zi_ji: 'anYe',
            qi_pao_ai: 'yunBai',
          },
        }),
      });
    }
    if (路径.startsWith('/api/好友/消息/')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: 好友消息 } }),
      });
    }
    return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) });
  });
}

async function 新移动页(browser: import('@playwright/test').Browser) {
  const 上下文 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await 上下文.newPage();
  return { 上下文, page };
}

test('FP-05 桌面聊天页截图与控制台', async ({ page }) => {
  const collector = createConsoleCollector(page);
  await 准备收口页(page);
  await page.goto('/chat/test-huihua');
  const 聊天区 = page.locator('main.xiaoxi-quyu');
  await expect(聊天区).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.yonghu-xiaoxi .qipao-neirong').first()).toBeVisible({ timeout: 30000 });
  const 变量 = await 聊天区.evaluate((el) => ({
    ziJi: (el as HTMLElement).style.getPropertyValue('--qipao-ziJi-beiJing').trim(),
    duiFang: (el as HTMLElement).style.getPropertyValue('--qipao-duiFang-beiJing').trim(),
  }));
  expect(变量.ziJi).toBe('#7FB8F0');
  expect(变量.duiFang).toBe('#F4A9C4');
  await page.waitForTimeout(500);
  await 重试截图(page, '../测试截图/FP-05-桌面-聊天.png');
  断言控制台干净(collector, 'FP-05 桌面聊天页不应有控制台错误');
});

test('FP-05 桌面好友聊天页截图与控制台', async ({ page }) => {
  const collector = createConsoleCollector(page);
  await 准备收口页(page);
  await page.goto(`/hao-you/${HAO_YOU_ID}`);
  const 聊天区 = page.locator('main.xiaoxi-quyu');
  await expect(聊天区).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.yonghu-xiaoxi .qipao-neirong').first()).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(500);
  await 重试截图(page, '../测试截图/FP-05-桌面-好友聊天.png');
  断言控制台干净(collector, 'FP-05 桌面好友聊天页不应有控制台错误');
});

test('FP-05 桌面个人设置页截图与控制台', async ({ page }) => {
  const collector = createConsoleCollector(page);
  await 准备收口页(page);
  await page.goto('/zhang-hao-an-quan');
  await expect(page.locator('.zhang-hao-an-quan').first()).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(500);
  await 重试截图(page, '../测试截图/FP-05-桌面-个人设置.png');
  断言控制台干净(collector, 'FP-05 桌面个人设置页不应有控制台错误');
});

test('FP-05 桌面气泡预设页截图与控制台', async ({ page }) => {
  const collector = createConsoleCollector(page);
  await 准备收口页(page);
  await page.goto('/qi-pao-she-zhi');
  await expect(page.locator('.qipao-she-zhi-ye').first()).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.qipao-ye-biao-ti').first()).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(500);
  await 重试截图(page, '../测试截图/FP-05-桌面-气泡预设.png');
  断言控制台干净(collector, 'FP-05 桌面气泡预设页不应有控制台错误');
});

test('FP-05 移动聊天页截图与控制台', async ({ browser }) => {
  const { 上下文, page } = await 新移动页(browser);
  try {
    const collector = createConsoleCollector(page);
    await 准备收口页(page);
    await page.goto('/chat/test-huihua');
    const 聊天区 = page.locator('main.xiaoxi-quyu');
    await expect(聊天区).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.yonghu-xiaoxi .qipao-neirong').first()).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(500);
    await 重试截图(page, '../测试截图/FP-05-移动-聊天.png');
    断言控制台干净(collector, 'FP-05 移动聊天页不应有控制台错误');
  } finally {
    await 上下文.close();
  }
});

test('FP-05 移动好友聊天页截图与控制台', async ({ browser }) => {
  const { 上下文, page } = await 新移动页(browser);
  try {
    const collector = createConsoleCollector(page);
    await 准备收口页(page);
    await page.goto(`/hao-you/${HAO_YOU_ID}`);
    const 聊天区 = page.locator('main.xiaoxi-quyu');
    await expect(聊天区).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.yonghu-xiaoxi .qipao-neirong').first()).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(500);
    await 重试截图(page, '../测试截图/FP-05-移动-好友聊天.png');
    断言控制台干净(collector, 'FP-05 移动好友聊天页不应有控制台错误');
  } finally {
    await 上下文.close();
  }
});

test('FP-05 移动个人设置页截图与控制台', async ({ browser }) => {
  const { 上下文, page } = await 新移动页(browser);
  try {
    const collector = createConsoleCollector(page);
    await 准备收口页(page);
    await page.goto('/zhang-hao-an-quan');
    await expect(page.locator('.zhang-hao-an-quan').first()).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(500);
    await 重试截图(page, '../测试截图/FP-05-移动-个人设置.png');
    断言控制台干净(collector, 'FP-05 移动个人设置页不应有控制台错误');
  } finally {
    await 上下文.close();
  }
});

test('FP-05 移动气泡预设页截图与控制台', async ({ browser }) => {
  const { 上下文, page } = await 新移动页(browser);
  try {
    const collector = createConsoleCollector(page);
    await 准备收口页(page);
    await page.goto('/qi-pao-she-zhi');
    await expect(page.locator('.qipao-she-zhi-ye').first()).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(500);
    await 重试截图(page, '../测试截图/FP-05-移动-气泡预设.png');
    断言控制台干净(collector, 'FP-05 移动气泡预设页不应有控制台错误');
  } finally {
    await 上下文.close();
  }
});
