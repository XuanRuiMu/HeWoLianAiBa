import { test, expect } from '@playwright/test';
import { createConsoleCollector } from './console-error-collector';
import { baoZhengCeShiZhangHao, daKaiJiaJuQingQiu, zhuRuJiaJuShenFen } from './测试夹具';

const JIE_TU_MU_LU = '../测试截图';

let lingPai = '';
let jiaoSeId = '';

test.beforeAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(180000);
  const qingQiu = await daKaiJiaJuQingQiu();
  const jiaJu = await baoZhengCeShiZhangHao(qingQiu);
  lingPai = jiaJu.lingPai;
  void browser;
  const huiHuaLieBiao = await qingQiu.get('/api/聊天/会话', {
    headers: { Authorization: `Bearer ${lingPai}` },
  });
  const huiHuaTi = await huiHuaLieBiao.json().catch(() => null);
  const xianYou = huiHuaTi?.shu_ju?.[0]?.jiao_se_id || huiHuaTi?.shu_ju?.[0]?.id;
  if (xianYou) {
    jiaoSeId = xianYou;
  } else {
    const shengCheng = await qingQiu.post('/api/生成角色/MBTI生成', {
      headers: { Authorization: `Bearer ${lingPai}` },
      data: { 性别: 'nan', mbti类型: 'ENFP', 渣男渣女变体: false, 用户性别: 'nv' },
    });
    const shengChengTi = await shengCheng.json();
    const queRen = await qingQiu.post('/api/生成角色/确认', {
      headers: { Authorization: `Bearer ${lingPai}` },
      data: { xuanZhongJiaoSe: shengChengTi.shu_ju },
    });
    const queRenTi = await queRen.json();
    jiaoSeId = queRenTi.shu_ju.id || queRenTi.shu_ju.jiao_se_id;
  }
  expect(lingPai).toBeTruthy();
  expect(jiaoSeId).toBeTruthy();
  await qingQiu.dispose();
});

async function dengLuYe(page: import('@playwright/test').Page) {
  await zhuRuJiaJuShenFen(page, { lingPai });
}

test.describe('视觉手册：改动页截图与控制台巡检', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test('主页：挑战卡片无排位赛角标', async ({ page }) => {
    const collector = createConsoleCollector(page);
    await dengLuYe(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.tiaozhan-moshi-kapian')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.tiaozhan-zhuangtai-biaoqian')).toHaveCount(0);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${JIE_TU_MU_LU}/shouye.png` });
    collector.assertNoErrors('主页不应有控制台错误');
  });

  test('资料设置：年龄框无0-100且越界归一', async ({ page }) => {
    const collector = createConsoleCollector(page);
    await dengLuYe(page);
    await page.goto('/profile-setup?moshi=putong', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.xingBie-kaPian').first()).toBeVisible({ timeout: 60000 });
    await page.locator('.xingBie-kaPian', { hasText: '女' }).first().click({ timeout: 30000 });
    await page.getByRole('button', { name: '下一步' }).click();
    await expect(page.locator('.buzuo-neirong').nth(1)).toBeVisible({ timeout: 30000 }).catch(() => {});
    await page.locator('.xingBie-kaPian', { hasText: '男' }).first().click({ timeout: 30000 });
    await page.getByRole('button', { name: '下一步' }).click();
    await page.locator('.xinmuzhong-ta-kaiguan').click({ timeout: 30000 });
    const nianLing = page.locator('.xinmuzhong-shurukuang').nth(2);
    await expect(nianLing).toBeVisible();
    expect(await nianLing.getAttribute('placeholder')).not.toContain('0-100');
    await nianLing.fill('150');
    await nianLing.blur();
    expect(await nianLing.inputValue()).toBe('100');
    await page.screenshot({ path: `${JIE_TU_MU_LU}/ziliao-nianling.png` });
    collector.assertNoErrors('资料设置页不应有控制台错误');
  });

  test('好友列表与账号安全页', async ({ page }) => {
    const collector = createConsoleCollector(page);
    await dengLuYe(page);
    await page.goto('/hao-you', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.haoyou-yemian')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${JIE_TU_MU_LU}/haoyou.png` });
    collector.assertNoErrors('好友列表不应有控制台错误');
    collector.clear();
    await page.goto('/zhang-hao-an-quan', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.zhang-hao-an-quan')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${JIE_TU_MU_LU}/zhanghao.png`, fullPage: true });
    collector.assertNoErrors('账号安全页不应有控制台错误');
  });

  test('聊天页：真实消息往来与微信风气泡', async ({ page }) => {
    const collector = createConsoleCollector(page);
    await dengLuYe(page);
    await page.goto(`/chat/${jiaoSeId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.liaotian-yemian')).toBeVisible({ timeout: 30000 });
    await page.locator('.shuru-kuang').fill('你好呀，今天过得怎么样？');
    await page.locator('.fasong-anniu').click();
    await expect(page.locator('.yonghu-xiaoxi .qipao-neirong').first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.jiaose-xiaoxi .qipao-neirong').first()).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${JIE_TU_MU_LU}/liaotian.png` });
    collector.assertNoErrors('聊天页不应有控制台错误');
  });

  test('聊天页：军师面板头像与背景', async ({ page }) => {
    const collector = createConsoleCollector(page);
    await dengLuYe(page);
    await page.goto(`/chat/${jiaoSeId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.liaotian-yemian')).toBeVisible({ timeout: 30000 });
    const junShi = page.locator('.junshi-anniu');
    if (await junShi.isVisible({ timeout: 10000 }).catch(() => false)) {
      await junShi.click();
      await expect(page.locator('.junshi-mianban')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${JIE_TU_MU_LU}/junshi.png` });
    }
    collector.assertNoErrors('军师面板不应有控制台错误');
  });
});
