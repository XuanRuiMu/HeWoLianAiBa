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

  it('FP-08 YH-076 缺失三维库即隐藏背景：零 r128 残留引用', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).not.toContain('three-r128.min.js')
    expect(yuanMa).not.toContain('GLTFLoader-r128.js')
    expect(yuanMa).not.toContain('OrbitControls-r128')
    expect(yuanMa).not.toContain('TransformControls-r128')
  })

  it('FP-01 首次加载根因：父帧三维库只有 __fuZhenSanWei 一个读取入口，不再有求值时直读', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).not.toMatch(/parent\.THREE/)
    expect(yuanMa).not.toMatch(/parent\.GLTFLoader/)
    expect(yuanMa).not.toContain('parentWin')
    // 提供者定义 + 覆盖层等待 + 反构/纹理/视锥三处取值
    expect((yuanMa.match(/__fuZhenSanWei/g) || []).length).toBeGreaterThanOrEqual(5)
    expect(yuanMa).toMatch(/window\.__fuZhenSanWei\s*=/)
    expect(yuanMa).toMatch(/qu:\s*du\b/)
  })

  it('FP-01 首次加载根因：等待父帧三维库带上限轮询与明确超时，数值走配置', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('fuZhenSanWeiLunXunJianGeHaoMiao')
    expect(yuanMa).toContain('fuZhenSanWeiChaoShiHaoMiao')
    expect(yuanMa).toMatch(/var CHAO_SHI_HAO_MIAO = PeiZhi\.fuZhenSanWeiChaoShiHaoMiao \|\| \d+;/)
    expect(yuanMa).toMatch(
      /var LUN_XUN_JIAN_GE_HAO_MIAO = PeiZhi\.fuZhenSanWeiLunXunJianGeHaoMiao \|\| \d+;/,
    )
    // 超时后必须回调 null（而非静默悬挂），且轮询有 clearInterval 收口
    expect(yuanMa).toMatch(/qieShiLunXun[\s\S]{0,600}shouHui\[i\]\(null\)/)
    expect(yuanMa).toContain('clearInterval(dingShiQi)')
  })

  it('FP-01 单道路化：v9 覆盖层与静态兜底图零功能残留，吴昊阳只走 T3', () => {
    const yuanMa = duQuCaoDi()
    for (const siWu of [
      'wuhaoyang-overlay',
      'wuhaoyang-static',
      '__wuXuanRanQiHuoZai',
      '__wuXianShiJingTai',
      '__wuJingTaiTu',
      '__wuJingTaiDaiXianShi',
      '__wuJingTaiDouDi',
      '__wuOverlayReady',
      '__wuTickXinTiao',
      '__wuPlane',
      'function qiDongFuZhenSanWei',
      'function chuShiHua(THREE, GLTFLoader)',
      'function initWuHaoYang',
      '__wuZhuJueZhuGuan || plane',
    ]) {
      expect(yuanMa).not.toContain(siWu)
    }
    // 道路值语义已死：fuCeng/jingTai 不再作为任何道路分支存在
    expect(yuanMa).not.toContain("'fuCeng'")
    expect(yuanMa).not.toContain("'jingTai'")
  })

  it('FP-01 门控 S4/S5 单道路证据：只认 T3 网格挂载与贴图解码', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toMatch(/function wuZiYuanJiuXu\(\)[\s\S]{0,300}__wuZhuJueMesh/)
    expect(yuanMa).toMatch(
      /function wuDaoLu\(\)[\s\S]{0,300}mesh && mesh\.parent[\s\S]{0,120}window\.__wuDaoLu = 'zhuDao'/,
    )
    // 门控状态暴露单道路语义：资源就绪且挂载中才算吴昊阳就绪
    expect(yuanMa).toContain('wuHaoYang: wuZiYuanJiuXu() && !!wuDaoLu()')
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

  it('主道路重试带指数退避，耗尽只记日志放弃（门控超时整体隐藏）', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('tieTuChongShi')
    expect(yuanMa).toContain('Math.min(600 * Math.pow(2,')
    expect(yuanMa).toContain('贴图重试耗尽，主道路放弃（门控超时将整体隐藏并通知父页）')
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

  it('FP-01 共享基础设施：配置/调试/压弯设施迁入且调参钩子保留', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('window.__wuPEIZHI = PEI_ZHI')
    expect(yuanMa).toContain('window.__wuD = {')
    expect(yuanMa).toContain('function zhuRuYaWan()')
    expect(yuanMa).toContain(
      'var YA_WAN = { r0: 0.12, r1: 0.68, strength: 0.75, huxi: 0.08, shuBiaoJia: 1.5, neiQiangDu: 1.0, wenLiBu: 0.02 }',
    )
    expect(yuanMa).toContain('window.__yaWanTiao')
    expect(yuanMa).toContain('window.__yaWanShouLian')
    expect(yuanMa).toContain('window.__wuGongYong = gongYong')
    // 强度驱动迁入 T3 主循环：呼吸/鼠标增强/平滑三要素齐备
    expect(yuanMa).toMatch(/gongYong\.qiangDu \+= \(muBiao - gongYong\.qiangDu\) \* 0\.08/)
    expect(yuanMa).toMatch(/Math\.sin\(\(nowMs - gongYong\.t0\) \/ 1000 \* 0\.9\) \* huXiFuDu/)
  })

  it('门控揭示：草地与吴昊阳双就绪后才圆形扩散，超时报错不揭示', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('__caoDiMenKongZhuangTai')
    expect(yuanMa).toContain('cao-di-bei-jing')
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

  it('单道路证据：主道挂载即真与心跳仍在，失败隐藏列表只含主画布', () => {
    const yuanMa = duQuCaoDi()
    // FP-02 简化语义：mesh 挂载中即真，5 帧可见证明机器已删（无覆盖层需要接管）
    expect(yuanMa).not.toContain('__wuZhuJueDaiQueRen')
    expect(yuanMa).toContain('__wuTongBuXinTiao')
    expect(yuanMa).toContain('__wuDaoLu')
    expect(yuanMa).toContain("'zhuDao'")
    // baoShiBai 整体隐藏：唯一画布 canvas.webgl，失败语义维持（隐藏 + 通知父页）
    expect(yuanMa).toContain("document.querySelectorAll('canvas.webgl')")
    expect(yuanMa).toContain("tongZhiFuYe('shi-bai', yuanYin)")
  })

  it('FP-01 pure=1 纯背景模式与调试面板仍在', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain("location.search.indexOf('pure=1')")
    expect(yuanMa).toContain('pureModeYangShi')
    expect(yuanMa).toContain("location.search.indexOf('debug=1')")
    expect(yuanMa).toContain('qieHuanTiaoShi')
    expect(yuanMa).toContain('gengXinMianBan')
  })

  it('主道纹理严格引擎同类克隆：无克隆源即重试，无父页THREE兜底，材质构造参数带map', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('quWenLiKeLongYuan')
    expect(yuanMa).toContain('wenLiWuXiao')
    // 2026-09-19 门控死锁根因：父页 THREE.Texture 会被引擎渲染管线替换为占位 canvas
    // （无 complete 属性 → 门控 S4 永假 → 背景整体隐藏）。兜底必须已删，无源走重试。
    expect(yuanMa).not.toContain('父页 Texture 承载图片')
    expect(yuanMa).not.toContain('new PW2.Texture(tu)')
    expect(yuanMa).toContain("if (!yuan) { throw new Error('wuKeLongYuan'); }")
    // 引擎只认构造参数路径：材质必须带 map 构造（事后赋值会被替换为占位纹理）
    expect(yuanMa).toMatch(/mat = new gz\.basicMatCtor\(\{\s*map: tex/)
    expect(yuanMa).toMatch(/var yinMat = new gz\.basicMatCtor\(\{\s*map: yinTex/)
  })

  it('揭示时间兜底：无uRevealProgress时按揭示时刻时间淡入（2026-09-19 死锁修复的配套）', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('jieLuShiKe')
    expect(yuanMa).toContain('__caoDiYiJieLu) {')
    expect(yuanMa).toMatch(/Date\.now\(\) - jieLuShiKe - 600\) \/ 7500/)
  })

  it('门控阶段标签先记再验：失败归因拿到真实卡点', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toMatch(/jiJieDuan\('wuZiYuanJiuXu'\);\s*\n\s*if \(!wuZiYuanJiuXu\(\)\) return false;/)
    expect(yuanMa).toMatch(/jiJieDuan\('wuDaoLuQueRen'\);\s*\n\s*if \(!wuDaoLu\(\)\) return false;/)
  })

  it('健康监测每60帧保留，FP-02跳帧已删（每帧更新透明度与压弯驱动）', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('__wuTongBuXinTiao')
    expect(yuanMa).toContain('zhenShu % 60')
    // FP-02：tongBu 每帧执行（opacity 直算与压弯强度驱动需每帧），%2 跳帧零残留
    expect(yuanMa).not.toContain('zhenShu % 2 === 0')
    // 注入检查节流保持低频（与每帧驱动解耦）
    expect(yuanMa).toContain('zhenShu % 120 === 0')
  })

  it('FP-11 billboard 朝向：法线对准镜头走 rotation 分量解算（禁 quaternion.copy 旧病），俯卧公式仅作兜底', () => {
    const yuanMa = duQuCaoDi()
    // 旧病回归守卫：曾用 quaternion.copy(相机) 致镜像/翻转失控，禁复活
    expect(yuanMa).not.toContain('quaternion.copy(cam')
    // 朝向解算钉死：每帧 atan2 分量法（水平 yaw + 俯仰 pitch，YXZ 序），不整块拷相机四元数
    expect(yuanMa).toContain('function mianXiangJingTou(m)')
    expect(yuanMa).toContain('mianXiangJingTou(mesh)')
    // 俯卧固定朝向仅作镜头未就绪时的一次性兜底（FP-11 前的旧路径，禁止当主路径）
    expect(yuanMa).toContain('function guDingChaoXiang(m)')
    expect(yuanMa).toContain('if (!mianXiangJingTou(mesh)) guDingChaoXiang(mesh);')
  })

  it('FP-02 贴地化：铰链几何（底边过原点）+ YXZ 欧拉序 + 倾角公式', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('geo.translate(0, 1, 0)')
    expect(yuanMa).toContain("m.rotation.order = 'YXZ'")
    // 倾角公式：rotation.x = -(π/2 − θ)，θ 从竖直向地面旋转 (90°−θ)
    expect(yuanMa).toContain("m.rotation.x = -(Math.PI / 2 - CAN_SHU.qingJiao * Math.PI / 180)")
    expect(yuanMa).toContain('m.rotation.y = CAN_SHU.pianHang * Math.PI / 180')
    // 铰链点即 mesh.position（脚边贴地）：测量成功用实测 yaoGaoDu，失败回退 CAN_SHU
    expect(yuanMa).toContain('mesh.position.set(PEI_ZHI.weiZhi.x, yaoGaoDu, PEI_ZHI.weiZhi.z)')
    expect(yuanMa).toMatch(/var yaoGaoDu = CAN_SHU\.jiaoLianGaoDu/)
    expect(yuanMa).toMatch(/ceLiangCaoGenGaoDu\(PEI_ZHI\.weiZhi\.x, PEI_ZHI\.weiZhi\.z\)/)
    // 旧锚点常量已死
    expect(yuanMa).not.toContain('YIN_QING_GAO_DU')
  })

  it('FP-02 贴地化：参数集中于 CAN_SHU 配置对象，URL 覆盖一处解析（FP-11 定案值）', () => {
    const yuanMa = duQuCaoDi()
    // FP-12 定案：锚点 (4.48,3.63)、尺寸乘数 0.32（旧俯卧锚点 2.9/2.92 已废弃）
    expect(yuanMa).toContain('weiZhi:  { x: 4.48, y: -0.0133, z: 3.63 }')
    expect(yuanMa).toContain('chiCun:  2.55')
    expect(yuanMa).toContain(
      'var PEI_ZHI = window.__wuPEIZHI || { weiZhi: { x: 4.48, y: -0.0133, z: 3.63 }, chiCun: 2.55 }',
    )
    expect(yuanMa).toContain(
      'var CAN_SHU = { jiaoLianGaoDu: 0.1416, qingJiao: 10, pianHang: 240, chiCunBeiShu: 0.32 }',
    )
    expect(yuanMa).toContain('function duQuURLShuZhi(ming)')
    for (const canShu of ['wuTheta', 'wuYaw', 'wuScale', 'wuY', 'wuX', 'wuZ']) {
      expect(yuanMa).toContain(`duQuURLShuZhi('${canShu}')`)
    }
    expect(yuanMa).toContain("duQuURLShuZhi('wuZ')")
    // 尺寸乘数在缩放处生效（billboard 下=等比缩放口，比例不变）
    expect(yuanMa).toContain('(PEI_ZHI.chiCun / 2) * CAN_SHU.chiCunBeiShu')
  })

  it('FP-08 揭示完成下限：门控通过后 uRevealProgress 按可配置时限抬底，保证背景显现', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('var JIE_LU_WAN_CHENG_HAO_MIAO = 8000')
    expect(yuanMa).toContain("duQuURLShuZhi('jieLuWanCheng')")
    expect(yuanMa).toContain('sheZhiJieLuWanCheng')
    expect(yuanMa).toContain('jieLuWanChengHaoMiao')
    expect(yuanMa).toContain('gouJianJieLuDiXian')
    expect(yuanMa).toContain('gengXinJieLuDiXian')
    expect(yuanMa).toContain('__fp08JieLuDiXian')
    // uniform getter 强制 max(engine, floor)，防引擎每帧回写冲掉下限
    expect(yuanMa).toMatch(/Object\.defineProperty\(un,\s*'value'/)
    expect(yuanMa).toContain("return di > xianShi ? di : xianShi")
    expect(yuanMa).toContain('uRevealProgress')
  })

  it('FP-09 构图镜头：默认关闭（绝对机位会破坏引擎朝向），URL xiangJi=1 才启用', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('var XIANG_JI_GOU_TU')
    expect(yuanMa).toContain('qiYong: false')
    expect(yuanMa).toContain("duQuURLShuZhi('xiangJi')")
    expect(yuanMa).toContain('if (xiangJiURL === 1) XIANG_JI_GOU_TU.qiYong = true')
    expect(yuanMa).toContain('camInst.lookAt(XIANG_JI_GOU_TU.muBiao.x')
  })

  it('FP-03/06 压伏场：人物 alpha 轮廓 mask uniforms 与采样代码注入', () => {
    const yuanMa = duQuCaoDi()
    for (const u of [
      'uCharMask',
      'uCharMaskOn',
      'uCharYaw',
      'uCharKuan',
      'uCharChang',
      'uCharEdge',
      'uCharNeiQiangDu',
      'uCharWenLiBu',
    ]) {
      expect(yuanMa).toContain(u)
    }
    // mask 采样 + 轮廓内压平/边缘带分开的 smoothstep 过渡
    expect(yuanMa).toContain('texture2D(uCharMask,clamp(')
    expect(yuanMa).toContain('smoothstep(uCharEdge,uCharEdge+0.2,')
    expect(yuanMa).toContain('smoothstep(0.0,uCharEdge,')
    // 圆形降级分支保留：mask 缺失（uCharMaskOn=0）时走旧径向逻辑
    expect(yuanMa).toContain('if(uCharMaskOn>0.5)')
    expect(yuanMa).toContain('smoothstep(uCharR0,uCharR1,dcW)')
    // FP-06 边缘带：局部外法线（梯度）→ 世界方向旋转
    expect(yuanMa).toContain('wuDirLocal.x*wuCos-wuDirLocal.y*wuSin')
    expect(yuanMa).toContain('-wuDirLocal.x*wuSin-wuDirLocal.y*wuCos')
  })

  it('FP-06 压伏 UV：v 锚点与 T3 平面同语义（铰链 v=0、头侧 v=1），错误公式零残留', () => {
    const yuanMa = duQuCaoDi()
    // 正确公式：u 宽向居中 +0.5；v 轴向自铰链起算，不再 +0.5（历史错误把铰链映到 v=0.5 错半身）
    expect(yuanMa).toContain('wuUV=vec2(wuLx/uCharKuan+0.5,wuZhou/uCharChang)')
    // 错误期望公式不得作为实现/测试期望出现
    expect(yuanMa).not.toContain('wuUV=vec2(wuLx/uCharKuan+0.5,wuZhou/uCharChang+0.5)')
    expect(yuanMa).not.toMatch(/wuZhou\/uCharChang\+0\.5/)
    // 逆偏航局部化：lx/zhou 计算（世界 XZ → 人物局部）
    expect(yuanMa).toContain('wuLx=tocW.x*wuCos-tocW.y*wuSin')
    expect(yuanMa).toContain('wuZhou=-(tocW.x*wuSin+tocW.y*wuCos)')
    // FP-12：驱动侧投影长改按 billboard 实时俯仰推导（卡高×sin 后仰角），
    // 旧俯卧 cosθ 公式会把压伏区甩到角色前方一大片，零残留
    expect(yuanMa).toContain('touYingChang = touYingKuan * Math.sin(Math.max(0, -(mesh.rotation.x || 0)))')
    expect(yuanMa).not.toContain('touYingChang = touYingKuan * Math.cos(CAN_SHU.qingJiao * Math.PI / 180)')
    // uniforms 每帧同步 billboard 实时偏航（投影轴=卡片后仰侧）
    expect(yuanMa).toContain('caiZhi.uCharYaw.value = mesh.rotation.y')
    expect(yuanMa).not.toContain('caiZhi.uCharYaw.value = CAN_SHU.pianHang * Math.PI / 180')
  })

  it('FP-06 地形扫描入口：草叶 instanceMatrix 根部世界 y 实测锚定铰链高度', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('function ceLiangCaoGenGaoDu(')
    expect(yuanMa).toContain('instanceMatrix')
    expect(yuanMa).toMatch(/matrixWorld\.elements/)
    // 取锚点邻域中位数；测量成功写入状态，失败回退 CAN_SHU
    expect(yuanMa).toMatch(/ceLiangZhuangTai/)
    expect(yuanMa).toMatch(/shiLiGenZhong|shiLiGenDiXing/)
    expect(yuanMa).toContain('var yaoGaoDu = CAN_SHU.jiaoLianGaoDu')
    // 阴影片 y 与人物同源（FP-12 起直接跟人物实时铰链 y，比一次性 yaoGaoDu 更新）+ eP
    expect(yuanMa).toMatch(/mesh\.position\.y \+ YIN_YING\.eP/)
  })

  it('FP-06 触碰箱：mask 四点 alpha 梯度外法线 + 轮廓内强度驱动可到 1.0', () => {
    const yuanMa = duQuCaoDi()
    // 四点采样求梯度
    expect(yuanMa).toMatch(/wuAu1=texture2D\(uCharMask,clamp\(wuUV\+vec2\(wuEps,0\.0\)/)
    expect(yuanMa).toMatch(/wuAu0=texture2D\(uCharMask,clamp\(wuUV-vec2\(wuEps,0\.0\)/)
    expect(yuanMa).toMatch(/wuAv1=texture2D\(uCharMask,clamp\(wuUV\+vec2\(0\.0,wuEps\)/)
    expect(yuanMa).toMatch(/wuAv0=texture2D\(uCharMask,clamp\(wuUV-vec2\(0\.0,wuEps\)/)
    expect(yuanMa).toContain('wuGrad=vec2(wuAu1-wuAu0,wuAv1-wuAv0)')
    // 外法线 = -梯度（alpha 下降方向 = 体型轮廓外侧）
    expect(yuanMa).toContain('normalize(vec2(-wuGrad.x,-wuGrad.y))')
    // 轮廓内强度走统一配置，默认 1.0（真压平）
    expect(yuanMa).toContain('wuNei*uCharNeiQiangDu')
    expect(yuanMa).toContain('neiQiangDu: 1.0')
    // tongBu 同步 uniforms 时生效
    expect(yuanMa).toMatch(/caiZhi\.uCharNeiQiangDu\.value\s*=/)
  })

  it('FP-06 调试 state 暴露实测铰链高度与测量来源', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('shiCeJiaoLianGaoDu')
    expect(yuanMa).toContain('ceLiangLaiYuan')
    expect(yuanMa).toMatch(/实测铰链/)
  })

  it('FP-03 mask 纹理独立克隆：禁父页 THREE 纹理直塞引擎草着色器', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('sheZhiMaskWenLi')
    expect(yuanMa).toContain('quMaskWenLi')
    // 跨实例陷阱注释存在（maskWenLi 声明处写明禁父页纹理）
    expect(yuanMa).toMatch(/禁父页 THREE 纹理直塞引擎草着色器/)
    /* 2026-09-19 机制升级：引擎 bundle 里 clone() 是 `new this.constructor().copy(this)`、
       copy() 是 `this.source = e.source`、`set image(e){this.source.data = e}` —— 给克隆体赋
       .image 会串改共享 Source 上的全部纹理。旧字面量 pin `maskKeLong.image = tu` 钉的正是这条
       会被串改的写法，现由 keLongDuLi 拆源（克隆体配独立 Source）承担同一不变式。 */
    expect(yuanMa).toMatch(
      /function keLongDuLi\(yuan, tuPian\)\s*\{[\s\S]{0,400}?tex\.source = new yuan\.source\.constructor\(tuPian\)/,
    )
    // mask 仍必须是「引擎同类克来源经拆源克隆」的独立一份，并且只从这条路径进草着色器
    expect(yuanMa).toContain('var maskKeLong = keLongDuLi(yuan, tuPian)')
    expect(yuanMa).toContain('gongYong.sheZhiMaskWenLi(maskKeLong)')
    // 禁父页 THREE 纹理直塞：sheZhiMaskWenLi 的唯一实参恒为 keLongDuLi 产物
    const sheZhiDiaoYong = yuanMa.match(/gongYong\.sheZhiMaskWenLi\([^)]*\)/g) || []
    expect(sheZhiDiaoYong.length).toBeGreaterThanOrEqual(1)
    for (const tiaoYong of sheZhiDiaoYong) {
      expect(tiaoYong).toBe('gongYong.sheZhiMaskWenLi(maskKeLong)')
    }
    // 不得回退到「共享 Source 上直接赋 image」的旧写法
    expect(yuanMa).not.toContain('maskKeLong.image =')
    // plane map / mask / 阴影片 三处各自拆源（同源不同 Source）
    expect(yuanMa).toContain('var tex = keLongDuLi(yuan, tuPian)')
    expect(yuanMa).toContain('var yinTex = keLongDuLi(yinYuan, cv)')
  })

  it('FP-03 阴影片：引擎材质构造、贴地 epsilon、depthWrite=false、生命周期同人物', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('function chuangJianYinYing()')
    expect(yuanMa).toContain("duQuURLShuZhi('wuYinYing')")
    expect(yuanMa).toContain('wuYinYingBuTouMingDu')
    // 渐变纹理走 quWenLiKeLongYuan 同类克隆路径
    expect(yuanMa).toContain('var yinYuan = quWenLiKeLongYuan()')
    // renderOrder 低于人物平面（人物默认 0，阴影 -1：草之后人物之前被正确遮挡）
    expect(yuanMa).toContain('renderOrder = -1')
    // 贴地 epsilon 防与草 z-fighting；不透明度上限为配置常量
    expect(yuanMa).toContain('YIN_YING.eP')
    expect(yuanMa).toContain('YIN_YING.shangXian')
    // 同生命周期：健康监测同时复核阴影片（yinRengZai），丢失随人物重建
    expect(yuanMa).toContain('yinRengZai')
    expect(yuanMa).toMatch(/阴影片与人物 mesh 同生命周期/)
    // 呼吸微动随压伏 sin 同相位，不透明度经上限 clamp
    expect(yuanMa).toContain('Math.min(YIN_YING.shangXian, Math.max(0, yinOpacity))')
  })

  it('FP-03 调试系统：mask 注入与阴影片状态入 state()/面板', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('maskZhuRu')
    expect(yuanMa).toContain('maskUV')
    expect(yuanMa).toContain('window.__wuYinYingZhuangTai')
    expect(yuanMa).toContain('铰链uv采样')
    expect(yuanMa).toContain('阴影片: ')
  })

  it('FP-02 贴地化：5 帧可见证明机器零残留（FP-01 后无覆盖层需要接管）', () => {
    const yuanMa = duQuCaoDi()
    for (const siWu of ['daiQueRen', 'shiFouKeJian', 'lianXuKeJian']) {
      expect(yuanMa).not.toContain(siWu)
    }
    // 挂载即真：创建路径直接置主道路标记，健康监测复核
    expect(yuanMa).toContain('window.__wuZhuJueZhuGuan = true')
    // 重建路径保留：mesh 丢失 → 降级并经 dengJiChu 重建（重建重设固定朝向）
    expect(yuanMa).toMatch(/平面已丢失，主道路降级，触发重建/)
    expect(yuanMa).toMatch(/setTimeout\(dengJiChu, 800\)/)
    // 已移除的 mesh 引用不让门控 S4/S5 误判就绪
    expect(yuanMa).toContain('window.__wuZhuJueMesh = null')
  })

  it('FP-02 根因：GPU 回读告警经 bundle 补丁消除，噪音过滤器不再留死词', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('fengZhuangRizhi')
    // 补丁已根治告警来源，这三个只为它而写的过滤分支属死代码，必须已删除
    // （词本身仍允许出现在补丁说明注释里，故断言过滤器调用形态而非裸词）
    for (const siCi of ['READ-usage buffer', 'testAndStartReadback', 'shadow copy']) {
      expect(yuanMa).not.toContain(`s.indexOf('${siCi}')`)
    }
    // 其余过滤词拦的是页面自身 console 输出的另一类噪音，补丁管不到，必须保留
    for (const baoLiu of ['GPU stall', 'ReadPixels', 'GL Driver Message', 'GL_INVALID_ENUM']) {
      expect(yuanMa).toContain(`s.indexOf('${baoLiu}')`)
    }
    // 补丁本体：回读未落地时不再发起第二轮回读；本帧只渲染并挂起，readPixels 连同 PBO 重指定
    // 一起搬到次帧帧首（补丁串细节由 FP02遮挡剔除回读补丁.test.ts 逐条钉死，这里只钉锚点形状）
    const bundle = fs.readFileSync(
      path.resolve(process.cwd(), 'public', 'grass-bg', 'references', '-assets-index-G3tB3Owe-purple.patched.js'),
      'utf-8',
    )
    const biaoDing = bundle.match(/testAndStartReadback\(e,t,i,s,r\)\{([\s\S]{0,900}?)this\.newTestPending=!0\}/)
    expect(biaoDing, 'bundle 内 testAndStartReadback 结构变化，补丁锚点需同步').toBeTruthy()
    expect(biaoDing![1]).toContain('if(this.hasPendingReadback)return')
    expect(biaoDing![1]).toContain('this.readbackArmed=!0')
    expect(biaoDing![1]).not.toContain('readPixels')
    expect(bundle).toContain('t.bufferData(t.PIXEL_PACK_BUFFER,this.maxOccludees*4,t.STREAM_READ)')
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

  it('吴昊阳克隆 donor 只认画布/图片源：DataTexture 兜底不得回到评分里', () => {
    // three.js 按「纹理类」选上传分支：isDataTexture 恒走 texSubImage2D(…, image.data)。
    // 旧实现在 kanYuan 里给 DataTexture/计算纹理记 0 分当「类 donor 兜底」，克隆体 image 被换成
    // 画布后 image.data 不存在 ⇒ 每次加载人物贴图/mask/阴影片共 3 条
    // `INVALID_VALUE: texSubImage2D: no pixels`。评分只允许 2/1/-1。
    const yuanMa = duQuCaoDi()
    const qi = yuanMa.indexOf('function kanYuan(ti) {')
    expect(qi).toBeGreaterThan(-1)
    const zheng = yuanMa.slice(qi, yuanMa.indexOf('\n                }', qi))
    expect(zheng).not.toMatch(/return\s+0\s*;/)
    expect(zheng).toContain('return -1;')
    // 三类可用源（OffscreenCanvas=2 / HTMLCanvasElement=1 / HTMLImageElement=1），其余一律 -1
    expect(zheng.match(/\?\s*[12]\s*:\s*-1/g) || []).toHaveLength(3)
  })

  it('块注释体内不得出现注释终止符：单行两处即判红', () => {
    // 实测事故（2026-09-20 全量 e2e 34 红）：FP-09 注释里写 URL 通配名 cam*/look*，
    // 其中 cam 后的终止符提前闭合块注释，其后的中文被当成表达式语句 ⇒
    // ReferenceError: look is not defined，整段补丁层 IIFE 中止，草地永不就绪、门控不揭示。
    // 语法解析查不出来（那串中文恰好是合法的正则字面量），只有真机控制台能抓到，故在此钉死。
    const yuanMa = duQuCaoDi()
    const youDuHao = yuanMa
      .split(/\r?\n/)
      .map((hang, xu) => ({ xu: xu + 1, ge: (hang.match(/\*\//g) || []).length }))
      .filter((x) => x.ge > 1)
    expect(youDuHao).toEqual([])
  })
})
