import { test, expect } from '@playwright/test';
import { createConsoleCollector } from './console-error-collector';
import { baoZhengCeShiZhangHao, zhuRuJiaJuShenFen } from './测试夹具';

test.describe('全流程 E2E 测试：登录 -> 挑战模式 -> 完成游戏 -> 复盘 -> 积分', () => {
  test.beforeEach(async ({ page }) => {
    // 429 由 console-error-collector 单源白名单覆盖（且资源加载类消息本就走 response 通道），此处不再重复
    const collector = createConsoleCollector(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    collector.assertCleanConsole('登录页加载应无错误');
  });

  test('完整游戏流程：登录 -> 挑战 -> 复盘 -> 积分', async ({ page }) => {
    test.setTimeout(180000);
    const collector = createConsoleCollector(page);
    // 不再在本用例里追加任何 addIgnorePattern。
    // 旧版一次性豁免 GL_INVALID_ENUM / GPU stall / performance warning / READ-usage buffer /
    // shadow copy / fenced / readback / discarded the shadow copy / GL Driver Message 共 9 条，
    // 恰好把「问题 1 要求消除的那类 GPU 回读告警」整体屏蔽掉 ⇒ 该缺陷回归也会全绿。
    // 429 与 GL 驱动初始化消息已由 console-error-collector 单源白名单覆盖，页面不重复放宽。

    // === 步骤 1：夹具账号登录（缺失即自建，见 tests/测试夹具.ts） ===
    console.log('步骤 1：API 登录');
    await zhuRuJiaJuShenFen(page, await baoZhengCeShiZhangHao(page.request));
    console.log('API 登录成功');

    // 重新加载页面让路由守卫生效
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 验证已跳转到主页
    const currentUrl = page.url();
    console.log('重载后 URL:', currentUrl);
    await expect(page).toHaveURL('/', { timeout: 15000 });
    collector.assertCleanConsole('登录后主页应无错误');

    // === 步骤 2：进入挑战模式 ===
    console.log('步骤 2：进入挑战模式');
    await page.click('button:has-text("接受挑战")', { timeout: 30000 });
    await page.waitForURL('/tiao-zhan', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    collector.assertCleanConsole('挑战模式页应无错误');

    // === 步骤 3：完成一局游戏 ===
    console.log('步骤 3：完成一局游戏');
    const chatInput = page.locator('input[placeholder*="消息"], textarea[placeholder*="消息"]').first();
    if (await chatInput.isVisible({ timeout: 5000 })) {
      await chatInput.fill('你好');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      collector.assertCleanConsole('发送消息后应无错误');
    }

    // === 步骤 4：查看复盘 ===
    console.log('步骤 4：查看复盘');
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    collector.assertCleanConsole('复盘页应无错误');

    // === 步骤 5：查看积分 ===
    console.log('步骤 5：查看积分');
    await page.goto('/tiao-zhan-ji-fen');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    collector.assertCleanConsole('积分榜页应无错误');

    // 截图保存
    await page.screenshot({ path: '测试截图/full-flow-complete.png', fullPage: true });
  });

  test('挑战积分榜页面加载', async ({ page }) => {
    test.setTimeout(120000);
    const collector = createConsoleCollector(page);
    // 同上一用例：不在此处重复放宽。429 与 GL 驱动初始化消息由 console-error-collector 单源处理；
    // GPU 回读类告警（READ-usage / shadow copy / readback / performance warning）属必须能红灯的一类。

    // 登录夹具账号
    await zhuRuJiaJuShenFen(page, await baoZhengCeShiZhangHao(page.request));
    console.log('API 登录成功');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 验证已跳转到主页
    const currentUrl = page.url();
    console.log('重载后 URL:', currentUrl);
    await expect(page).toHaveURL('/', { timeout: 15000 });
    collector.assertCleanConsole('登录后页面应无错误');

    // 访问积分榜
    await page.goto('/tiao-zhan-ji-fen');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    collector.assertCleanConsole('积分榜页面应无错误');

    await page.screenshot({ path: '测试截图/ji-fen-bang.png', fullPage: true });
  });
});