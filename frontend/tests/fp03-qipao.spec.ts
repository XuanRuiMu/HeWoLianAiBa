import { test, expect } from '@playwright/test';
import { createConsoleCollector } from './console-error-collector';

test.setTimeout(120000);

const HAO_YOU_ID = '22222222-2222-4222-8222-222222222222';
const WO_DE_ID = 'fp03-uid';

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
  id: WO_DE_ID,
  shou_ji_hao: '13800138003',
  yong_hu_ming: '气泡测试用户',
  ni_cheng: '气泡昵称',
  tou_xiang: null,
  mo_ren_xing_bie: 'female',
  jiao_se: null,
  neng_li: [],
};

function 用户设置(ziJi: string, ai: string) {
  return {
    uid: WO_DE_ID,
    shou_ji_hao: '13800138003',
    tou_xiang: null,
    qian_ming: null,
    qian_ming_ke_jian_xing: 'gong_kai',
    qian_ming_bai_ming_dan: [],
    liao_tian_bei_jing: 'moRen',
    qi_pao_zi_ji: ziJi,
    qi_pao_ai: ai,
    gong_kai_zhang_hao: true,
    gong_kai_shou_ji_hao: false,
    gong_kai_you_xiang: false,
    bang_ding_you_xiang: '',
  };
}

const 聊天消息 = [
  {
    id: 'fp03-x1',
    hui_hua_id: 'test-huihua',
    fa_song_zhe_id: WO_DE_ID,
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '我的天空蓝气泡',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
  },
  {
    id: 'fp03-x2',
    hui_hua_id: 'test-huihua',
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: 'AI的樱粉气泡',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
  },
];

const 好友消息 = [
  {
    id: 'fp03-h1',
    fa_song_zhe_id: WO_DE_ID,
    jie_shou_zhe_id: HAO_YOU_ID,
    nei_rong: '我的柠檬黄气泡',
    lei_xing: 'wenben',
    mei_ti_id: null,
    yi_du: true,
    yi_che_hui: false,
    shi_jian_chuo: Date.now(),
  },
  {
    id: 'fp03-h2',
    fa_song_zhe_id: HAO_YOU_ID,
    jie_shou_zhe_id: WO_DE_ID,
    nei_rong: '好友的暗夜气泡',
    lei_xing: 'wenben',
    mei_ti_id: null,
    yi_du: true,
    yi_che_hui: false,
    shi_jian_chuo: Date.now(),
  },
];

async function 准备气泡页(page: import('@playwright/test').Page, 偏好: { ziJi: string; ai: string }) {
  await page.addInitScript(() => {
    // 令牌真源是 sessionStorage（utils/令牌存储.ts 的 huiHuaCunChu），写进 localStorage 应用读不到
    window.sessionStorage.setItem('令牌', 'fp03-qipao-token');
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
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 用户设置(偏好.ziJi, 偏好.ai) }) });
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

test('FP-03 聊天页气泡主题桌面截图与控制台', async ({ page }) => {
  const collector = createConsoleCollector(page);
  await 准备气泡页(page, { ziJi: 'tianKongLan', ai: 'yingFen' });
  await page.goto('/chat/test-huihua');
  const 聊天区 = page.locator('main.xiaoxi-quyu');
  await expect(聊天区).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.yonghu-xiaoxi .qipao-neirong').first()).toBeVisible({ timeout: 30000 });
  const 变量 = await 聊天区.evaluate((el) => {
    const 样式 = el as HTMLElement;
    return {
      ziJi: 样式.style.getPropertyValue('--qipao-ziJi-beiJing').trim(),
      duiFang: 样式.style.getPropertyValue('--qipao-duiFang-beiJing').trim(),
    };
  });
  expect(变量.ziJi).toBe('#7FB8F0');
  expect(变量.duiFang).toBe('#F4A9C4');
  const 自己底色 = await page.locator('.yonghu-xiaoxi .qipao-neirong').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(自己底色).toBe('rgb(127, 184, 240)');
  const 对方底色 = await page.locator('.jiaose-xiaoxi .qipao-neirong').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(对方底色).toBe('rgb(244, 169, 196)');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '../../.agents/evidence/traces/FP-03-聊天页-气泡主题-桌面.png', timeout: 60000 });
  断言无业务错误(collector, 'FP-03 聊天页气泡主题不应有控制台错误');
});

test('FP-03 好友聊天页气泡主题移动截图与控制台', async ({ browser }) => {
  const 上下文 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await 上下文.newPage();
  const collector = createConsoleCollector(page);
  await 准备气泡页(page, { ziJi: 'ningMengHuang', ai: 'yunBai' });
  await page.goto(`/hao-you/${HAO_YOU_ID}`);
  const 聊天区 = page.locator('main.xiaoxi-quyu');
  await expect(聊天区).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.yonghu-xiaoxi .qipao-neirong').first()).toBeVisible({ timeout: 30000 });
  const 变量 = await 聊天区.evaluate((el) => {
    const 样式 = el as HTMLElement;
    return {
      ziJi: 样式.style.getPropertyValue('--qipao-ziJi-beiJing').trim(),
      duiFang: 样式.style.getPropertyValue('--qipao-duiFang-beiJing').trim(),
    };
  });
  expect(变量.ziJi).toBe('#F5DE6B');
  expect(变量.duiFang).toBe('#3A3A3C');
  const 自己底色 = await page.locator('.yonghu-xiaoxi .qipao-neirong').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(自己底色).toBe('rgb(245, 222, 107)');
  const 对方底色 = await page.locator('.jiaose-xiaoxi .qipao-neirong').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(对方底色).toBe('rgb(58, 58, 60)');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '../../.agents/evidence/traces/FP-03-好友聊天-气泡主题-移动.png', timeout: 60000 });
  断言无业务错误(collector, 'FP-03 好友聊天页气泡主题不应有控制台错误');
  await 上下文.close();
});
