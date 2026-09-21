import { test, expect } from '@playwright/test';
import { createConsoleCollector } from './console-error-collector';

test.setTimeout(120000);

// 口径与 FP-02 一致：字体资源失败按 location 精确过滤，警告仅允许既有 GPU/READ 回读噪音。
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
  id: 'fp06-visual',
  shou_ji_hao: '13800138000',
  yong_hu_ming: '收口测试用户',
  ni_cheng: '收口昵称',
  xing_bie: 'female',
  mu_biao_xing_bie: 'male',
  mo_ren_xing_bie: 'female',
  xing_ge_xuan_ze: 'INTJ',
  ren_she_biao_qian: 'neiLianXueBa',
  yun_xu_zha_nan_zha_nv: false,
  tou_xiang: null,
  sheng_ri: null,
  qian_ming: '收口签名',
  jiao_se: 'chao_guan',
  neng_li: ['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we'],
  huo_yue_ren_she_id: null,
  hai_wang_fen_shu: 0,
  chuang_jian_shi_jian: new Date().toISOString(),
  geng_xin_shi_jian: new Date().toISOString(),
};

const 用户设置 = {
  uid: 'fp06-uid',
  shou_ji_hao: '13800138000',
  tou_xiang: null,
  qian_ming: '收口签名',
  qian_ming_ke_jian_xing: 'gong_kai',
  qian_ming_bai_ming_dan: [],
  liao_tian_bei_jing: 'moRen',
  gong_kai_zhang_hao: true,
  gong_kai_shou_ji_hao: false,
  gong_kai_you_xiang: false,
  bang_ding_you_xiang: '',
};

const 会话消息 = [
  {
    id: 'fp06-m1',
    hui_hua_id: 'fp06-huihua',
    fa_song_zhe_id: 'fp06-visual',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: 'FP-06收口验证消息',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now() - 60000,
    yi_du: true,
    ke_hu_duan_xu_hao: 1,
  },
  {
    id: 'fp06-m2',
    hui_hua_id: 'fp06-huihua',
    fa_song_zhe_id: 'fp06-jiaose',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: '收到，这里是收口验证回复',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now() - 30000,
    yi_du: true,
    ke_hu_duan_xu_hao: 2,
  },
];

const 角色详情 = {
  jiao_se: {
    id: 'fp06-jiaose',
    ming_zi: 'FP06验证角色',
    tou_xiang: null,
    xing_bie: 'nan',
  },
  dang_an_zhuang_tai: null,
};

async function 准备已登录页(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    // 令牌真源是 sessionStorage（utils/令牌存储.ts 的 huiHuaCunChu），写进 localStorage 应用读不到
    window.sessionStorage.setItem('令牌', 'fp06-visual-token');
  });
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (route) => route.abort());
  await page.route('**/api/**', (route) => {
    const 路径 = decodeURIComponent(new URL(route.request().url()).pathname);
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
    if (路径.includes('/api/聊天/会话/fp06-huihua/消息') && route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: 会话消息, zong_shu: 2 } }),
      });
    }
    if (路径.endsWith('/api/角色/详情/fp06-huihua')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: 角色详情 }),
      });
    }
    if (路径.endsWith('/api/聊天/会话/fp06-huihua/已读')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: {} }),
      });
    }
    return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) });
  });
}

async function 断言顶栏三区无重叠(page: import('@playwright/test').Page) {
  const 交叠 = await page.evaluate(() => {
    const 左 = document.querySelector('.caidan-zuo')?.getBoundingClientRect();
    const 中 = document.querySelector('.caidan-zhong')?.getBoundingClientRect();
    const 右 = document.querySelector('.caidan-you')?.getBoundingClientRect();
    if (!左 || !中 || !右) return '缺少顶栏分区';
    if (左.right > 中.left + 1) return `左区侵入中区: ${左.right} > ${中.left}`;
    if (中.right > 右.left + 1) return `中区侵入右区: ${中.right} > ${右.left}`;
    const 昵称 = document.querySelector('.yonghu-mingcheng')?.getBoundingClientRect();
    const 角色名 = document.querySelector('.jiaose-mingcheng-caidan')?.getBoundingClientRect();
    if (昵称 && 角色名 && 昵称.width > 0 && 角色名.width > 0) {
      const 横向交叠 = Math.min(昵称.right, 角色名.right) - Math.max(昵称.left, 角色名.left);
      const 纵向交叠 = Math.min(昵称.bottom, 角色名.bottom) - Math.max(昵称.top, 角色名.top);
      if (横向交叠 > 1 && 纵向交叠 > 1) return `昵称与角色名文本交叠: ${横向交叠}x${纵向交叠}`;
    }
    return '';
  });
  expect(交叠).toBe('');
}

async function 断言无横溢(page: import('@playwright/test').Page) {
  const 横溢 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(横溢).toBeLessThanOrEqual(1);
}

test('FP-06 主页桌面截图与控制台', async ({ page }) => {
  const collector = createConsoleCollector(page);
  await 准备已登录页(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.zhuye-quyu')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(2500);
  await 断言无横溢(page);
  await page.screenshot({ path: '../测试截图/FP06-主页-桌面.png', timeout: 60000 });
  断言无业务错误(collector, 'FP-06 桌面主页不应有控制台错误');
});

test('FP-06 主页移动截图与控制台', async ({ browser }) => {
  const shouJi = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await shouJi.newPage();
  const collector = createConsoleCollector(page);
  await 准备已登录页(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.zhuye-quyu')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(2500);
  await 断言无横溢(page);
  await page.screenshot({ path: '../测试截图/FP06-主页-移动.png', timeout: 60000 });
  断言无业务错误(collector, 'FP-06 移动主页不应有控制台错误');
  await shouJi.close();
});

test('FP-06 个人设置桌面截图与控制台', async ({ page }) => {
  const collector = createConsoleCollector(page);
  await 准备已登录页(page);
  await page.goto('/zhang-hao-an-quan');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.ming-pian')).toBeVisible({ timeout: 30000 });
  await page.locator('#biao-qian-zhangHao').click();
  await expect(page.locator('#mi-ma').first()).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(500);
  await 断言无横溢(page);
  await page.screenshot({ path: '../测试截图/FP06-个人设置-桌面.png', timeout: 60000 });
  断言无业务错误(collector, 'FP-06 桌面个人设置页不应有控制台错误');
});

test('FP-06 个人设置移动截图与控制台', async ({ browser }) => {
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
  await expect(page.locator('.ming-pian')).toBeVisible({ timeout: 30000 });
  await page.locator('#biao-qian-zhangHao').click();
  await expect(page.locator('#mi-ma').first()).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(500);
  await 断言无横溢(page);
  await page.screenshot({ path: '../测试截图/FP06-个人设置-移动.png', timeout: 60000 });
  断言无业务错误(collector, 'FP-06 移动个人设置页不应有控制台错误');
  await shouJi.close();
});

async function 打开聊天监控(page: import('@playwright/test').Page) {
  await page.goto('/chat/fp06-huihua');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.shuru-kuang')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(800);
  await page.locator('.shuru-kuang').fill('greedisgood');
  await page.keyboard.press('Enter');
  await expect(page.locator('.guanli-jiankong-fuchuang')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(800);
  await 断言顶栏三区无重叠(page);
}

test('FP-06 聊天监控桌面截图与控制台', async ({ page }) => {
  const collector = createConsoleCollector(page);
  await 准备已登录页(page);
  await 打开聊天监控(page);
  await page.screenshot({ path: '../测试截图/FP06-聊天监控-桌面.png', timeout: 60000 });
  断言无业务错误(collector, 'FP-06 桌面聊天监控不应有控制台错误');
});

test('FP-06 聊天监控移动截图与控制台', async ({ browser }) => {
  const shouJi = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await shouJi.newPage();
  const collector = createConsoleCollector(page);
  await 准备已登录页(page);
  await 打开聊天监控(page);
  await page.screenshot({ path: '../测试截图/FP06-聊天监控-移动.png', timeout: 60000 });
  断言无业务错误(collector, 'FP-06 移动聊天监控不应有控制台错误');
  await shouJi.close();
});
