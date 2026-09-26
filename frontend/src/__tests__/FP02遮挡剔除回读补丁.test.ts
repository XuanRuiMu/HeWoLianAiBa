import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const CAO_DI_HTML = path.resolve(process.cwd(), 'public', 'grass-bg', 'grass-bg.html')
const BUNDLE = path.resolve(
  process.cwd(),
  'public',
  'grass-bg',
  'references',
  '-assets-index-G3tB3Owe-purple.patched.js',
)

function duHtml(): string {
  return fs.readFileSync(CAO_DI_HTML, 'utf-8')
}
function duBundle(): string {
  return fs.readFileSync(BUNDLE, 'utf-8')
}
function ciShu(wen: string, chuan: string): number {
  return wen.split(chuan).length - 1
}
/* 取某个方法从 anchor 起到的完整方法体（按花括号配平），用于「体内不得出现 X」这类断言。
   anchor 可以止于方法体中部；模板串里的 ${} 成对出现，不影响配平。 */
function qiChuan(wen: string, anchor: string): string {
  const kai = wen.indexOf(anchor)
  expect(kai, `anchor 未命中: ${anchor}`).toBeGreaterThan(-1)
  let shen = 0
  let yiKai = false
  for (let i = kai; i < wen.length; i++) {
    if (wen[i] === '{') {
      shen++
      yiKai = true
    } else if (wen[i] === '}') {
      shen--
      if (yiKai && shen === 0) return wen.slice(kai, i + 1)
    }
  }
  throw new Error('花括号未配平')
}

/* 补丁一：回读入口守卫（防覆盖写与丢弃未落地 fence） */
const SHOU_WEI = 'testAndStartReadback(e,t,i,s,r){if(this.occludeeCount===0)return;if(this.hasPendingReadback)return;'
/* 补丁二：readPixels 前重新指定同一块 STREAM_READ 缓冲（实测消除 Chromium shadow-copy 告警的充分条件）。
   补丁三（L-60）：本帧只渲染并挂起，readPixels 推到下一帧帧首由 startArmedReadback 发，
   避开 ANGLE「刚渲染完就同步读回」的 GPU stall 判据；重指定串因此随读回一起搬进新方法。 */
const ZHONG_ZHI_DING =
  't.bindBuffer(t.PIXEL_PACK_BUFFER,this.pbo),t.bufferData(t.PIXEL_PACK_BUFFER,this.maxOccludees*4,t.STREAM_READ),t.readPixels(0,0,this.occludeeCount,1,t.RGBA,t.UNSIGNED_BYTE,0)'
/* 挂起标志的完整生命周期：声明 → 渲染后置位 → 下一帧帧首发读回时清位 → 换表时取消 */
const QI_SHI = 'fence=null;hasPendingReadback=!1;readbackArmed=!1;'
const GUA_QI = 'this.renderer.setRenderTarget(null),this.readbackArmed=!0,this.hasPendingReadback=!0,this.newTestPending=!0}'
const QU_XIAO = 'this.readbackArmed&&(this.readbackArmed=!1,this.hasPendingReadback=!1)'

describe('FP-02 HiZ 遮挡剔除 PBO 回读补丁', () => {
  it('补丁串各在整库唯一（防重新生成 bundle 后静默回退）', () => {
    const bundle = duBundle()
    for (const chuan of [SHOU_WEI, ZHONG_ZHI_DING, QI_SHI, GUA_QI, QU_XIAO]) {
      expect(ciShu(bundle, chuan)).toBe(1)
    }
  })

  it('守卫在写入 PIXEL_PACK_BUFFER 之前早退，重指定紧贴 readPixels 之前', () => {
    const bundle = duBundle()
    const ruKou = bundle.indexOf(SHOU_WEI)
    const xieRu = bundle.indexOf(ZHONG_ZHI_DING)
    expect(ruKou).toBeGreaterThan(-1)
    expect(xieRu).toBeGreaterThan(ruKou)
    expect(bundle.slice(ruKou, xieRu)).toContain('if(this.hasPendingReadback)return;')
  })

  it('读回时序已推迟一帧：testAndStartReadback 体内不再有任何 GL 读回调用', () => {
    // 判据是「同一帧内刚渲染完 visibility pass 就 readPixels」——那正是 ANGLE 报
    // GPU stall due to ReadPixels 的触发条件，所以本方法体必须只渲染、只挂起。
    const zheng = qiChuan(duBundle(), SHOU_WEI)
    expect(zheng).toContain(GUA_QI)
    for (const buKe of ['readPixels', 'bufferData', 'fenceSync', 'deleteSync', 'PIXEL_PACK_BUFFER']) {
      expect(zheng).not.toContain(buKe)
    }
  })

  it('startArmedReadback 先重绑 visibilityRT 再读回（readPixels 取的是当前绑定的帧缓冲）', () => {
    const zheng = qiChuan(duBundle(), 'startArmedReadback(){if(!this.readbackArmed)return;')
    expect(zheng.indexOf('this.renderer.setRenderTarget(this.visibilityRT)')).toBeLessThan(
      zheng.indexOf('t.readPixels('),
    )
    expect(zheng).toContain(ZHONG_ZHI_DING)
    // 发完读回才立 fence，且必须先清挂起标志（否则同帧重复发）
    expect(zheng).toContain('this.readbackArmed=!1')
    expect(zheng.indexOf('this.readbackArmed=!1')).toBeLessThan(zheng.indexOf('t.fenceSync('))
  })

  it('消费口每帧先发起挂起的读回，再判 fence（顺序错则结果永不落地）', () => {
    const bundle = duBundle()
    const xiaoFei = bundle.indexOf('applyPreviousResults(e){const t=this.gl;this.startArmedReadback();if(this.hasPendingReadback&&this.fence){')
    expect(xiaoFei).toBeGreaterThan(-1)
  })

  it('换表即取消挂起轮次：读回像素与条目表错位的窗口必须封掉', () => {
    // 挂起窗口是「本帧渲染 → 下帧帧首发读回」；期间若 setOccludees 换了条目表，
    // 旧表渲染出的像素会被按新表索引解读 ⇒ 可见性整体错位一帧。取消即作废该轮。
    const bundle = duBundle()
    const huanBiao = bundle.indexOf(QU_XIAO)
    expect(huanBiao).toBeGreaterThan(bundle.indexOf('setOccludees(e){'))
    expect(huanBiao).toBeLessThan(bundle.indexOf(SHOU_WEI))
  })

  it('bundle 结构不变量仍在：字段声明、fence 消费出口、标志解除三处缺一不可', () => {
    const bundle = duBundle()
    // 守卫依赖的字段确实存在，否则 hasPendingReadback 恒 undefined，守卫会永久拦死回读
    expect(bundle).toContain('hasPendingReadback=!1')
    // 回读结果必须有消费出口，否则补丁一的守卫一旦置位就再无放行机会
    expect(bundle).toMatch(
      /if\(this\.hasPendingReadback&&this\.fence\)\{const s=t\.clientWaitSync\(this\.fence,0,0\)[\s\S]{0,400}getBufferSubData\(t\.PIXEL_PACK_BUFFER,0,this\.readbackBuffer/,
    )
    expect(bundle).toContain('this.fence=null,this.hasPendingReadback=!1')
    // 缓冲尺寸来源仍是构造期的 maxOccludees，重指定与原分配同尺寸
    expect(bundle).toContain('this.gl.bufferData(this.gl.PIXEL_PACK_BUFFER,t*4,this.gl.STREAM_READ)')
  })

  it('遮挡剔除功能未被关掉：回读主体、统计出口与结果应用仍在', () => {
    const bundle = duBundle()
    expect(bundle).toContain(
      'getStats(){return{tested:this.lastTestedCount,occluded:this.lastOccludedCount,visible:this.lastTestedCount-this.lastOccludedCount}}',
    )
    expect(bundle).toContain('this.lastOccludedCount=this.aabbTest.applyPreviousResults(yA)')
    expect(bundle).toContain('this.aabbTest.testAndStartReadback(this.hiZ,this.viewProjectionMatrix,this.hiZBaseSize,e.near,e.far)')
  })

  /* 2026-09-26：grass-bg.html 已整体重写，页面层不再承载任何补丁留痕注释。
     补丁本体在 .patched.js 内（上方十条断言仍逐条守着），页面层只保留一条硬约束：
     加载点必须指向打过补丁的 bundle，且不得出现任何未打补丁的同名替代物，
     否则重新生成引擎时补丁会静默失效。 */
  it('页面加载点只引用打过补丁的 bundle，无未打补丁的替代物', () => {
    const html = duHtml()
    const yinYong = [...html.matchAll(/\.{1,2}\/references\/([A-Za-z0-9._-]+\.js)/g)].map((m) => m[1])
    expect(yinYong).toEqual(['-assets-index-G3tB3Owe-purple.patched.js'])
    expect(yinYong.every((ming) => ming.endsWith('.patched.js'))).toBe(true)
  })
})

describe('FP-02 console 噪声屏蔽层整体退场', () => {
  /* 2026-09-26：随页面重写一并移除驱动层告警屏蔽（原意是压掉 F12 里的 GPU 噪音，
     实际全是补丁修复后已失效的死词）。此处锁死「不再有屏蔽层」，
     防止日后重新生成页面时把死词带回来。 */
  it('页面不再包含任何 console 屏蔽词表与劫持', () => {
    const html = duHtml()
    expect(html).not.toContain('s.indexOf(')
    expect(html).not.toContain('console.error =')
    for (const si of [
      'READ-usage buffer',
      'testAndStartReadback',
      'shadow copy',
      'GPU stall',
      'ReadPixels',
      'GL Driver Message',
      'GL_INVALID_ENUM',
      'performance warning',
    ]) {
      expect(html).not.toContain(si)
    }
  })

  /* 音频静音是另一套机制（拦截 fetch 返回静音 WAV），与 console 屏蔽层无关，
     页面重写后仍在。此处防止「屏蔽层退场」被误改成「音频拦截也一起删了」。 */
  it('音频仍走 fetch 拦截返回静音 WAV，不依赖任何真实音频资源', () => {
    const html = duHtml()
    expect(html).toContain("/grass-bg/audio/")
    expect(html).toContain('function isAudio(u)')
  })
})

describe('FP-01 收尾：单道路降级与文案契约', () => {
  /* 2026-09-26：父页三维库整体退场。新版页面既不借父页 THREE 作构造器/向量兜底，
     也不再有任何跨实例纹理引用——2026-09-19 的门控死锁根因（引擎渲染管线把跨实例
     纹理替换为无 complete 的占位 canvas）已随「完全不用父页 THREE」彻底不存在，
     故此处由「兜底必须在」收紧为「父页三维库一个字都不许出现」。 */
  it('父页三维库整体退场：无兜底、无跨实例纹理、无吴昊阳状态回写口', () => {
    const html = duHtml()
    const yingJinZhan = [
      'fuZhenSanWei',
      'FALBACK',
      'PW2.Texture',
      '父页 Texture',
      'function qiDongFuZhenSanWei',
      'function chuShiHua(THREE, GLTFLoader)',
      'window.__wuXianShiJingTai',
      'window.__wuJingTaiTu',
    ]
    for (const ci of yingJinZhan) {
      expect(html).not.toContain(ci)
    }
  })

  /* 2026-09-26：失败语义改为「15 秒未就绪则强制显现」（fail-open）。
     旧版是「超时撤回画布 + postMessage 通知父页弹失败提示 + 提供重试」，
     会在用户正浏览时突然抽空内容并弹窗。新版不再撤回、不再上报，
     宁可显示未完全就绪的草景，也不打断用户。此处锁死该取舍。 */
  it('失败语义：15 秒未就绪则强制显现，不撤回画布也不通知父页', () => {
    const html = duHtml()
    expect(html).toContain('setTimeout(function () { if (!done) fire(); }, 15000);')
    expect(html).not.toContain("document.querySelectorAll('canvas.webgl')")
    expect(html).not.toContain("tongZhiFuYe('shi-bai'")
    expect(html).not.toContain("tongZhiFuYe('jiu-xu'")
  })

  it('失败文案与重试/关闭入口走翻译键，值即最终文案', async () => {
    const { huoQuFanYi } = await import('@/config/translations')
    expect(huoQuFanYi('caoDi', 'jiaZaiShiBaiTiShi')).toBe('主页未能完整加载，已隐藏。')
    expect(huoQuFanYi('caoDi', 'chongShi')).toBe('重试')
    expect(huoQuFanYi('tongYong', 'guanBi')).toBe('关闭')
  })
})
