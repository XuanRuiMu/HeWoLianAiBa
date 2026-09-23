import type { Page } from '@playwright/test'

/**
 * FP-25 家族（诊断 spec `fp25-shouping-kongbai.spec.ts` 与常驻门禁 spec `fp25-guodeng.spec.ts`）
 * 共用的页内记录器、桩注入与档位定义——两份 spec 共享同一份探针与桩，杜绝第二套判据实现。
 *
 * 「空壳帧」签名 = `main.app-zhuti` 已有子元素、但页面容器 `.yemian-rongqi` 尚未出现：
 * 这一帧就是用户看到的空白首屏（route.name 由 undefined 翻成实名时，out-in 过渡把 enter
 * 完全排在 leave 之后 ⇒ 首帧退化为错误边界的空盒）。
 */

export const 桩会话ID = 'fp25-huihua'
export const 桩用户ID = 'fp25-uid'

export type 档位 = {
  名: string
  选项: { viewport: { width: number; height: number }; isMobile?: boolean; hasTouch?: boolean; deviceScaleFactor?: number }
}

export const 档: Record<string, 档位> = {
  移动: {
    名: '移动390x844-isMobile',
    选项: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  },
  移动裸视口: {
    名: '移动390x844-仅viewport',
    选项: { viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  },
  桌面: { 名: '桌面1440x900', 选项: { viewport: { width: 1440, height: 900 } } },
}

export function 页内记录器() {
  const 起 = performance.now()
  const 读 = (el: Element | null) => (el ? el.innerHTML.length : -1)
  const 子 = (el: Element | null) => (el ? el.childElementCount : -1)
  const 记: {
    快照: Record<string, unknown>[]
    首次输入区: number | null
    首次聊天页: number | null
    空壳样本: { t: number; html: string } | null
    页面错误: unknown[]
    未捕获拒绝: unknown[]
  } = { 快照: [], 首次输入区: null, 首次聊天页: null, 空壳样本: null, 页面错误: [], 未捕获拒绝: [] }
  ;(window as unknown as { __FP25: unknown }).__FP25 = 记

  const 状态 = () => {
    const zhuti = document.querySelector('main.app-zhuti')
    const buju = document.querySelector('.yemian-buju')
    const rongqi = document.querySelector('.yemian-rongqi')
    const liaotian = document.querySelector('.liaotian-yemian')
    const shuru = document.querySelector('footer.shuru-quyu')
    const guodu = Array.from(document.querySelectorAll('[class*="guodu"]'))
      .map((e) => String((e as HTMLElement).className))
      .slice(0, 8)
      .join(' | ')
    return {
      u: location.pathname,
      rs: document.readyState,
      tk: sessionStorage.getItem('令牌') ? 'Y' : 'N',
      total: document.getElementsByTagName('*').length,
      app子: 子(document.querySelector('#app')),
      app长: 读(document.querySelector('#app')),
      zt子: 子(zhuti),
      zt长: 读(zhuti),
      zt注: zhuti ? zhuti.childNodes.length : -1,
      zt空注: zhuti ? Array.from(zhuti.childNodes).filter((n) => n.nodeType === 8).length : -1,
      rc: !!rongqi,
      bj子: 子(buju),
      bj长: 读(buju),
      lt: !!liaotian,
      su: !!shuru,
      eb: !!document.querySelector('.cuowu-tishi'),
      gd: guodu,
    }
  }

  let 上一 = ''
  const 采样 = () => {
    const s = 状态()
    const t = +(performance.now() - 起).toFixed(1)
    const q = JSON.stringify(s)
    if (q !== 上一) {
      上一 = q
      if (记.快照.length < 500) 记.快照.push({ t, ...s })
      // 「空壳帧」必须在页内当场留 HTML 样本——Node 侧再取会被渲染线程拖慢，拿到的已是恢复后的状态。
      if (!记.空壳样本 && s.zt子 >= 1 && !s.rc) {
        记.空壳样本 = { t, html: (document.querySelector('main.app-zhuti')?.outerHTML ?? '').slice(0, 700) }
      }
    }
    if (s.su && 记.首次输入区 === null) 记.首次输入区 = t
    if (s.lt && 记.首次聊天页 === null) 记.首次聊天页 = t
  }

  try {
    new MutationObserver(采样).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    })
  } catch {
    /* 早期尚未有 documentElement 时忽略，兜底轮询仍会采样 */
  }
  document.addEventListener('DOMContentLoaded', 采样)
  window.addEventListener('load', 采样)
  for (let i = 0; i < 400; i += 1) setTimeout(采样, i * 50)
  window.addEventListener('error', (e) =>
    记.页面错误.push({
      t: +(performance.now() - 起).toFixed(1),
      文本: String(e.message),
      位置: `${e.filename}:${e.lineno}:${e.colno}`,
    }),
  )
  window.addEventListener('unhandledrejection', (e) =>
    记.未捕获拒绝.push({
      t: +(performance.now() - 起).toFixed(1),
      文本: String((e.reason as { message?: string })?.message ?? e.reason ?? ''),
    }),
  )
  采样()
}

const 桩用户 = {
  id: 桩用户ID,
  shou_ji_hao: '13800138010',
  yong_hu_ming: 'fp25',
  ni_cheng: 'FP25取证用户',
  tou_xiang: null,
  mo_ren_xing_bie: 'female',
  jiao_se: null,
  neng_li: [],
}

const 桩用户设置 = {
  uid: 桩用户ID,
  shou_ji_hao: '13800138010',
  tou_xiang: null,
  qian_ming: null,
  qian_ming_ke_jian_xing: 'gong_kai',
  qian_ming_bai_ming_dan: [],
  liao_tian_bei_jing: 'moRen',
  qi_pao_zi_ji: 'yunBai',
  qi_pao_ai: 'yunBai',
  gong_kai_zhang_hao: true,
  gong_kai_shou_ji_hao: false,
  gong_kai_you_xiang: false,
  bang_ding_you_xiang: '',
}

const 桩历史消息 = [
  {
    id: 'fp25-m0',
    hui_hua_id: 桩会话ID,
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: 'FP25 基线消息',
    lei_xing: 'wenben',
    mei_ti_id: null,
    shi_jian_chuo: 1700000000000,
    yi_du: true,
  },
]

export function 挂桩(page: Page, 逃逸记录: string[], 注入令牌 = true) {
  return (注入令牌
    ? page.addInitScript(() => {
        window.sessionStorage.setItem('令牌', 'fp25-token')
      })
    : Promise.resolve()
  ).then(async () => {
    await page.route('**/socket.io/**', (route) => route.abort())
    await page.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (route) => route.abort())
    await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }))
    await page.route('**/version.txt', (route) => route.fulfill({ status: 204, body: '' }))
    await page.route('**/api/**', (route) => {
      const 路径 = decodeURIComponent(new URL(route.request().url()).pathname)
      if (!路径.startsWith('/api')) return route.fallback()
      if (路径.endsWith('/api/认证/信息')) {
        return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 桩用户 }) })
      }
      if (路径 === '/api/用户设置' || 路径.startsWith('/api/用户设置/')) {
        return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 桩用户设置 }) })
      }
      if (路径.includes('/api/聊天/会话/') && 路径.endsWith('/消息')) {
        const 降序 = [...桩历史消息].reverse()
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            cheng_gong: true,
            shu_ju: { lie_biao: 降序, zong_shu: 降序.length, hai_you_geng_duo: false },
          }),
        })
      }
      if (路径.includes('/api/聊天/会话列表') || 路径 === '/api/聊天/会话') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            cheng_gong: true,
            shu_ju: { lie_biao: [{ id: 桩会话ID, ming_cheng: 'FP25会话', jiao_se_id: 桩会话ID }] },
          }),
        })
      }
      if (路径.startsWith('/api/角色/详情/')) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            cheng_gong: true,
            shu_ju: {
              jiao_se: { id: 桩会话ID, 名字: 'FP25角色', ming_zi: 'FP25角色', tou_xiang: null, 头像: null },
              dang_an_zhuang_tai: null,
            },
          }),
        })
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
        })
      }
      if (路径.startsWith('/api/表情/我的')) {
        return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], zong_shu: 0 } }) })
      }
      if (路径.startsWith('/api/通知')) {
        return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], wei_du_shu: 0 } }) })
      }
      if (路径.startsWith('/api/资料/封禁状态')) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            cheng_gong: true,
            shu_ju: { bei_feng_jin: false, ji_bie: 'zheng_chang', wei_gui_ci_shu: 0, jie_feng_shi_jian: null, shu_su_zhuang_tai: 'wu' },
          }),
        })
      }
      逃逸记录.push(路径)
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) })
    })
  })
}

/** rAF 帧门控注入：把 requestAnimationFrame 换成「延后 D 毫秒再回调」，其余（微任务/网络）全速 */
export function 挂帧延后(page: Page, 延后毫秒: number) {
  return page.addInitScript((d: number) => {
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), d)) as typeof window.requestAnimationFrame
  }, 延后毫秒)
}
