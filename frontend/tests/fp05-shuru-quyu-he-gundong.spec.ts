import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConsoleCollector } from './console-error-collector';
import { scanScrollStrip } from './滚动条像素取样';

// FP-05 聊天输入区几何与滚动取证（缺陷5 发送按钮几何 + 缺陷6 折叠态滚动条）。
// 运行：FP05Q_LABEL=before|after npx playwright test tests/fp05-shuru-quyu-he-gundong.spec.ts
// before 只记录现状（旧契约：按钮 min-height:44px 与输入框 36.39px 两套高度、折叠态私有隐藏滚动条）；
// after 断言新契约：按钮与输入框外壳同源等高、44×44 命中区靠伪元素补足、折叠态溢出出现可见可拖滚动条。
//
// 必须 headed：Playwright 在 headless 下无条件传 --hide-scrollbars（见
// playwright-core chromiumSwitches），滚动条不绘制也不占布局，正好把本 FP 要测的东西整个抹掉，
// 无头下量到的「生效条宽 0」是夹具假象而非应用行为。
test.use({ headless: false });

const 标签 = process.env.FP05Q_LABEL ?? 'after';
const 日期 = '20260921';
const 本目录 = path.dirname(fileURLToPath(import.meta.url));
const 截图目录 = path.resolve(本目录, '../../测试截图');
const 证据目录 = path.resolve(本目录, '../../../.agents/evidence/traces');
const 视口清单 = [
  { 名: '1440x900', 宽: 1440, 高: 900 },
  { 名: '375x667', 宽: 375, 高: 667 },
] as const;

const HAO_YOU_ID = '33333333-3333-4333-8333-333333333333';
const WO_DE_ID = 'fp05q-uid';
const 会话ID = 'fp05q-huihua';
// 短行多行：只纵向溢出，不横向顶到滚动条所在列，保证像素取样取到的是滚动条而非文字
const 溢出文本 = ['第一行短', '第二行短', '第三行短', '第四行短', '第五行短'].join('\n');

const 测试用户 = {
  id: WO_DE_ID,
  shou_ji_hao: '13800138010',
  yong_hu_ming: '输入区测试用户',
  ni_cheng: '输入区昵称',
  tou_xiang: null,
  mo_ren_xing_bie: 'female',
  jiao_se: null,
  neng_li: [],
};

const 用户设置 = {
  uid: WO_DE_ID,
  shou_ji_hao: '13800138010',
  tou_xiang: null,
  qian_ming: null,
  qian_ming_ke_jian_xing: 'gong_kai',
  qian_ming_bai_ming_dan: [],
  gong_kai_zhang_hao: true,
  gong_kai_shou_ji_hao: false,
  gong_kai_you_xiang: false,
  bang_ding_you_xiang: '',
};

const 聊天消息 = [
  {
    id: 'fp05q-x1',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: WO_DE_ID,
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '输入区几何验证',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
  },
];

const 好友消息 = [
  {
    id: 'fp05q-h1',
    fa_song_zhe_id: HAO_YOU_ID,
    jie_shou_zhe_id: WO_DE_ID,
    nei_rong: '好友侧输入区验证',
    lei_xing: 'wenben',
    mei_ti_id: null,
    yi_du: true,
    yi_che_hui: false,
    shi_jian_chuo: Date.now(),
  },
];

async function 准备页面(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    // 令牌真源是 sessionStorage（utils/令牌存储.ts），写 localStorage 路由守卫读不到
    window.sessionStorage.setItem('令牌', 'fp05q-token');
  });
  await page.route('**/socket.io/**', (route) => route.abort());
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
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { lie_biao: 聊天消息, zong_shu: 1, hai_you_geng_duo: false },
        }),
      });
    }
    if (路径.startsWith('/api/角色/详情/')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { jiao_se: { id: 会话ID, 名字: '测试角色', 头像: null }, dang_an_zhuang_tai: null },
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
    if (路径 === '/api/好友/列表') {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: {
            lie_biao: [{ id: HAO_YOU_ID, yong_hu_ming: 'haoYou', ni_cheng: '好友昵称', tou_xiang: null, qian_ming: null }],
          },
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

type 取样 = {
  页面: string;
  主题: string;
  视口: string;
  按钮高: number;
  外壳高: number;
  输入框高: number;
  高度差: number;
  按钮宽: number;
  命中可点: { 上20: boolean; 下20: boolean; 上21_5: boolean; 下21_5: boolean };
  伪元素高: string;
  溢出: {
    scrollHeight: number;
    clientHeight: number;
    scrollbarWidth属: string;
    生效条宽: number;
    条宽像素: number;
    thumb色: string;
    track色: string;
    底色: string;
    可拖滚动: boolean;
    拖后scrollTop: number;
    未选中文本: boolean;
    点轨道可翻页: boolean;
    仍折叠: boolean;
  } | null;
  展开: { 有zhanKai类: boolean; 高度: number } | null;
  回落: { 有zhanKai类: boolean; maxHeight: string | null; 高: number } | null;
};

const 取样集: 取样[] = [];
const 截图集: string[] = [];
const 异常集: string[] = [];

async function 量几何(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const an = document.querySelector('.fasong-anniu') as HTMLElement;
    const waike = document.querySelector('.shuru-kuang-waike') as HTMLElement;
    const kuang = document.querySelector('.shuru-kuang') as HTMLElement;
    const a = an.getBoundingClientRect();
    const cx = a.left + a.width / 2;
    const cy = a.top + a.height / 2;
    const 中 = (x: number, y: number) => {
      const hit = document.elementFromPoint(Math.round(x), Math.round(y));
      return !!hit && (hit === an || an.contains(hit) || hit.contains(an));
    };
    return {
      按钮高: a.height,
      外壳高: waike.getBoundingClientRect().height,
      输入框高: kuang.getBoundingClientRect().height,
      高度差: Math.abs(a.height - waike.getBoundingClientRect().height),
      按钮宽: a.width,
      命中可点: {
        上20: 中(cx, cy - 20),
        下20: 中(cx, cy + 20),
        上21_5: 中(cx, cy - 21.5),
        下21_5: 中(cx, cy + 21.5),
      },
      伪元素高: getComputedStyle(an, '::before').height,
      按钮声明: {
        padding: getComputedStyle(an).padding,
        minHeight: getComputedStyle(an).minHeight,
        height: getComputedStyle(an).height,
      },
    };
  });
}

async function 折叠溢出取样(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const k = document.querySelector('.shuru-kuang') as HTMLTextAreaElement;
    const cs = getComputedStyle(k);
    const r = k.getBoundingClientRect();
    const 边 = parseFloat(cs.borderLeftWidth) || 0;
    const 条宽 = r.width - k.clientWidth - 边 * 2;
    return {
      scrollHeight: k.scrollHeight,
      clientHeight: k.clientHeight,
      scrollbarWidth属: cs.scrollbarWidth,
      生效条宽: Math.max(0, Math.round(条宽 * 100) / 100),
    };
  });
}

async function 滚动交互取样(page: import('@playwright/test').Page) {
  // 坐标必须在点击前现取：element screenshot 会把元素 scrollIntoView，之前量到的 rect 已失效
  const 轨 = await page.evaluate(() => {
    const k = document.querySelector('.shuru-kuang') as HTMLTextAreaElement;
    const r = k.getBoundingClientRect();
    return {
      x: r.right,
      y: r.top,
      高: r.height,
      条宽: r.width - k.clientWidth,
      块高: Math.max(8, (k.clientHeight * k.clientHeight) / Math.max(k.scrollHeight, 1)),
    };
  });
  const x = Math.round(轨.x - 轨.条宽 / 2);
  // 轨道点击是平滑滚动动画，读值前必须等一帧帧落定，否则读到动画起点 0（假故障）
  const 归零 = async () => {
    await page.evaluate(() => { (document.querySelector('.shuru-kuang') as HTMLTextAreaElement).scrollTop = 0; });
    await page.waitForTimeout(250);
  };

  // 先点轨道（thumb 下方的空白槽）：这一击只可能由滚动条承接，文字区不可能触发
  await 归零();
  await page.mouse.click(x, Math.round(轨.y + 轨.高 - 6));
  await page.waitForTimeout(400);
  const 点后 = await page.evaluate(() => (document.querySelector('.shuru-kuang') as HTMLTextAreaElement).scrollTop);

  // 再拖 thumb：落点若跑到文字上，选区会被拉长，用选区长度反证落点确实在滚动条上
  await 归零();
  const 起点 = Math.round(轨.y + 轨.块高 * 0.4);
  await page.mouse.move(x, 起点);
  await page.mouse.down();
  await page.mouse.move(x, 起点 + 12, { steps: 5 });
  await page.mouse.move(x, 起点 + 24, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const 拖后 = await page.evaluate(() => {
    const k = document.querySelector('.shuru-kuang') as HTMLTextAreaElement;
    return { scrollTop: k.scrollTop, 选中长度: k.selectionEnd - k.selectionStart };
  });
  return {
    可拖滚动: 拖后.scrollTop > 0,
    拖后scrollTop: 拖后.scrollTop,
    未选中文本: 拖后.选中长度 === 0,
    点轨道可翻页: 点后 > 0,
  };
}

function 记异常(collector: ReturnType<typeof createConsoleCollector>, 消息: string) {
  const 剩余 = collector.getErrors();
  if (剩余.length > 0) 异常集.push(`${消息} error: ${剩余.map((e) => e.text).join(' | ')}`);
  const 警告 = collector.getWarnings();
  if (警告.length > 0) 异常集.push(`${消息} warning: ${警告.map((w) => w.text).join(' | ')}`);
}

function 写证据(): void {
  fs.mkdirSync(证据目录, { recursive: true });
  const 行 = [
    `# FP-05 输入区几何与滚动取证（${标签}）-${日期}`,
    '',
    `采集时间：${new Date().toISOString()}；模式：${标签 === 'before' ? '仅记录（旧契约基线）' : '新契约断言'}；运行环境：headed Chromium（无头会被 --hide-scrollbars 抹掉滚动条）`,
    '',
    '| 页面 | 主题 | 视口 | 发送按钮高 | 输入框外壳高 | 输入框高 | 差值 | 按钮宽 | 命中±20 | 命中±21.5 | ::before 高 |',
    '| ---- | ---- | ---- | ---------- | ------------| -------- | ---- | ------ | ------- | ------- | ----------- |',
    ...取样集.map(
      (s) =>
        `| ${s.页面} | ${s.主题} | ${s.视口} | ${s.按钮高.toFixed(2)} | ${s.外壳高.toFixed(2)} | ${s.输入框高.toFixed(2)} | ${s.高度差.toFixed(2)} | ${s.按钮宽.toFixed(2)} | ${s.命中可点.上20 && s.命中可点.下20 ? '是' : '否'} | ${s.命中可点.上21_5 && s.命中可点.下21_5 ? '是' : '否'} | ${s.伪元素高} |`,
    ),
    '',
    '| 页面 | 主题 | 视口 | scrollHeight | clientHeight | scrollbar-width | 生效条宽 | 条宽(像素) | thumb色 | track色 | 底色 | 可拖 | 未选中文本 | 点轨道翻页 | 仍折叠 |',
    '| ---- | ---- | ---- | ------------ | ------------ | --------------- | -------- | ---------- | ------- | ------- | ---- | ---- | ------------ | ------------ | ------- |',
    ...取样集
      .filter((s) => s.溢出)
      .map(
        (s) =>
          `| ${s.页面} | ${s.主题} | ${s.视口} | ${s.溢出!.scrollHeight} | ${s.溢出!.clientHeight} | ${s.溢出!.scrollbarWidth属} | ${s.溢出!.生效条宽} | ${s.溢出!.条宽像素} | ${s.溢出!.thumb色} | ${s.溢出!.track色} | ${s.溢出!.底色} | ${s.溢出!.可拖滚动 ? '是' : '否'} | ${s.溢出!.未选中文本 ? '是' : '否'} | ${s.溢出!.点轨道可翻页 ? '是' : '否'} | ${s.溢出!.仍折叠 ? '是' : '否'} |`,
      ),
    '',
    '| 页面 | 主题 | 视口 | 展开 zhan-kai | 展开高 | 回落 zhan-kai | 折叠 max-height | 折叠高 |',
    '| ---- | ---- | ---- | ------------- | ------ | ------------- | --------------- | ------ |',
    ...取样集
      .filter((s) => s.展开 && s.回落)
      .map(
        (s) =>
          `| ${s.页面} | ${s.主题} | ${s.视口} | ${s.展开!.有zhanKai类} | ${s.展开!.高度.toFixed(2)} | ${s.回落!.有zhanKai类} | ${s.回落!.maxHeight ?? ''} | ${s.回落!.高.toFixed(2)} |`,
      ),
    '',
    '截图：',
    ...截图集.map((p) => `- ${p}`),
    '',
    异常集.length ? '控制台记录：\n' + 异常集.map((e) => `- ${e}`).join('\n') : '控制台记录：无',
  ];
  fs.writeFileSync(path.join(证据目录, `FP-05-输入区几何与滚动-${标签}-${日期}.md`), 行.join('\n'), 'utf8');
}

test.afterAll(() => {
  写证据();
});

async function 打开(browser: import('@playwright/test').Browser, 主题: string, 视口: { 宽: number; 高: number }, reduced = false) {
  const context = await browser.newContext({
    viewport: { width: 视口.宽, height: 视口.高 },
    ...(reduced ? { reducedMotion: 'reduce' as const } : {}),
  });
  await context.addInitScript(([z]: string[]) => localStorage.setItem('主题', z), [主题]);
  const page = await context.newPage();
  const collector = createConsoleCollector(page);
  await 准备页面(page);
  return { context, page, collector };
}

async function 走一遍(
  browser: import('@playwright/test').Browser,
  主题: string,
  页: '聊天页' | '好友聊天页',
): Promise<void> {
  const { context, page, collector } = await 打开(browser, 主题, 视口清单[0]);
  await page.goto(页 === '聊天页' ? `/chat/${会话ID}` : `/hao-you/${HAO_YOU_ID}`);
  await expect(page.locator('.shuru-kuang')).toBeVisible({ timeout: 30000 });

  for (const 视口 of 视口清单) {
    await page.setViewportSize({ width: 视口.宽, height: 视口.高 });
    await page.waitForTimeout(500);
    const 几何 = await 量几何(page);
    await page.fill('.shuru-kuang', 溢出文本);
    await page.waitForTimeout(400);
    const 溢出 = await 折叠溢出取样(page);
    await page.evaluate(() => { (document.querySelector('.shuru-kuang') as HTMLTextAreaElement).scrollTop = 0; });
    await page.waitForTimeout(250);
    const 像素 = await scanScrollStrip(page, '.shuru-kuang', 溢出.生效条宽);
    const 交互 = await 滚动交互取样(page);
    const 仍折叠 = await page.evaluate(
      () => !(document.querySelector('.shuru-kuang') as HTMLTextAreaElement).classList.contains('zhan-kai'),
    );
    const 输入区名 = `fp05q-${标签}-${视口.名}-${主题}-${页}-shuruqu.png`;
    await page.locator('.weixin-shuru, .shuru-quyu').first().screenshot({ path: path.join(截图目录, 输入区名) });
    截图集.push(`测试截图/${输入区名}`);
    const 页面名 = `fp05q-${标签}-${视口.名}-${主题}-${页}-yemian.png`;
    await page.screenshot({ path: path.join(截图目录, 页面名), timeout: 60000 });
    截图集.push(`测试截图/${页面名}`);

    let 展开: 取样['展开'] = null;
    let 回落: 取样['回落'] = null;
    if (页 === '聊天页') {
      await page.click('.zhan-kai-anniu');
      await page.waitForTimeout(400);
      展开 = {
        有zhanKai类: await page.evaluate(
          () => !!(document.querySelector('.shuru-kuang') as HTMLTextAreaElement).classList.contains('zhan-kai'),
        ),
        高度: await page.evaluate(() => document.querySelector('.shuru-kuang')!.getBoundingClientRect().height),
      };
      await page.fill('.shuru-kuang', '短内容');
      await page.waitForTimeout(400);
      回落 = {
        有zhanKai类: await page.evaluate(
          () => !!(document.querySelector('.shuru-kuang') as HTMLTextAreaElement).classList.contains('zhan-kai'),
        ),
        maxHeight: await page.evaluate(() => (document.querySelector('.shuru-kuang') as HTMLTextAreaElement).style.maxHeight),
        高: await page.evaluate(() => document.querySelector('.shuru-kuang')!.getBoundingClientRect().height),
      };
      await page.screenshot({ path: path.join(截图目录, `fp05q-${标签}-${视口.名}-${主题}-聊天页-zhankai.png`) });
      截图集.push(`测试截图/fp05q-${标签}-${视口.名}-${主题}-聊天页-zhankai.png`);
    }

    取样集.push({
      页面: 页,
      主题,
      视口: 视口.名,
      ...几何,
      溢出: {
        scrollHeight: 溢出.scrollHeight,
        clientHeight: 溢出.clientHeight,
        scrollbarWidth属: 溢出.scrollbarWidth属,
        生效条宽: 溢出.生效条宽,
        条宽像素: 像素.条宽,
        thumb色: 像素.thumb色,
        track色: 像素.track色,
        底色: 像素.底色,
        未选中文本: 交互.未选中文本,
        ...交互,
        可拖滚动: 交互.可拖滚动 && 交互.未选中文本,
        仍折叠,
      },
      展开,
      回落,
    });

    if (标签 === 'after') {
      expect(几何.高度差, `按钮与输入框外壳高度不等：${JSON.stringify(几何)}`).toBe(0);
      expect(几何.命中可点.上21_5 && 几何.命中可点.下21_5, '发送按钮 44px 命中区上下不达标').toBe(true);
      expect(parseFloat(几何.伪元素高), '::before 热区高度不足 44px').toBeGreaterThanOrEqual(44);
      expect(几何.按钮宽).toBeGreaterThanOrEqual(44);
      expect(溢出.scrollHeight, '折叠态内容未溢出，前置失效').toBeGreaterThan(溢出.clientHeight);
      expect(溢出.scrollbarWidth属, '折叠态仍私有隐藏滚动条').not.toBe('none');
      expect(溢出.生效条宽, '滚动条不占位（不可点击）').toBeGreaterThanOrEqual(4);
      expect(像素.条宽, '渲染出的滚动条宽度不足 4px').toBeGreaterThanOrEqual(4);
      expect(像素.thumb色, 'thumb 与底色同色（不可见）').not.toBe(像素.底色);
      expect(像素.thumb色, 'thumb 与 track 同色（不可分辨）').not.toBe(像素.track色);
      expect(交互.可拖滚动, '滚动条 thumb 拖不动').toBe(true);
      expect(交互.未选中文本, '按下点落到了文字上（该处无滚动条）').toBe(true);
      expect(交互.点轨道可翻页, '点击轨道不翻页').toBe(true);
      expect(仍折叠, '折叠态溢出被擅自改为自动展开').toBe(true);
      if (页 === '聊天页') {
        // 展开/回落只属于聊天页链路（好友页无展开按钮，本就是固定单行 + 溢出滚动）
        expect(展开!.有zhanKai类).toBe(true);
        expect(展开!.高度).toBeGreaterThan(溢出.clientHeight);
        expect(回落!.有zhanKai类).toBe(false);
        expect(回落!.maxHeight).toMatch(/^\d+(\.\d+)?px$/);
      }
    }
    await page.fill('.shuru-kuang', '');
  }
  记异常(collector, `${页} ${主题}`);
  await context.close();
}

for (const 主题 of ['暗色', '浅色'] as const) {
  test(`FP-05 输入区几何与折叠态滚动条 · ${主题}`, async ({ browser }) => {
    test.setTimeout(600000);
    fs.mkdirSync(截图目录, { recursive: true });
    await 走一遍(browser, 主题, '聊天页');
    await 走一遍(browser, 主题, '好友聊天页');

    if (标签 === 'after') {
      const 聊 = 取样集.filter((s) => s.页面 === '聊天页' && s.主题 === 主题);
      const 友 = 取样集.filter((s) => s.页面 === '好友聊天页' && s.主题 === 主题);
      expect(聊.length).toBe(2);
      expect(友.length).toBe(2);
      for (let i = 0; i < 聊.length; i++) {
        expect(友[i].按钮高, `两页发送按钮高不一致（${友[i].视口}）`).toBeCloseTo(聊[i].按钮高, 6);
        expect(友[i].外壳高, `两页输入框外壳高不一致（${友[i].视口}）`).toBeCloseTo(聊[i].外壳高, 6);
        expect(友[i].溢出!.生效条宽, `两页滚动条规格不一致（${友[i].视口}）`).toBeGreaterThanOrEqual(
          Math.min(聊[i].溢出!.生效条宽, 友[i].溢出!.生效条宽),
        );
      }
      const 错误 = 异常集.filter((e) => / error: /.test(e) && !/socket\.io/.test(e));
      expect(错误, '控制台报错：' + 错误.join('\n')).toEqual([]);
    }
  });
}

test('FP-05 prefers-reduced-motion 下折叠态滚动与几何不回退', async ({ browser }) => {
  test.setTimeout(300000);
  fs.mkdirSync(截图目录, { recursive: true });
  const { context, page, collector } = await 打开(browser, '暗色', 视口清单[0], true);
  await page.goto(`/chat/${会话ID}`);
  await expect(page.locator('.shuru-kuang')).toBeVisible({ timeout: 30000 });
  const 几何 = await 量几何(page);
  await page.fill('.shuru-kuang', 溢出文本);
  await page.waitForTimeout(400);
  const 溢出 = await 折叠溢出取样(page);
  await page.evaluate(() => { (document.querySelector('.shuru-kuang') as HTMLTextAreaElement).scrollTop = 0; });
  await page.waitForTimeout(250);
  const 像素 = await scanScrollStrip(page, '.shuru-kuang', 溢出.生效条宽);
  const 交互 = await 滚动交互取样(page);
  const 名 = `fp05q-${标签}-1440x900-暗色-聊天页-jian-dongxiao.png`;
  await page.locator('.weixin-shuru, .shuru-quyu').first().screenshot({ path: path.join(截图目录, 名) });
  截图集.push(`测试截图/${名}`);
  取样集.push({
    页面: '聊天页(减动效)',
    主题: '暗色',
    视口: '1440x900',
    ...几何,
    溢出: {
      scrollHeight: 溢出.scrollHeight,
      clientHeight: 溢出.clientHeight,
      scrollbarWidth属: 溢出.scrollbarWidth属,
      生效条宽: 溢出.生效条宽,
      条宽像素: 像素.条宽,
      thumb色: 像素.thumb色,
      track色: 像素.track色,
      底色: 像素.底色,
      可拖滚动: 交互.可拖滚动,
      拖后scrollTop: 交互.拖后scrollTop,
      未选中文本: 交互.未选中文本,
      点轨道可翻页: 交互.点轨道可翻页,
      仍折叠: true,
    },
    展开: null,
    回落: null,
  });
  if (标签 === 'after') {
    expect(几何.高度差).toBe(0);
    expect(溢出.scrollHeight).toBeGreaterThan(溢出.clientHeight);
    expect(溢出.scrollbarWidth属).not.toBe('none');
    expect(溢出.生效条宽).toBeGreaterThanOrEqual(4);
    expect(交互.可拖滚动).toBe(true);
  }
  记异常(collector, '聊天页 暗色 减动效');
  await context.close();
});
