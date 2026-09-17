import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function duQuCaoDi(): string {
  const wenJian = path.resolve(process.cwd(), 'public', 'grass-bg', 'grass-bg.html')
  return fs.readFileSync(wenJian, 'utf-8')
}

describe('FP-01 草地静态兜底', () => {
  it('着色器除零六处替换齐全', () => {
    const yuanMa = duQuCaoDi()
    for (const tiHuan of [
      'uResolution.x/max(uResolution.y,1.0)',
      'uThickness/max(uResolution,vec2(1.0))',
      '1.0/max(uResolution,vec2(1.0))',
      'gl_FragCoord.xy/max(uResolution.xy,vec2(1.0))',
      'toLightVec/max(dist,1e-4)',
      'uFireflyGlow/max(distanceToCenter,1e-4)',
    ]) {
      expect(yuanMa).toContain(tiHuan)
    }
  })

  it('着色器补丁覆盖WebGL与WebGL2', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('buDing(WebGLRenderingContext)')
    expect(yuanMa).toContain('buDing(window.WebGL2RenderingContext)')
    expect(yuanMa).toContain('__caoDiXiuFuZhaoSeQi')
  })

  it('生产环境控制台零刷屏：报错走内存收集且打印需debug门控', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('window.__errors')
    expect(yuanMa).toContain('shiFouDiaoShi')
    expect(yuanMa).toContain("if (shiFouDiaoShi()) yuanError.apply(console, arguments)")
    expect(yuanMa).not.toMatch(/yuanError\.apply\(console, arguments\);\s*\n\s*\};\s*\n\s*window\.addEventListener\('error'/)
  })

  it('FP-08 YH-076 缺失三维库即隐藏背景：零 r128 残留引用，失败走静态兜底', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).not.toContain('three-r128.min.js')
    expect(yuanMa).not.toContain('GLTFLoader-r128.js')
    expect(yuanMa).not.toContain('OrbitControls-r128')
    expect(yuanMa).not.toContain('TransformControls-r128')
    expect(yuanMa).toContain('__wuXianShiJingTai')
  })

  it('主引擎像素比封顶：改写devicePixelRatio上限为配置值', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain("defineProperty(window, 'devicePixelRatio'")
    expect(yuanMa).toContain('xiangSuBiFengDing')
    expect(yuanMa).toContain('Math.min(shiJi || 1, ding)')
  })

  it('埋点与音频拦截二合一：XHR发送同时处理两种标记', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('this.__a')
    expect(yuanMa).toContain('this._caoDiPingBi')
    expect(yuanMa).toContain("if (this._caoDiPingBi) {")
    expect(yuanMa).toContain('ingest.analytics.invantis.tech')
    expect(yuanMa).toContain('fenXiCaiYangZuiXiaoJianGeMiao')
    expect(yuanMa).toContain('caiYangMiao')
  })

  it('帧间隔与重试上限走地址参数可配置', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('zhenJianGe')
    expect(yuanMa).toContain('chongShi')
    expect(yuanMa).toContain('zuiXiaoZhenJianGeHaoMiao')
    expect(yuanMa).toContain('zuiDaChongShi')
  })

  it('双路角色兜底：覆盖层重试与主道路重试均带退避与静态回退', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('tieTuChongShiCiShu')
    expect(yuanMa).toContain('tieTuChongShi')
    expect(yuanMa).toContain('Math.min(600 * Math.pow(2,')
    expect(yuanMa).toContain('__wuXianShiJingTai')
    expect(yuanMa).toContain('wuhaoyang-static')
    expect(yuanMa).toContain('/grass-bg/wuhaoyang-2d.png')
  })

  it('主道路失败不刷屏：T3日志经内存通道且直打控制台需门控', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('__wuDLog')
    expect(yuanMa).toContain("if (/[?&]debug=1/.test(location.search)) console.debug('[WuHaoYang][T3] '")
  })

  it('音频与着色器噪音不刷屏：trace/warn同样进内存且debug门控', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('shiYinPinHuoZhaoSeQiZaoYin')
    expect(yuanMa).toContain('console.trace = function')
    expect(yuanMa).toContain('console.warn = function')
    expect(yuanMa).toContain('/grass-bg/audio/')
    expect(yuanMa).toContain('X4122')
    expect(yuanMa).toContain('X4008')
  })

  it('吴昊阳兜底：未就绪延迟显示静态图（门控揭示后才可见）', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('__wuOverlayReady')
    expect(yuanMa).toContain('__wuXianShiJingTai')
    expect(yuanMa).toContain('__caoDiYiJieLu')
  })

  it('门控揭示：草地与吴昊阳双就绪后才圆形扩散，超时报错不揭示', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('__caoDiMenKongZhuangTai')
    expect(yuanMa).toContain('cao-di-bei-jing')
    expect(yuanMa).toContain('__wuJingTaiDaiXianShi')
    expect(yuanMa).toContain('startReveal')
    expect(yuanMa).toContain('30000')
  })

  it('分阶段机：每一步有名有姓，失败原因带阶段', () => {
    const yuanMa = duQuCaoDi()
    for (const jieDuan of [
      'yinQingJiuXu',
      'huaBuJiuXu',
      'jieShiQiJiuXu',
      'wuZiYuanJiuXu',
      'wuDaoLuQueRen',
      'jieLuYiChuFa',
      'fuYeYiTongZhi',
    ]) {
      expect(yuanMa).toContain(jieDuan)
    }
    expect(yuanMa).toContain('__caoDiJieDuan')
  })

  it('三道路证据：主道证明接管、覆盖层心跳、静态回收守卫', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('__wuZhuJueDaiQueRen')
    expect(yuanMa).toContain('__wuTickXinTiao')
    expect(yuanMa).toContain('__wuXuanRanQiHuoZai')
    expect(yuanMa).toContain('__wuDaoLu')
    expect(yuanMa).toContain('zhuDao')
    expect(yuanMa).toContain('fuCeng')
    expect(yuanMa).toContain('jingTai')
    expect(yuanMa).toContain('__wuZhuJueZhuGuan || plane')
  })

  it('主道纹理与引擎同类克隆，无image绝不进场景', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('quWenLiKeLongYuan')
    expect(yuanMa).toContain('wenLiWuXiao')
    expect(yuanMa).toContain('父页 Texture')
  })

  it('健康监测放在跳过之前，偶数帧不再吞掉检查', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('__wuTongBuXinTiao')
    expect(yuanMa).toContain('zhenShu % 60')
  })

  it('bundle噪音经四方法收敛：新增GPU回读模式精确过滤', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('fengZhuangRizhi')
    for (const moShi of ['READ-usage buffer', 'testAndStartReadback', 'shadow copy', 'GPU stall', 'GL Driver Message']) {
      expect(yuanMa).toContain(moShi)
    }
  })

  it('FP-01 根因：无常驻400ms主题轮询，稳态事件驱动', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).not.toContain('setInterval(syncTheme, 400)')
    expect(yuanMa).not.toContain('global:config:changed')
    expect(yuanMa).not.toContain('terrainForced')
    expect(yuanMa).toContain("attributeFilter: ['data-theme']")
  })

  it('FP-01 根因：bundle访问带空守卫与异常兜底', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('window.__dcm || null')
    expect(yuanMa).toContain('d.getPhase && d.setPhase')
    expect(yuanMa).toContain('dengDaiCiShu >= 30')
  })

  it('未染色先展现根因：揭示前同步染色，未染上不揭示', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('__caoDiTongBuZhuTi')
    expect(yuanMa).toContain('__caoDiYiRanSe')
    expect(yuanMa).toContain('ranSeJiuXu')
    expect(yuanMa).toMatch(/if\s*\(!window\.__caoDiYiRanSe\)\s*return false/)
  })

  it('未染色先展现根因：补齐线程揭示后未染不自停', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('yiRanSe && (yiJiuXuDcm || yiJiuXu)')
    expect(yuanMa).not.toMatch(/\|\|\s*yiJiuXu\s*\|\|\s*dengDaiCiShu/)
  })

  it('未染色先展现根因：染色写入计数置证据位并向门控状态暴露', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('if (jiShu > 0 || diXing) window.__caoDiYiRanSe = true')
    expect(yuanMa).toContain('yiRanSe: !!window.__caoDiYiRanSe')
  })

  it('门控阶段诚实：画布缺失记 huaBuJiuXu 而非 yinQingJiuXu', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toMatch(/if\s*\(!huaBuJiuXu\(\)\)\s*\{\s*jiJieDuan\('huaBuJiuXu'\)/)
  })

  it('真就绪门控：只认出生即置位的__dcm不够，必须 engine 的 experience:ready', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('_experienceReady')
    expect(yuanMa).toMatch(/tiYan && tiYan\.engine/)
    expect(yuanMa).toMatch(/eng && eng\._experienceReady/)
  })

  it('沉降补染：reveal:complete 落定再压染色，最多3次', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('reveal:complete')
    expect(yuanMa).toContain('__jieLuDingYue')
    expect(yuanMa).toContain('__jieLuDingYueCiShu')
  })

  it('事件补染：子系统报到即同步染色，覆盖滞后构建', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('component:ready')
    expect(yuanMa).toContain('__buJianDingYue')
    expect(yuanMa).toContain('dingYueShiJianBuRan')
  })

  it('FP-01 引擎揭示单飞：门控为唯一驱动，中和bundle自动与点击链，二次调用不变进度', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('__jieLuYiFaQi')
    expect(yuanMa).toContain('__danFeiYiBao')
    expect(yuanMa).toContain('tryStartReveal')
    expect(yuanMa).toContain('__zhongHeJieLu')
    expect(yuanMa).toContain('startReveal')
    expect(yuanMa).not.toContain('|| window.__dcm')
    expect(yuanMa).not.toContain('circle.click')
    expect(yuanMa).not.toContain('function tryStart(')
  })

  it('bundle 契约钉死：真就绪标志与揭示事件存在', () => {
    const bundleLuJing = path.resolve(process.cwd(), 'public', 'grass-bg', 'references', '-assets-index-G3tB3Owe-purple.patched.js')
    const bundle = fs.readFileSync(bundleLuJing, 'utf-8')
    expect(bundle).toContain('_experienceReady')
    expect(bundle).toContain('experience:ready')
    expect(bundle).toContain('reveal:complete')
  })

  it('芦苇已删除：Pampa默认实例数为0且无残留400配置', () => {
    const bundleLuJing = path.resolve(process.cwd(), 'public', 'grass-bg', 'references', '-assets-index-G3tB3Owe-purple.patched.js')
    const bundle = fs.readFileSync(bundleLuJing, 'utf-8')
    expect(bundle).toContain('pampa:{lightColor:"#fff0cf",darkColor:"#e4dec7",count:0}')
    expect(bundle).not.toContain('count:400')
  })
})
