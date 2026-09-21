import { test, expect } from '@playwright/test';
import { createConsoleCollector } from './console-error-collector';

test.describe('控制台错误/警告巡检', () => {
  test('登录页加载应无控制台错误和警告', async ({ page }) => {
    const collector = createConsoleCollector(page);
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    collector.assertCleanConsole('登录页控制台应无错误和警告');
  });

  test('核心路由页面应无控制台错误', async ({ page }) => {
    const collector = createConsoleCollector(page);
    // 只测试无需认证的公开路由
    const routes = ['/login', '/register'];
    
    for (const route of routes) {
      collector.clear();
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      collector.assertNoErrors(`${route} 页面不应有控制台错误`);
    }
  });

  test('认证流程交互后应无新增错误', async ({ page }) => {
    const collector = createConsoleCollector(page);
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // 输入手机号
    await page.fill('input[type="tel"], input[placeholder*="手机"]', '13800138000');
    await page.waitForTimeout(500);
    
    // 点击获取验证码
    const sendBtn = page.locator('button:has-text("获取验证码"), button:has-text("发送验证码")').first();
    if (await sendBtn.isVisible({ timeout: 1000 })) {
      await sendBtn.click();
      await page.waitForTimeout(1000);
    }
    
    collector.assertCleanConsole('认证流程交互后控制台应无错误和警告');
  });
});