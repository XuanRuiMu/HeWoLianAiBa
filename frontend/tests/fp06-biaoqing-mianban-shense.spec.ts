import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConsoleCollector } from './console-error-collector';

// FP-06 表情面板深色模式取证（缺陷10「表情包添加的按钮在深色模式完全看不见，重新设计UI」）。
// 运行：FP06_LABEL=before|after npx playwright test tests/fp06-biaoqing-mianban-shense.spec.ts
// before 只记录现状（FP-01 给 button reset 补了 color: inherit 之后，零规则按钮到底还看不看得见）；
// after 断言新契约：面板内每个可点击元素（含其内部文字/图标）前景 vs 有效背景 ≥4.5:1（深色档为硬门；
// 浅色档对本 FP 新着色的元素同样硬门，禁用件按 WCAG 1.4.3 inactive 例外降到 ≥3:1），
// 并断言添加按钮/管理按钮/操作角标具备可辨识的控件外观（边界 + 悬停反馈 + 键盘焦点环真实生效）。
//
// 对比度一律用 computed color + 沿祖先链按 alpha 合成出的有效背景数值算，不靠目测截图。
// 本 spec 不断言滚动条像素条宽/可拖（F21 不适用），只核对滚动条令牌的解析值，故无头即可运行。

// 两个主题必须串行进同一个 worker：证据/截图集是模块级数组，并行时两个 worker 各写一遍同名文件会互相覆盖。
test.describe.configure({ mode: 'serial' });

const 标签 = process.env.FP06_LABEL ?? 'after';
const 日期 = '20260921';
const 本目录 = path.dirname(fileURLToPath(import.meta.url));
const 截图目录 = path.resolve(本目录, '../../测试截图');
const 证据目录 = path.resolve(本目录, '../../../.agents/evidence/traces');
const 视口清单 = [
  { 名: '1440x900', 宽: 1440, 高: 900 },
  { 名: '375x667', 宽: 375, 高: 667 },
] as const;

const 会话ID = 'fp06-biaoqing-huihua';
const 用户ID = 'fp06-uid';

const 测试用户 = {
  id: 用户ID,
  shou_ji_hao: '13800138011',
  yong_hu_ming: '表情面板测试用户',
  ni_cheng: '表情面板昵称',
  tou_xiang: null,
  mo_ren_xing_bie: 'female',
  jiao_se: null,
  neng_li: [],
};

const 用户设置 = {
  uid: 用户ID,
  shou_ji_hao: '13800138011',
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
    id: 'fp06-x1',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 用户ID,
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '表情面板取证',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
  },
];

// 三张「我的表情」：length > 1 才渲染 .fenqu-guanli，进管理态才会出现 ‹ › × 角标
const 图 = (颜色: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" rx="8" fill="${颜色}"/></svg>`,
  );

const 我的表情 = [
  { id: 'bq1', mei_ti_id: 'm1', sha256: 'a'.repeat(64), mime: 'image/svg+xml', duan_ming: '取证表情甲', pai_xu: 0, chuang_jian_shi_jian: '2026-09-21', mei_ti_url: 图('#e94560') },
  { id: 'bq2', mei_ti_id: 'm2', sha256: 'b'.repeat(64), mime: 'image/svg+xml', duan_ming: '取证表情乙', pai_xu: 1, chuang_jian_shi_jian: '2026-09-21', mei_ti_url: 图('#4a90d9') },
  { id: 'bq3', mei_ti_id: 'm3', sha256: 'c'.repeat(64), mime: 'image/svg+xml', duan_ming: '取证表情丙', pai_xu: 2, chuang_jian_shi_jian: '2026-09-21', mei_ti_url: 图('#2ec4b6') },
];

async function 准备页面(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    // 令牌真源是 sessionStorage（utils/令牌存储.ts），写 localStorage 路由守卫读不到
    window.sessionStorage.setItem('令牌', 'fp06-token');
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
          shu_ju: { jiao_se: { id: 会话ID, 名字: '取证角色', 头像: null }, dang_an_zhuang_tai: null },
        }),
      });
    }
    if (路径.endsWith('/api/表情/我的')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: 我的表情, zong_shu: 我的表情.length } }),
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
    return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) });
  });
}

interface 样式行 {
  标识: string;
  控件: boolean;
  禁用: boolean;
  文本: string;
  前景: string;
  背景: string;
  对比度: number;
  边框: string;
  边框色: string;
  底色: string;
  字号: string;
  宽: number;
  高: number;
  数量: number;
  命中hover: boolean;
}

interface 悬停行 {
  标识: string;
  常态底: string;
  悬停底: string;
  常态边框: string;
  悬停边框: string;
  悬停前景对比度: number;
  反馈: string;
  命中hover: boolean;
}

interface 焦点行 {
  标识: string;
  outline式: string;
  outline宽: string;
  outline色: string;
  经Tab到达: boolean;
}

interface 组合取样 {
  主题: string;
  视口: string;
  状态: string;
  面板底色: string;
  滚动条: { 局部量: string; 全局滑块: string; 局部Hover: string; 全局Hover: string };
  行: 样式行[];
  悬停: 悬停行[];
  焦点: 焦点行[];
}

const 组合集: 组合取样[] = [];
const 截图集: string[] = [];
const 异常集: string[] = [];

/**
 * 页内取样：选择器为 null 时扫整个 .emoji-mianban（可点击控件 + 自带文本的后代），
 * 否则只读该选择器命中的单个元素（悬停前后各读一次）。
 * 有效背景 = 自身到最近不透明祖先按 alpha 逐层合成，杜绝"背景=页面白"这类误判。
 */
async function 读样式们(page: import('@playwright/test').Page, 选择器: string | null): Promise<样式行[]> {
  return page.evaluate((单点) => {
    const 解析色 = (值: string) => {
      const m = /rgba?\(([^)]+)\)/.exec(值 || '');
      if (!m) return null;
      const 段 = m[1].split(/[\s,\/]+/).filter((s) => s !== '').map(Number);
      const r = 段[0];
      const g = 段[1];
      const b = 段[2];
      if (r === undefined || g === undefined || b === undefined) return null;
      const a = 段[3];
      return { r, g, b, a: a === undefined || Number.isNaN(a) ? 1 : a };
    };
    const 通道 = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const 亮度 = (色: { r: number; g: number; b: number }) =>
      0.2126 * 通道(色.r / 255) + 0.7152 * 通道(色.g / 255) + 0.0722 * 通道(色.b / 255);
    const 对比 = (fg: { r: number; g: number; b: number }, bg: { r: number; g: number; b: number }) => {
      const x = 亮度(fg);
      const y = 亮度(bg);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const 压色 = (
      上: { r: number; g: number; b: number; a: number },
      下: { r: number; g: number; b: number },
    ) => ({
      r: 上.r * 上.a + 下.r * (1 - 上.a),
      g: 上.g * 上.a + 下.g * (1 - 上.a),
      b: 上.b * 上.a + 下.b * (1 - 上.a),
    });
    const 串 = (色: { r: number; g: number; b: number }) =>
      `rgb(${Math.round(色.r)}, ${Math.round(色.g)}, ${Math.round(色.b)})`;
    const 有效背景 = (元: HTMLElement) => {
      const 层: { r: number; g: number; b: number; a: number }[] = [];
      let 点: HTMLElement | null = 元;
      while (点) {
        const 色 = 解析色(getComputedStyle(点).backgroundColor);
        if (色 && 色.a > 0) {
          层.push(色);
          if (色.a >= 1) break;
        }
        点 = 点.parentElement;
      }
      if (!层.length) return { r: 255, g: 255, b: 255 };
      const 底 = 层[层.length - 1].a >= 1 ? 层[层.length - 1] : { r: 255, g: 255, b: 255, a: 1 };
      let 结: { r: number; g: number; b: number } = 底;
      for (let i = 层.length - 2; i >= 0; i--) 结 = 压色(层[i], 结);
      return 结;
    };
    const 标识 = (元: Element) => {
      const 类 = Array.from(元.classList).filter((c) => !/^_?data-v/.test(c));
      return 元.tagName.toLowerCase() + (类.length ? `.${类.join('.')}` : '');
    };
    const 自文本 = (元: Element) =>
      Array.from(元.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => (n.textContent || '').trim())
        .join('');
    const 读 = (元: HTMLElement): 样式行 => {
      const cs = getComputedStyle(元);
      const 前 = 解析色(cs.color);
      const 后 = 有效背景(元);
      return {
        标识: 标识(元),
        控件: 元.tagName === 'BUTTON' || 元.getAttribute('role') === 'button',
        禁用: (元 as HTMLButtonElement).disabled === true,
        文本: 自文本(元).slice(0, 12),
        前景: 前 ? 串(前) : cs.color,
        背景: 串(后),
        对比度: 前 ? Math.round(对比(前, 后) * 100) / 100 : -1,
        边框: [cs.borderTopWidth, cs.borderTopStyle, cs.borderTopColor].join(' '),
        边框色: cs.borderTopColor,
        底色: cs.backgroundColor,
        字号: cs.fontSize,
        宽: Math.round(元.getBoundingClientRect().width * 100) / 100,
        高: Math.round(元.getBoundingClientRect().height * 100) / 100,
        数量: 1,
        命中hover: 元.matches(':hover'),
      };
    };
    const 活 = (元: HTMLElement) => {
      const r = 元.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      const cs = getComputedStyle(元);
      return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
    };
    if (单点) {
      const 元 = document.querySelector(单点) as HTMLElement | null;
      return 元 ? [读(元)] : [];
    }
    const 面 = document.querySelector('.emoji-mianban');
    if (!面) return [];
    const 命中 = Array.from(面.querySelectorAll('button, button *')).filter((元) => {
      const 元2 = 元 as HTMLElement;
      if (!活(元2)) return false;
      if (元2.tagName === 'BUTTON' || 元2.getAttribute('role') === 'button') return true;
      return 自文本(元2) !== '';
    });
    const 组 = new Map<string, 样式行>();
    for (const 元 of 命中) {
      const 项 = 读(元 as HTMLElement);
      const 键 = `${项.标识}|${项.前景}|${项.背景}|${项.边框}|${项.字号}|${项.控件}|${项.禁用}`;
      const 现 = 组.get(键);
      if (现) {
        现.数量 += 1;
        现.对比度 = Math.min(现.对比度, 项.对比度);
      } else {
        组.set(键, 项);
      }
    }
    return Array.from(组.values());
  }, 选择器);
}

async function 采集面板(
  page: import('@playwright/test').Page,
  主题: string,
  视口名: string,
  状态: string,
): Promise<组合取样> {
  const 行 = await 读样式们(page, null);
  const 面板信息 = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.emoji-mianban') as HTMLElement);
    return {
      面板底色: cs.backgroundColor,
      滚动条: {
        局部量: cs.getPropertyValue('--emoji-mianban-gundong-tiao').trim(),
        全局滑块: cs.getPropertyValue('--gundong-tiao-huakuai').trim(),
        局部Hover: cs.getPropertyValue('--emoji-mianban-gundong-tiao-hover').trim(),
        全局Hover: cs.getPropertyValue('--gundong-tiao-huakuai-hover').trim(),
      },
    };
  });
  return { 主题, 视口: 视口名, 状态, 行, ...面板信息, 悬停: [], 焦点: [] };
}

const 悬停目标: [string, string][] = [
  ['.biaoqingbao-xiangmu.tian-jia', '添加按钮'],
  ['.fenqu-guanli', '管理按钮'],
  ['.biaoqingbao-xiangmu.wo-de', '我的表情格'],
  ['.ge-caoZuo.shan-chu', '删除角标'],
  ['.emoji-xiangmu', '常用emoji'],
];

async function 悬停检查(page: import('@playwright/test').Page): Promise<悬停行[]> {
  const 出: 悬停行[] = [];
  for (const [选择器, 名] of 悬停目标) {
    const 元 = page.locator(选择器).first();
    if ((await 元.count()) === 0 || !(await 元.isVisible())) continue;
    const [常态] = await 读样式们(page, 选择器);
    // hover 会把元素滚进视口：滚动后光标可能已不在元素上（:hover 停在旧命中链上），
    // 所以滚一次、等一帧、再 hover 一次，然后轮询到样式真的换档为止
    await 元.hover();
    await page.waitForTimeout(150);
    await 元.hover();
    let 悬停 = 常态;
    for (let i = 0; i < 10; i++) {
      const [当前] = await 读样式们(page, 选择器);
      悬停 = 当前;
      if (当前.底色 !== 常态.底色 || 当前.边框色 !== 常态.边框色) break;
      await page.waitForTimeout(120);
    }
    await page.mouse.move(4, 4);
    await page.waitForTimeout(120);
    if (!常态 || !悬停) continue;
    const 底变 = 常态.底色 !== 悬停.底色;
    const 框变 = 常态.边框色 !== 悬停.边框色;
    出.push({
      标识: 名,
      常态底: 常态.底色,
      悬停底: 悬停.底色,
      常态边框: 常态.边框色,
      悬停边框: 悬停.边框色,
      悬停前景对比度: 悬停.对比度,
      反馈: 底变 && 框变 ? '底色+边框' : 底变 ? '底色' : 框变 ? '边框' : '无',
      命中hover: 悬停.命中hover,
    });
  }
  return 出;
}

const 焦点目标: [string, string][] = [
  ['.biaoqingbao-xiangmu.tian-jia', '添加按钮'],
  ['.fenqu-guanli', '管理按钮'],
  ['.ge-caoZuo.shan-chu', '删除角标'],
];

/** 真键盘 Tab 走焦：程序 focus() 不保证命中 :focus-visible，必须用 Tab 才算测到焦点环 */
async function 焦点检查(page: import('@playwright/test').Page): Promise<焦点行[]> {
  const 在场 = new Map<string, string>();
  for (const [选择器, 名] of 焦点目标) {
    if ((await page.locator(选择器).count()) > 0) 在场.set(选择器, 名);
  }
  const 期望 = Array.from(在场.keys());
  const 得到 = new Map<string, 焦点行>();
  await page.locator('.biaoqing-anniu').focus();
  for (let i = 0; i < 80 && 得到.size < 期望.length; i++) {
    await page.keyboard.press('Tab');
    const 命中 = await page.evaluate((名单: string[]) => {
      const 元 = document.activeElement as HTMLElement | null;
      if (!元) return null;
      const 项 = 名单.find((s) => 元.matches(s));
      if (!项) return null;
      const cs = getComputedStyle(元);
      return {
        标识: 项,
        outline式: 元.matches(':focus-visible') ? cs.outlineStyle : `未命中:focus-visible(${cs.outlineStyle})`,
        outline宽: cs.outlineWidth,
        outline色: cs.outlineColor,
        经Tab到达: true,
      } as 焦点行;
    }, 期望);
    if (命中 && !得到.has(命中.标识)) 得到.set(命中.标识, 命中);
  }
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  return 焦点目标.map(([选择器, 名]) => {
    if (!在场.has(选择器)) return { 标识: 名, outline式: '不在场', outline宽: '0px', outline色: '', 经Tab到达: false };
    return (
      得到.get(选择器) ?? {
        标识: 名,
        outline式: 'Tab 未到达',
        outline宽: '0px',
        outline色: '',
        经Tab到达: false,
      }
    );
  });
}

function 写证据(): void {
  fs.mkdirSync(证据目录, { recursive: true });
  const 行 = [`# FP-06 表情面板深色模式对比度取证（${标签}）-${日期}`, ''];
  行.push(
    `采集时间：${new Date().toISOString()}；模式：${标签 === 'before' ? '仅记录（FP-01 color: inherit 之后的现状基线）' : '新契约断言'}；无头 Chromium（不断言滚动条像素，F21 不适用）`,
    '',
    '口径：深色档面板内全部可点击元素/自带文本后代 ≥4.5:1；浅色档对本 FP 新着色元素同样 ≥4.5:1；禁用件按 WCAG 1.4.3 inactive 例外降到 ≥3:1。有效背景 = 自身到最近不透明祖先按 alpha 合成。',
    '',
  );
  for (const 组 of 组合集) {
    行.push(
      `## ${组.主题} / ${组.视口} / ${组.状态}`,
      '',
      `面板 computed 底色 ${组.面板底色}；滚动条局部量 ${组.滚动条.局部量} / hover ${组.滚动条.局部Hover}（全局 --gundong-tiao-huakuai ${组.滚动条.全局滑块} / ${组.滚动条.全局Hover}）`,
      '',
      '| 元素 | 数量 | 禁用 | 文本样例 | 前景 | 有效背景 | 对比度 | 边框(宽 式 色) | 字号 | 宽×高 |',
      '| ---- | ---- | ---- | -------- | ---- | -------- | ------ | ------------ | ---- | ----- |',
      ...组.行.map(
        (r) =>
          `| ${r.标识} | ${r.数量} | ${r.禁用 ? '是' : '否'} | ${r.文本 || '（图形/无自有文本）'} | ${r.前景} | ${r.背景} | ${r.对比度.toFixed(2)} | ${r.边框} | ${r.字号} | ${r.宽}×${r.高} |`,
      ),
      '',
      '| 悬停对象 | 常态底色 | 悬停底色 | 常态边框色 | 悬停边框色 | 悬停态前景对比度 | 指针确实在元素上 | 反馈 |',
      '| -------- | -------- | -------- | ---------- | ------------ | ------------------ | ---------------- | ---- |',
      ...组.悬停.map(
        (h) =>
          `| ${h.标识} | ${h.常态底} | ${h.悬停底} | ${h.常态边框} | ${h.悬停边框} | ${h.悬停前景对比度.toFixed(2)} | ${h.命中hover ? '是' : '否'} | ${h.反馈} |`,
      ),
      '',
      '| 键盘焦点 | 经 Tab 到达 | outline-style | outline-width | outline-color |',
      '| -------- | ----------- | ----------- | ------------- | ------------- |',
      ...组.焦点.map((f) => `| ${f.标识} | ${f.经Tab到达 ? '是' : '否'} | ${f.outline式} | ${f.outline宽} | ${f.outline色} |`),
      '',
    );
  }
  行.push('截图：', ...截图集.map((p) => `- ${p}`), '');
  行.push('控制台记录：', 异常集.length ? 异常集.map((e) => `- ${e}`).join('\n') : '无');
  fs.writeFileSync(path.join(证据目录, `FP-06-表情面板深色对比度-${标签}-${日期}.md`), 行.join('\n'), 'utf8');
  fs.writeFileSync(
    path.join(证据目录, `FP-06-表情面板深色对比度-${标签}-${日期}.json`),
    JSON.stringify({ 标签, 组合集, 截图集, 异常集 }, null, 2),
    'utf8',
  );
}

test.afterAll(() => {
  写证据();
});

async function 打开(browser: import('@playwright/test').Browser, 主题: string, 视口: { 宽: number; 高: number }) {
  const context = await browser.newContext({ viewport: { width: 视口.宽, height: 视口.高 } });
  await context.addInitScript(([z]: string[]) => localStorage.setItem('主题', z), [主题]);
  const page = await context.newPage();
  const collector = createConsoleCollector(page);
  await 准备页面(page);
  return { context, page, collector };
}

function 记异常(collector: ReturnType<typeof createConsoleCollector>, 消息: string) {
  const 剩余 = collector.getErrors();
  if (剩余.length > 0) 异常集.push(`${消息} error: ${剩余.map((e) => e.text).join(' | ')}`);
  const 警告 = collector.getWarnings();
  if (警告.length > 0) 异常集.push(`${消息} warning: ${警告.map((w) => w.text).join(' | ')}`);
}

/** 本 FP 新写/改写着色规则的元素：浅色档也必须过 4.5:1（不只是"看得见"） */
const 本FP负责 = /tian-jia|fenqu-guanli|ge-caoZuo|caoZuo-zu|biaoqingbao-ge|emoji-xiangmu|biaoqingbao-xiangmu|biaoqingbao-tupian/;

function 断言(组: 组合取样) {
  const 深色 = 组.主题 === '暗色';
  const 硬门行 = 组.行.filter((r) => 深色 || 本FP负责.test(r.标识));
  const 不足 = 硬门行.filter((r) => (r.禁用 ? r.对比度 < 3 : r.对比度 < 4.5));
  expect(
    不足.map((r) => `${r.标识} 前景${r.前景} 背景${r.背景} 对比度${r.对比度.toFixed(2)} 禁用=${r.禁用}`),
    `${组.主题}/${组.视口}/${组.状态} 存在对比度不达标的元素`,
  ).toEqual([]);
  const 控件行 = 组.行.filter((r) => r.控件);
  expect(控件行.length, '面板内没采到任何可点击控件').toBeGreaterThan(0);

  if (深色 && 组.状态 !== 'emoji页签') {
    const 添加 = 控件行.find((r) => r.标识.includes('tian-jia'));
    expect(添加, '深色档采不到添加按钮').toBeTruthy();
    expect(
      /solid|dashed|dotted/.test(添加!.边框) || 添加!.背景 !== 组.面板底色,
      `添加按钮无可辨认可点击外观（边框=${添加!.边框} 底色=${添加!.底色}）`,
    ).toBe(true);
    const 管理 = 控件行.find((r) => r.标识.includes('fenqu-guanli'));
    if (管理) {
      expect(/solid|dashed|dotted/.test(管理.边框), `管理按钮无边框外观：${管理.边框}`).toBe(true);
      expect(管理.高, `管理按钮高度 ${管理.高} < 24px`).toBeGreaterThanOrEqual(24);
    }
    expect(组.滚动条.局部量, '表情面板滚动条滑块未落到 --gundong-tiao-huakuai 真源').toBe(组.滚动条.全局滑块);
    expect(组.滚动条.局部Hover, '表情面板滚动条 hover 未落到真源').toBe(组.滚动条.全局Hover);
  }
  if (组.状态 === '管理态') {
    const 角标 = 组.行.filter((r) => /ge-caoZuo/.test(r.标识) && r.控件);
    expect(角标.length, '管理态未采到 ‹ › × 角标').toBeGreaterThan(0);
    for (const r of 角标) {
      expect(/solid|dashed|dotted/.test(r.边框), `角标 ${r.标识} 无边界外观`).toBe(true);
      expect(r.宽, `角标 ${r.标识} 命中区宽 ${r.宽} < 24px`).toBeGreaterThanOrEqual(24);
      expect(r.高, `角标 ${r.标识} 命中区高 ${r.高} < 24px`).toBeGreaterThanOrEqual(24);
    }
    expect(组.行.some((r) => r.标识.includes('tian-jia')), '管理态添加按钮丢失').toBe(true);
  }
  if (深色 && 标签 === 'after') {
    for (const h of 组.悬停.filter((x) => ['添加按钮', '管理按钮', '我的表情格'].includes(x.标识))) {
      expect(h.命中hover, `${h.标识} 悬停取样时指针不在元素上（命中检测失效，反馈数据不可信）`).toBe(true);
      expect(h.反馈, `${h.标识} 悬停无任何可辨反馈（底色/边框均未变）`).not.toBe('无');
      expect(h.悬停前景对比度, `${h.标识} 悬停态前景对比度 ${h.悬停前景对比度} < 4.5`).toBeGreaterThanOrEqual(4.5);
    }
    for (const f of 组.焦点) {
      expect(f.outline式, `${f.标识} 焦点目标不在场：${f.outline式}`).not.toBe('不在场');
      expect(f.经Tab到达, `${f.标识} 键盘 Tab 走不到焦点`).toBe(true);
      expect(f.outline式, `${f.标识} 焦点环未绘制：${f.outline式}`).toMatch(/solid/);
      expect(parseFloat(f.outline宽), `${f.标识} 焦点环宽度为 0`).toBeGreaterThan(0);
    }
  }
}

for (const 主题 of ['暗色', '浅色'] as const) {
  test(`FP-06 表情面板可点击元素对比度 · ${主题}`, async ({ browser }) => {
    test.setTimeout(600000);
    fs.mkdirSync(截图目录, { recursive: true });
    const { context, page, collector } = await 打开(browser, 主题, 视口清单[0]);
    await page.goto(`/chat/${会话ID}`);
    // 首屏要等路由块 + 认证/会话/角色三次接口链，dev server 被并行任务压满时 30s 不够（实测踩到一次空 main）
    await expect(page.locator('.shuru-kuang')).toBeVisible({ timeout: 90000 });
    await page.click('.biaoqing-anniu');
    await expect(page.locator('.emoji-mianban')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(700);

    for (const 视口 of 视口清单) {
      await page.setViewportSize({ width: 视口.宽, height: 视口.高 });
      await page.waitForTimeout(600);
      const 前缀 = `fp06-${标签}-${视口.名}-${主题}`;

      const 常用态 = await 采集面板(page, 主题, 视口.名, 'emoji页签');
      常用态.悬停 = await 悬停检查(page);
      组合集.push(常用态);
      await page.locator('.emoji-mianban').screenshot({ path: path.join(截图目录, `${前缀}-emoji.png`) });
      截图集.push(`测试截图/${前缀}-emoji.png`);

      await page.locator('.mianban-tab').nth(1).click();
      await page.waitForTimeout(500);
      const 表情包态 = await 采集面板(page, 主题, 视口.名, '表情包页签');
      表情包态.悬停 = await 悬停检查(page);
      组合集.push(表情包态);
      await page.locator('.emoji-mianban').screenshot({ path: path.join(截图目录, `${前缀}-biaoqingbao.png`) });
      截图集.push(`测试截图/${前缀}-biaoqingbao.png`);

      await page.locator('.fenqu-guanli').click();
      await page.waitForTimeout(500);
      const 管理态 = await 采集面板(page, 主题, 视口.名, '管理态');
      管理态.悬停 = await 悬停检查(page);
      管理态.焦点 = 视口.名 === '1440x900' ? await 焦点检查(page) : [];
      组合集.push(管理态);
      await page.locator('.emoji-mianban').screenshot({ path: path.join(截图目录, `${前缀}-guanli.png`) });
      截图集.push(`测试截图/${前缀}-guanli.png`);
      await page.screenshot({ path: path.join(截图目录, `${前缀}-yemian.png`), timeout: 60000 });
      截图集.push(`测试截图/${前缀}-yemian.png`);

      if (标签 === 'after') {
        for (const 组 of [常用态, 表情包态, 管理态]) 断言(组);
      }
      await page.locator('.fenqu-guanli').click();
      await page.waitForTimeout(300);
    }
    记异常(collector, `表情面板 ${主题}`);
    if (标签 === 'after') {
      const 错误 = 异常集.filter((e) => / error: /.test(e));
      expect(错误, '控制台报错：' + 错误.join('\n')).toEqual([]);
    }
    await context.close();
  });
}
