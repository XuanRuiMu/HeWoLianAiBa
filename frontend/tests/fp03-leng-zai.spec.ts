import { test, expect, type Browser, type Page } from '@playwright/test';
import { createConsoleCollector, type ConsoleErrorCollector } from './console-error-collector';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180000);

interface LengZaiYangBen {
  yiJieLu: boolean;
  jieDuan: string | null;
  reveal: number | null;
}

const KOU_JING_CI: { ming: string; ceShi: (wenBen: string, luJing: string) => boolean }[] = [
  { ming: 'GPU stall', ceShi: (t) => /GPU stall/i.test(t) },
  { ming: 'ReadPixels/readback', ceShi: (t) => /ReadPixels|readback|shadow copy/i.test(t) },
  { ming: 'GL Driver Message', ceShi: (t) => /GL Driver Message/.test(t) },
  { ming: 'READ-usage', ceShi: (t) => /READ-usage/.test(t) },
  { ming: 'audio', ceShi: (t) => /audio/i.test(t) },
  { ming: 'X4122/X4008', ceShi: (t) => /X4122|X4008/.test(t) },
  { ming: '429', ceShi: (t) => /429/.test(t) },
  { ming: 'font-location', ceShi: (t, u) => /\.(woff2?|ttf|otf)(\?.*)?$/.test(u) },
  { ming: 'performance-warning', ceShi: (t) => /performance warning/i.test(t) },
];

function guaZaiGeLi(page: Page): void {
  void page.route('**/socket.io/**', (route) => route.abort());
  void page.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (route) => route.abort());
  void page.route('**/api/**', (route) => {
    const luJing = decodeURIComponent(new URL(route.request().url()).pathname);
    if (luJing !== '/api' && !luJing.startsWith('/api/')) return route.fallback();
    return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) });
  });
}

async function duQuYiCi(page: Page): Promise<LengZaiYangBen | null> {
  const frames = page.frames().filter((f) => (f.url() || '').includes('grass-bg.html'));
  if (!frames.length) return null;
  try {
    const jieGuo = await frames[0].evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      let tai: { yiJieLu?: boolean; jieduan?: string } | null;
      try {
        const fn = w['__caoDiMenKongZhuangTai'] as undefined | (() => { yiJieLu: boolean; jieduan: string });
        tai = fn ? fn() : null;
      } catch {
        tai = null;
      }
      let reveal: number | null = null;
      try {
        const exp = w['__experience'] as
          | undefined
          | { revealMesh?: { material?: { uniforms?: Record<string, { value?: unknown }> } } };
        const v = exp?.revealMesh?.material?.uniforms?.['uRevealProgress']?.value;
        if (typeof v === 'number' && Number.isFinite(v)) reveal = v;
      } catch {
        reveal = null;
      }
      if (reveal === null) {
        try {
          const wuD = w['__wuD'] as undefined | { state?: () => { revealProgress?: number } };
          const v = wuD?.state?.()?.revealProgress;
          if (typeof v === 'number' && Number.isFinite(v)) reveal = v;
        } catch {
          reveal = null;
        }
      }
      return { yiJieLu: tai?.yiJieLu === true, jieDuan: tai?.jieduan ?? null, reveal };
    });
    return jieGuo;
  } catch {
    return null;
  }
}

/**
 * 「GPU stall = 0」本身可以是假绿：把遮挡剔除整条关掉，读回不再发生，stall 自然也归零。
 * 这里补上反向证据——读回链路真的在跑，而且每一轮都能排空。
 *
 * 证据链是闭的：补丁后 `fence` 只可能由 startArmedReadback（下一帧帧首发 readPixels 的那段）建立，
 * 而 `hasValidResults` 只可能在「fence 已建立且 clientWaitSync 判已信号 → getBufferSubData 取回字节」
 * 后置真。所以 `guaQi>0`（本帧只渲染并挂起）、`fence>0`（次帧真的发出了读回）、`youXiaoGuo>0`
 * （再次帧消费到结果）三者齐备，就证明「渲染 → 次帧读回 → 再次帧消费」这条推迟链完整跑通过，
 * 而不是被跳过；`paiKong>0` 另证轮次会排空、不会挂死。
 *
 * 计数必须在 iframe 内逐帧做：挂起态与 fence 各只持续约一帧，测试侧按 50ms 轮询会整帧错过
 * （实测同一命令三次里两次过一次红，红的那次六个采样点全是空闲态）。相机静止时移动阈值
 * 可能长时间不触发一轮测试，故顺手把阈值降到 0.001 让引擎自己的代码路径频繁走一遍。
 */
function guaZaiZheDangJiShu(page: Page): void {
  void page.addInitScript(() => {
    const w = window as unknown as Record<string, any>;
    if (!/grass-bg\.html/.test(location.pathname)) return;
    const J = { zhen: 0, guaQi: 0, fence: 0, youXiaoGuo: 0, paiKong: 0, tiaoMu: 0, qiangZhi: 0, wuZhuangTai: 0 };
    w.__caoDiHuiLianJiShu = J;
    const yuan = w.requestAnimationFrame.bind(w);
    (function xunHuan() {
      yuan(xunHuan);
      try {
        const c = w.__experience?.engine?.culler;
        const o = c?.getOcclusion?.();
        const a = o?.aabbTest;
        if (!a) {
          if (w.__experience) J.wuZhuangTai++;
          return;
        }
        J.zhen++;
        if (a.readbackArmed === true) J.guaQi++;
        if (a.fence !== null && a.fence !== undefined) J.fence++;
        if (a.hasValidResults === true) J.youXiaoGuo++;
        if (!a.readbackArmed && !a.hasPendingReadback && a.fence === null) J.paiKong++;
        J.tiaoMu = a.occludeeCount;
        // 引擎只在相机移动量过阈值时才发起一轮测试；/login 的相机几乎静止，实测整段冷载
        // 只挂起过 1 次且从未发出读回 ⇒ 「等它自然发生」的断言必然时灵时不灵。这里把引擎自己的
        // 累计位移抬过阈值，让下一帧由 update() 内部走正常触发路径发起一轮（拿到第一次
        // 成功消费即停手，之后完全交回自然行为，避免污染控制台口径）。
        if (J.youXiaoGuo === 0 && !a.readbackArmed && !a.hasPendingReadback && a.fence === null && a.occludeeCount > 0) {
          c.occlusionAccumulatedDistance = 1e6;
          J.qiangZhi++;
        }
      } catch {
        /* 采样器绝不改变页面行为 */
      }
    })();
  });
}

async function duanYanZheDangHuiLian(page: Page, biaoJi: string): Promise<void> {
  let ji: Record<string, number> | null;
  const jieZhi = Date.now() + 20000;
  do {
    const zhen = page.frames().find((f) => (f.url() || '').includes('grass-bg.html'));
    ji = zhen ? await zhen.evaluate(() => (window as unknown as Record<string, any>).__caoDiHuiLianJiShu ?? null) : null;
    const qiQuan = !!ji && ji.guaQi > 0 && ji.fence > 0 && ji.youXiaoGuo > 0 && ji.paiKong > 0;
    if (qiQuan) break;
    await page.waitForTimeout(400);
  } while (Date.now() <= jieZhi);
  const juZheng = `${biaoJi}遮挡回连计数=${JSON.stringify(ji)}`;
  expect(ji, `${biaoJi}草地帧没装上传计数器（iframe 路径或 addInitScript 失效）`).not.toBeNull();
  expect(ji!.zhen, `${juZheng} —— 草地帧一帧都没采到`).toBeGreaterThan(0);
  expect(ji!.tiaoMu, `${juZheng} —— 遮挡条目数为 0，剔除根本没被测过（引擎未注册 occludees）`).toBeGreaterThan(0);
  expect(ji!.guaQi, `${juZheng} —— 从未采到 readbackArmed：testAndStartReadback 没走到挂起分支`).toBeGreaterThan(0);
  expect(ji!.fence, `${juZheng} —— 从未采到非空 fence：推迟一帧的 readPixels 根本没发出，GPU stall=0 属假绿`).toBeGreaterThan(0);
  expect(ji!.youXiaoGuo, `${juZheng} —— 从未采到 hasValidResults：读回结果没被消费，推迟链断了`).toBeGreaterThan(0);
  expect(ji!.paiKong, `${juZheng} —— 从未采到排空态（三标志全清且 fence 归 null）：回读轮次挂死未释放`).toBeGreaterThan(0);
}

function duanYanDanDiao(guiJi: (number | null)[], biaoJi: string): void {
  const shuZi = guiJi.filter((v): v is number => typeof v === 'number');
  for (let i = 1; i < shuZi.length; i++) {
    const qian = shuZi[i - 1];
    const hou = shuZi[i];
    if (qian > 0.05 && hou < 0.02) {
      throw new Error(`${biaoJi}揭示进度归零：[${shuZi.map((v) => v.toFixed(3)).join(',')}]`);
    }
  }
}

/**
 * 口径清单本身只负责「分类计数」，不构成豁免。
 *
 * 本用例自己 `route.abort()` 掉了 woff2/ttf/otf，所以 font-location 那条是夹具自造的噪声；429 由
 * console-error-collector 单源白名单处理。除此之外的一切命中都必须为 0——旧实现把命中项一律
 * 过滤掉、只断言「过滤后残留=0」，于是 READ-usage / GPU stall / readback 回归到几千条也照绿，
 * 正是「问题 1」要求消除的那类告警失去了自动化锚点。
 */
const KE_RONG_KOU_JING = new Set(['font-location', '429']);

function guoLvBaoGao(yuanShi: { text: string; url: string }[], biaoJi: string): void {
  const mingZhong: Record<string, number> = {};
  for (const c of KOU_JING_CI) mingZhong[c.ming] = 0;
  let guoLvHou = 0;
  const canLiu: string[] = [];
  for (const e of yuanShi) {
    let mingZhongCi = '';
    for (const c of KOU_JING_CI) {
      if (c.ceShi(e.text, e.url)) {
        mingZhongCi = c.ming;
        break;
      }
    }
    if (mingZhongCi) mingZhong[mingZhongCi] += 1;
    else {
      guoLvHou += 1;
      canLiu.push(`${e.text.slice(0, 160)}@${e.url.slice(0, 80)}`);
    }
  }
  console.log(
    `${biaoJi}控制台：原始=${yuanShi.length} 过滤后=${guoLvHou} 命中=${JSON.stringify(mingZhong)}`,
  );
  if (canLiu.length) console.log(`${biaoJi}残留：` + canLiu.slice(0, 8).join(' / '));
  expect(guoLvHou, `${biaoJi}过滤后应零错误，残留：${canLiu.slice(0, 4).join(' / ')}`).toBe(0);
  for (const [ming, shu] of Object.entries(mingZhong)) {
    if (KE_RONG_KOU_JING.has(ming)) continue;
    expect(shu, `${biaoJi}「${ming}」口径必须为 0（实测 ${shu} 条）`).toBe(0);
  }
}

async function lengZaiYiCi(browser: Browser, peiZhi: {
  kuan: number;
  gao: number;
  yiDong: boolean;
  jieTu: string;
  biaoJi: string;
}): Promise<void> {
  const shangXiaWen = await browser.newContext({
    viewport: { width: peiZhi.kuan, height: peiZhi.gao },
    isMobile: peiZhi.yiDong,
    hasTouch: peiZhi.yiDong,
  });
  const page = await shangXiaWen.newPage();
  guaZaiZheDangJiShu(page);
  const collector = createConsoleCollector(page);
  const yuanShi: { text: string; url: string }[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const wenBen = msg.text();
    const dingWei = msg.location();
    yuanShi.push({ text: wenBen, url: dingWei?.url || '' });
  });
  page.on('pageerror', (err) => {
    yuanShi.push({ text: String(err?.message || err), url: '' });
  });
  await guaZaiGeLi(page);
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const guiJi: (number | null)[] = [];
  const wenZiGuiJi: string[] = [];
  let jiuXuShiKe = 0;
  const jieZhi = Date.now() + 100000;
  for (;;) {
    const yangBen = await duQuYiCi(page);
    if (yangBen) {
      guiJi.push(yangBen.reveal);
      wenZiGuiJi.push(
        `${yangBen.yiJieLu ? '揭' : '待'}:${yangBen.reveal === null ? '空' : yangBen.reveal.toFixed(3)}/${yangBen.jieDuan || '?'}`,
      );
      if (yangBen.yiJieLu && jiuXuShiKe === 0) jiuXuShiKe = Date.now();
    } else {
      guiJi.push(null);
      wenZiGuiJi.push('帧无');
    }
    if (jiuXuShiKe > 0 && Date.now() - jiuXuShiKe >= 5000) break;
    if (Date.now() > jieZhi) break;
    await page.waitForTimeout(250);
  }
  console.log(`${peiZhi.biaoJi}轨迹(${guiJi.length})：` + wenZiGuiJi.slice(0, 40).join(' / '));
  const yiJiHuo = await page.locator('iframe.grass-bg-iframe.is-active').count();
  expect(yiJiHuo, `${peiZhi.biaoJi}冷载应进入已揭示态，轨迹：${wenZiGuiJi.slice(0, 12).join(' / ')}`).toBeGreaterThan(0);
  duanYanDanDiao(guiJi, peiZhi.biaoJi);
  const hengFu = await page.locator('.cao-di-shibai-ti-shi').count();
  expect(hengFu, `${peiZhi.biaoJi}冷载不应出现失败横幅`).toBe(0);
  const zhuiJiaJieZhi = Date.now() + 30000;
  for (;;) {
    const zuiXin = guiJi.length ? guiJi[guiJi.length - 1] : null;
    if (typeof zuiXin === 'number' && zuiXin > 0.2) break;
    if (Date.now() > zhuiJiaJieZhi) break;
    await page.waitForTimeout(500);
    const yangBen = await duQuYiCi(page);
    guiJi.push(yangBen ? yangBen.reveal : null);
    if (yangBen) wenZiGuiJi.push(`追:${yangBen.reveal === null ? '空' : yangBen.reveal.toFixed(3)}`);
  }
  duanYanDanDiao(guiJi, `${peiZhi.biaoJi}追揭`);
  console.log(`${peiZhi.biaoJi}追揭后：` + wenZiGuiJi.slice(-8).join(' / '));
  const hengYi = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(hengYi, `${peiZhi.biaoJi}不应横溢`).toBeLessThanOrEqual(1);
  await expect(page.locator('.anniu-zhuyao').first()).toBeVisible({ timeout: 15000 });
  const beiZheDang = await page.evaluate(() => {
    const anNiu = document.querySelector('.anniu-zhuyao');
    if (!anNiu) return '无按钮';
    const ju = anNiu.getBoundingClientRect();
    const el = document.elementFromPoint(ju.x + ju.width / 2, ju.y + ju.height / 2);
    if (!el) return '空';
    if (el === anNiu || anNiu.contains(el)) return 'ok';
    return el.tagName + '.' + ((el as HTMLElement).className || '');
  });
  expect(beiZheDang, `${peiZhi.biaoJi}背景不应遮挡登录按钮，命中=${beiZheDang}`).toBe('ok');
  await page.waitForTimeout(400);
  await duanYanZheDangHuiLian(page, peiZhi.biaoJi);
  await page.screenshot({ path: peiZhi.jieTu, timeout: 60000 });
  guoLvBaoGao(yuanShi, peiZhi.biaoJi);
  // 只放过 KE_RONG_KOU_JING 那两类噪声口径。旧实现末尾还挂着 `&& !/WebGL/i.test(w.text)`，
  // 等于把整类 WebGL 告警一律豁免——任何新的 WebGL 问题都不会在这里红灯，故删。
  const shouJiJingGao: { text: string; url: string }[] = collector
    .getWarnings()
    .map((w) => ({ text: w.text, url: w.location?.url || '' }))
    .filter(
      (w) =>
        !KOU_JING_CI.some((c) => KE_RONG_KOU_JING.has(c.ming) && c.ceShi(w.text, w.url)),
    );
  // 断言消息必须自带证据：只报条数的红灯要人再跑一遍才知道是什么，等于没有红灯
  const juJiu = shouJiJingGao.map((w) => `${w.text.slice(0, 160)}@${w.url.slice(0, 80)}`).join(' / ');
  expect(shouJiJingGao.length, `${peiZhi.biaoJi}不应有业务警告，实测：${juJiu}`).toBe(0);
  await shangXiaWen.close();
}

test('FP-03 冷载桌面：进度单调+截图+零错误', async ({ browser }) => {
  await lengZaiYiCi(browser, {
    kuan: 1280,
    gao: 800,
    yiDong: false,
    jieTu: '../测试截图/FP03-冷载-桌面.png',
    biaoJi: '桌面',
  });
});

test('FP-03 冷载移动：进度单调+截图+零错误', async ({ browser }) => {
  await lengZaiYiCi(browser, {
    kuan: 390,
    gao: 844,
    yiDong: true,
    jieTu: '../测试截图/FP03-冷载-移动.png',
    biaoJi: '移动',
  });
});
