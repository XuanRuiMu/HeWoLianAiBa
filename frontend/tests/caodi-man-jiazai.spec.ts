import { test, expect, type Page } from '@playwright/test';
import { createConsoleCollector } from './console-error-collector';

// 慢加载回归：延迟草地模型，模拟强制刷新走网络的慢材质就绪。
// T-A 慢但成功：缺席期间绝不揭示，首次揭示时全场景草叶已全紫（用户原故障的精确复刻）。
// T-B 慢到失败：门控 fail-closed（隐藏背景+横幅），任何时刻都不露出未染色。
// 跑法重、请串行跑。
test.describe.configure({ mode: 'serial' });

interface ManZaiKuaiZhao {
  yiJieLu: boolean;
  yiRanSe: boolean | null;
  caoYe: string[];
  jieduan: string | null;
}

async function zuiXinCaoDiZhen(page: Page) {
  const frames = page.frames().filter((f) => (f.url() || '').includes('grass-bg.html'));
  return frames.length ? frames[0] : null;
}

async function duQuYiCi(page: Page): Promise<ManZaiKuaiZhao | null> {
  const frame = await zuiXinCaoDiZhen(page);
  if (!frame) return null;
  const duQu = frame
    .evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const fn = w['__caoDiMenKongZhuangTai'] as
        | undefined
        | (() => { jieduan: string; yiJieLu: boolean; yiRanSe: boolean });
      const tai = fn ? fn() : null;
      const yanSe: string[] = [];
      try {
        const exp = w['__experience'] as
          | undefined
          | { engine?: { scene?: { traverse?: (cb: (o: unknown) => void) => void } } };
        const scene = exp?.engine?.scene;
        if (scene?.traverse) {
          scene.traverse((o: unknown) => {
            try {
              const m = (o as { material?: unknown }).material;
              const list = Array.isArray(m) ? m : [m];
              for (const x of list) {
                const u = (x as { uniforms?: Record<string, { value?: { getHexString?: () => string } }> }).uniforms;
                if (!u) continue;
                for (const key of ['uLightGreen', 'uGrassLightColor']) {
                  try {
                    const hex = u[key]?.value?.getHexString?.();
                    if (hex && !yanSe.includes(hex)) yanSe.push(hex);
                  } catch {
                    // 单 uniform 失败不影响整体
                  }
                }
              }
            } catch {
              // 单节点失败不影响整体
            }
          });
        }
      } catch {
        // 场景未就绪
      }
      return {
        yiJieLu: (w['__caoDiYiJieLu'] as boolean) === true,
        yiRanSe: (w['__caoDiYiRanSe'] as boolean | undefined) ?? null,
        caoYe: yanSe,
        jieduan: tai ? tai.jieduan : null,
      };
    })
    .catch(() => null);
  const chaoShi = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
  return (await Promise.race([duQu, chaoShi])) as ManZaiKuaiZhao | null;
}

test('帕姆草延迟2.5秒：揭示不受阻，出现即已染紫', async ({ page }) => {
  test.setTimeout(240000);
  const collector = createConsoleCollector(page);
  await page.route('**/grass-bg/models/grass/pampa-grass.glb', async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const guiJi: string[] = [];
  let shouCiJieLu: ManZaiKuaiZhao | null = null;
  const jieZhi = Date.now() + 150000;
  for (;;) {
    if ((await page.locator('.cao-di-shibai-ti-shi').count()) > 0) break;
    const k = await duQuYiCi(page);
    if (k) {
      guiJi.push(`${k.yiJieLu ? '揭' : '待'}:草${k.caoYe.length}[${k.caoYe.join('|')}],证=${k.yiRanSe},段=${k.jieduan}`);
      if (k.yiJieLu) {
        shouCiJieLu = k;
        break;
      }
    } else {
      guiJi.push('帧无/读失败');
    }
    if (Date.now() > jieZhi) break;
    await page.waitForTimeout(500);
  }
  expect(shouCiJieLu, `超时未揭示，轨迹：${guiJi.slice(0, 12).join(' / ')}`).not.toBeNull();
  // 揭示后连续采样：迟到的帕姆草一旦出现必须已是紫色，不许冒出默认米白
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(1000);
    const k = await duQuYiCi(page);
    if (!k) continue;
    guiJi.push(`稳${i}:草${k.caoYe.length}[${k.caoYe.join('|')}]`);
    expect(k.caoYe.length, `稳定期应扫到草叶，轨迹尾：${guiJi.slice(-4).join(' / ')}`).toBeGreaterThan(0);
    expect(
      k.caoYe.every((s) => s === 'b07be0'),
      `稳定期草叶应全紫，轨迹尾：${guiJi.slice(-4).join(' / ')}`,
    ).toBe(true);
  }
  collector.assertNoErrors('慢加载应无控制台错误');
  await page.screenshot({ path: '../测试截图/草地染色-慢加载揭示.png' });
});

test('模型延迟30秒：失败即隐藏+横幅，绝不露未染色', async ({ page }) => {
  test.setTimeout(240000);
  const consoleShuChu: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') consoleShuChu.push(`[${msg.type()}]${msg.text().slice(0, 160)}`);
  });
  page.on('pageerror', (err) => {
    consoleShuChu.push(`[pageerror]${String(err?.message || err).slice(0, 160)}`);
  });
  await page.route('**/grass-bg/models/**', async (route) => {
    await new Promise((r) => setTimeout(r, 30000));
    await route.continue();
  });
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const guiJi: string[] = [];
  let jianHengFu = false;
  const jieZhi = Date.now() + 150000;
  for (;;) {
    const hengFuShu = await page.locator('.cao-di-shibai-ti-shi').count();
    if (hengFuShu > 0) {
      jianHengFu = true;
      break;
    }
    const k = await duQuYiCi(page);
    guiJi.push(
      k
        ? `待:草${k.caoYe.length}[${k.caoYe.join('|')}],证=${k.yiRanSe},段=${k.jieduan}`
        : '帧无/读失败',
    );
    if (Date.now() > jieZhi) break;
    await page.waitForTimeout(2000);
  }
  console.log(`轨迹(${guiJi.length})：` + guiJi.slice(0, 20).join(' / '));
  console.log('控制台：' + (consoleShuChu.length ? consoleShuChu.slice(0, 12).join(' / ') : '空'));
  expect(jianHengFu, `横幅应在超时内出现，轨迹：${guiJi.slice(0, 20).join(' / ')}`).toBe(true);
  // 背景 iframe 不得进入已揭示态（opacity 0 或已销毁）
  const yiJiHuo = await page.locator('iframe.grass-bg-iframe.is-active').count();
  expect(yiJiHuo, '失败时背景绝不能展现').toBe(0);
  await page.screenshot({ path: '../测试截图/草地染色-失败横幅.png' });
});
