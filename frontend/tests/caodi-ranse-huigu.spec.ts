import { test, expect } from '@playwright/test';
import { createConsoleCollector } from './console-error-collector';

// 草地染色回归：新鲜加载 / 揭示后稳定 / 主题跟随。
// 背景：慢加载曾出现揭示先于草块就绪（揭示时 __grassMats 为空、草叶保持构造默认色）。
// 教训：只查 __grassMats[0] 会漏掉第二材质族（uGrassLightColor，默认绿 #678909）。
// 故此处遍历全场景所有草叶 uniform（uLightGreen + uGrassLightColor），以真用户视角断言。
// 门控契约：真就绪（experience:ready）+ __caoDiYiRanSe 置位才揭示（跑法重、请串行跑）。
test.describe.configure({ mode: 'serial' });

const YU_QI_ZI_SE = 'b07be0';
const RI_JIAN_JIN_SE = 'd9a441';

interface RanSeKuaiZhao {
  yiJieLu: boolean;
  yiRanSe: boolean | null;
  caoYe: string[];
  jieduan: string | null;
}

async function duQuMenKong(frame: { evaluate: <T>(fn: () => T) => Promise<T> }): Promise<RanSeKuaiZhao> {
  return frame.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    const fn = w['__caoDiMenKongZhuangTai'] as undefined | (() => { jieduan: string });
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
              for (const k of ['uLightGreen', 'uGrassLightColor']) {
                try {
                  const hex = u[k]?.value?.getHexString?.();
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
  });
}

async function dengCaoDiZhen(page: { frames: () => Array<{ url: () => string }> }) {
  let frames = page.frames().filter((f) => (f.url() || '').includes('grass-bg.html'));
  const jieZhi = Date.now() + 30000;
  while (frames.length === 0 && Date.now() < jieZhi) {
    await new Promise((r) => setTimeout(r, 500));
    frames = page.frames().filter((f) => (f.url() || '').includes('grass-bg.html'));
  }
  if (frames.length === 0) throw new Error('草地帧未出现');
  return frames[0];
}

async function dengJieLu(
  frame: { evaluate: <T>(fn: () => T) => Promise<T> },
  page: { waitForTimeout: (ms: number) => Promise<void> },
  chaoShiHaoMiao = 110000,
): Promise<RanSeKuaiZhao> {
  const jieZhi = Date.now() + chaoShiHaoMiao;
  for (;;) {
    try {
      const k = await duQuMenKong(frame);
      if (k.yiJieLu) return k;
    } catch {
      // 帧尚未就绪
    }
    if (Date.now() > jieZhi) throw new Error('门控超时未揭示');
    await page.waitForTimeout(1000);
  }
}

function duanYanQuanZi(kuaiZhao: RanSeKuaiZhao, shangXiaWen: string) {
  expect(kuaiZhao.yiRanSe, `${shangXiaWen}：证据位应置位`).toBe(true);
  expect(kuaiZhao.caoYe.length, `${shangXiaWen}：应扫到草叶材质`).toBeGreaterThan(0);
  expect(kuaiZhao.caoYe.every((s) => s === YU_QI_ZI_SE), `${shangXiaWen}：草叶应全紫，实得 ${kuaiZhao.caoYe.join(',')}`).toBe(true);
}

test('新鲜加载暗色：揭示时草叶已全紫且零错误', async ({ page }) => {
  test.setTimeout(240000);
  const collector = createConsoleCollector(page);
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  const frame = await dengCaoDiZhen(page);
  const kuaiZhao = await dengJieLu(frame, page);
  duanYanQuanZi(kuaiZhao, '新鲜加载暗色揭示时');
  collector.assertNoErrors('新鲜加载应无控制台错误');
  await page.screenshot({ path: '../测试截图/草地染色-暗色揭示.png' });
});

test('揭示后稳定：10秒内草叶不漂回默认色', async ({ page }) => {
  test.setTimeout(240000);
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  const frame = await dengCaoDiZhen(page);
  await dengJieLu(frame, page);
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);
    let k: RanSeKuaiZhao;
    try {
      k = await duQuMenKong(frame);
    } catch {
      continue;
    }
    duanYanQuanZi(k, `揭示后第${i + 1}秒`);
  }
});

test('主题跟随：浅色金深色紫来回切换', async ({ page }) => {
  test.setTimeout(240000);
  await page.addInitScript(() => {
    localStorage.setItem('主题', '浅色');
  });
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  const frame = await dengCaoDiZhen(page);
  await dengJieLu(frame, page);
  const qian = await duQuMenKong(frame);
  expect(qian.caoYe.length, '浅色应扫到草叶材质').toBeGreaterThan(0);
  expect(qian.caoYe.every((s) => s === RI_JIAN_JIN_SE), `浅色草叶应全金，实得 ${qian.caoYe.join(',')}`).toBe(true);
  await page.screenshot({ path: '../测试截图/草地染色-浅色揭示.png' });

  await page.evaluate(() => {
    localStorage.setItem('主题', '暗色');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  let hou: RanSeKuaiZhao | null = null;
  const genZongJieZhi = Date.now() + 20000;
  while (Date.now() < genZongJieZhi) {
    await page.waitForTimeout(1000);
    try {
      hou = await duQuMenKong(frame);
      if (hou.caoYe.length > 0 && hou.caoYe.every((s) => s === YU_QI_ZI_SE)) break;
    } catch {
      // 帧尚未就绪
    }
  }
  expect(hou, '切回暗色应跟随变紫').not.toBeNull();
  duanYanQuanZi(hou as RanSeKuaiZhao, '切回暗色后');
});
