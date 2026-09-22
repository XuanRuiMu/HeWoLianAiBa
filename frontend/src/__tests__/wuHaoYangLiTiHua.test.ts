import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function duQuCaoDi(): string {
  const wenJian = path.resolve(process.cwd(), 'public', 'grass-bg', 'grass-bg.html')
  return fs.readFileSync(wenJian, 'utf-8')
}

/* FP-10 吴昊阳立体化（2.5D 深度浮雕）：
   纯 2D 平面在镜头晃动时无内部视差/轮廓起伏/光照变化，一眼纸片。
   不变式：深度贴图走引擎同类克隆路径；顶点位移+片元视差+法线重光照注入
   MeshBasicMaterial.onBeforeCompile；uWuShenDuKai=0 时与纯平面逐像素一致（优雅降级）；
   草地接触 AO 与压伏场同 mask；构图终值对齐最终效果图（FP-07 实测）。 */
describe('FP-10 吴昊阳立体化', () => {
  it('深度法线打包贴图存在且在体积预算内', () => {
    const luJing = path.resolve(process.cwd(), 'public', 'grass-bg', 'wuhaoyang-3d.png')
    expect(fs.existsSync(luJing)).toBe(true)
    const daXiao = fs.statSync(luJing).size
    expect(daXiao).toBeGreaterThan(10 * 1024)
    expect(daXiao).toBeLessThan(2 * 1024 * 1024)
  })

  it('立体化配置集中 LI_TI 且深度浮雕永不禁用 URL 强开', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('var LI_TI = { shenDuZuiDa: 0.32, shiCha: 0.028, aoQiangDu: 0.55, guangQiang: 1.0, qiYong: false }')
    // 深度浮雕退役：qiYong 写死 false，wuLiTi/wuDepth/wuShiCha/wuAO/wuGuangQiang
    // URL 强开全部移除——角色像素永不形变，无任何路径可重新激活 shader 形变
    expect(yuanMa).not.toContain("duQuURLShuZhi('wuLiTi')")
    expect(yuanMa).not.toContain("duQuURLShuZhi('wuDepth')")
    expect(yuanMa).not.toContain("duQuURLShuZhi('wuShiCha')")
    expect(yuanMa).not.toContain("duQuURLShuZhi('wuAO')")
    expect(yuanMa).not.toContain("duQuURLShuZhi('wuGuangQiang')")
  })

  it('GANG_TI 刚体立体化：配置集中 + 贴地写入点叠加呼吸 + 每帧 transform 驱动', () => {
    const yuanMa = duQuCaoDi()
    // 刚体配置集中一处（【用户裁定】qiYong=false：缩放脉动改变角色比例被禁，
    // 角色时时刻刻保持原 2D 图比例；代码保留供后续非比例类方案参考）
    expect(yuanMa).toContain('var GANG_TI = { qiYong: false, fuDu: 0.01, suoFang: 0.004, yaoYe: 0.006 }')
    // 呼吸浮动融入 FP-06 唯一 y 写入点（避免独立写入被健康监测覆盖），与阴影片同源同频 sin
    expect(yuanMa).toContain('mesh.position.y = ceXin + (GANG_TI.qiYong ? Math.sin((Date.now() - gongYong.t0) / 1000 * 0.9) * GANG_TI.fuDu : 0)')
    // 每帧驱动：缩放基准随 mesh 重建重取 + 同相位脉动 + 半频错相摇曳（绕铰链，底边固定）
    expect(yuanMa).toContain('GANG_TI._jiZhunSuoFang = mesh.scale.x')
    expect(yuanMa).toContain('var gangSuo = GANG_TI._jiZhunSuoFang * (1 + huXiZhen * GANG_TI.suoFang)')
    expect(yuanMa).toContain('mesh.rotation.z = gangYaoXiang * GANG_TI.yaoYe')
  })

  it('细分几何：96×96 网格经引擎类反构构建，失败回退 2x2 克隆', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('function gouJianXiFenJiHe(exp, fenGe)')
    expect(yuanMa).toContain("ge.setAttribute('position', new attrCtor(pos, 3))")
    expect(yuanMa).toContain("ge.setAttribute('uv', new attrCtor(uv, 2))")
    expect(yuanMa).toContain('ge.setIndex(idxArr)')
    expect(yuanMa).toContain('var geo = gouJianXiFenJiHe(exp, 96) || exp.revealMesh.mesh.geometry.clone()')
    // 铰链几何不变（底边过原点，translate 仍在构建之后）
    expect(yuanMa).toContain('geo.translate(0, 1, 0)')
  })

  it('onBeforeCompile 注入三段 GLSL：位移/视差/重光照，kai=0 全归零', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('mat.onBeforeCompile = function (sq)')
    expect(yuanMa).toContain('mat.customProgramCacheKey = function ()')
    expect(yuanMa).toContain("'wu-liTi-v1'")
    // 顶点位移：深度 × 峰值 × 开关 × 呼吸
    expect(yuanMa).toContain('transformed.z += wuShenD * uWuShenDuZuiDa * uWuShenDuKai * uWuHuXi;')
    // 片元视差：深度驱动 UV 偏移并 clamp 防纹理游移（GLSL3 里 vMapUv 只读，自建 wuUv2）
    expect(yuanMa).toContain('vec2 wuUv2 = vMapUv - clamp(wuPian, vec2(-0.03), vec2(0.03));')
    expect(yuanMa).toContain('diffuseColor *= texture2D( map, wuUv2 );')
    // 法线重光照：kai=0 时 mix 到原色零影响（未就绪与纯平面一致）
    expect(yuanMa).toContain('diffuseColor.rgb *= mix(vec3(1.0), wuGuang, uWuGuangQiang * uWuShenDuKai);')
    expect(yuanMa).toContain('diffuseColor.rgb += uWuLunKuo * pow(1.0 - wuNdV, 2.5) * 0.30 * uWuShenDuKai;')
    // uniforms 由 liTi.tongYi 合入
    expect(yuanMa).toContain('for (var uk in liTi.tongYi) sq.uniforms[uk] = liTi.tongYi[uk];')
  })

  it('深度贴图走引擎同类克隆路径（拆源），失败仅记日志不带病进场景', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('function zaiRuShenDu(yuan)')
    expect(yuanMa).toContain('var stex = keLongDuLi(yuan, tp)')
    expect(yuanMa).toContain("st.src = '/grass-bg/wuhaoyang-3d.png'")
    expect(yuanMa).toContain("if (LI_TI.qiYong) zaiRuShenDu(yuan)")
    expect(yuanMa).toContain('深度贴图加载失败（保持纯平面，主道路不受影响）')
    // 与人物贴图共用 donor，严禁第二纹理源
    expect(yuanMa.match(/keLongDuLi\(yuan, /g) || []).not.toHaveLength(0)
  })

  it('每帧驱动：深度淡入爬坡/呼吸/基向量提取/引擎主光与主题同步', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('liTi.tongYi.uWuShenDuKai.value = Math.min(1, liTi.tongYi.uWuShenDuKai.value + 0.04)')
    expect(yuanMa).toContain('liTi.tongYi.uWuHuXi.value = 1 + huXiZhen * 0.03')
    expect(yuanMa).toContain('mesh.updateMatrixWorld(true)')
    expect(yuanMa).toContain('liTi.zhouYiTiQu = true')
    // flipY 预签：法线 y 轴方向与引擎纹理一致
    expect(yuanMa).toContain('mesh.material.map.flipY) ? -1 : 1')
    // 主光与草地同源（uLightDirection 同步）
    expect(yuanMa).toContain('gm0.uniforms.uLightDirection.value')
    // 主题两套预设
    expect(yuanMa).toContain('var LI_TI_ZHU_TI = {')
    expect(yuanMa).toContain("LI_TI_ZHU_TI[th2 === 'light' ? 'light' : 'dark']")
  })

  it('草地接触 AO：varying 传递 + 片元压暗 + uniforms 同步', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('varying float vWuCaoAO;')
    expect(yuanMa).toContain('m.uniforms.uWuCaoAODu = { value: 0.55 }')
    expect(yuanMa).toContain("var caoFsMao = 'gl_FragColor=vec4(vGrassColor,1.0);'")
    expect(yuanMa).toContain('gl_FragColor=vec4(vGrassColor*(1.0-vWuCaoAO*uWuCaoAODu),1.0);')
    expect(yuanMa).toContain('vWuCaoAO=clamp(wuA*1.05+wuAoYuan*0.5,0.0,1.0);')
    expect(yuanMa).toContain('caiZhi.uWuCaoAODu.value = tiao.aoDu != null ? tiao.aoDu : LI_TI.aoQiangDu')
  })

  it('构图终值对齐最终效果图（FP-12 billboard 复核，禁止 drift 回旧俯卧锚点）', () => {
    const yuanMa = duQuCaoDi()
    // FP-12 定案：锚点 (4.48,3.63)（屏幕左移 40px 解析算出）、尺寸乘数 0.32（缩 1/5 治悬空）
    expect(yuanMa).toContain('weiZhi:  { x: 4.48, y: -0.0133, z: 3.63 }')
    expect(yuanMa).toContain('chiCun:  2.55')
    expect(yuanMa).toContain('chiCunBeiShu: 0.32')
    // 地面层参数保留（阴影投影/压草场身体轴用），禁止当角色姿态调
    expect(yuanMa).toContain('qingJiao: 10, pianHang: 240')
    // 旧俯卧构图终值禁止回潮（billboard 下会把角色顶到树后高处且必然压扁）
    expect(yuanMa).not.toContain('weiZhi:  { x: 2.9, y: -0.0133, z: 2.92 }')
    expect(yuanMa).not.toContain('weiZhi:  { x: 4.62, y: -0.0133, z: 3.47 }')
    expect(yuanMa).not.toContain('chiCunBeiShu: 1 }')
  })

  it('FP-11 比例保真 billboard：法线每帧对准镜头 + flipY/镜像构图钉死', () => {
    const yuanMa = duQuCaoDi()
    // 核心不变式【用户裁定】比例永不可改：billboard 是唯一数学正解
    // （平面⟂视线 ⇒ 投影=纯等比缩放；俯卧贴地在低机位下必然压扁，已废弃为兜底）
    expect(yuanMa).toContain('function mianXiangJingTou(m)')
    // 每帧驱动：tongBu 内调用（唯一 rotation 写入点），创建时失败回退 guDingChaoXiang
    expect(yuanMa).toContain('mianXiangJingTou(mesh); // FP-11：法线每帧对准镜头')
    expect(yuanMa).toContain('if (!mianXiangJingTou(mesh)) guDingChaoXiang(mesh);')
    // 朝向数学钉死：水平 atan2(dx,dz) + 俯仰 -atan2(dy,水平距)，绕铰链 YXZ 序
    expect(yuanMa).toContain('m.rotation.y = Math.atan2(dx, dz);')
    expect(yuanMa).toContain('m.rotation.x = -Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));')
    // 贴图纵向翻转默认 true（图像底行=头侧落铰链边=画面下方）+ 水平镜像默认 true
    // （贴合效果图"头右下/脚左上"构图，像素/比例零改动）
    expect(yuanMa).toContain('var TIE_TU_FLIP_Y = true;')
    expect(yuanMa).toContain('var TIE_TU_JING_XIANG = true;')
    expect(yuanMa).toContain('if (TIE_TU_JING_XIANG) { tex.repeat.x = -1; tex.offset.x = 1; }')
    // 压伏 mask 与 plane map 同签 flipY（轮廓场沿身体轴映射自洽，方向梯度自洽）
    expect(yuanMa).toContain('maskKeLong.flipY = TIE_TU_FLIP_Y;')
    // 俯卧朝向仅作兜底存在，禁止复活为默认路径
    expect(yuanMa).not.toContain('guDingChaoXiang(mesh); // 固定朝向一次性设置')
  })

  it('FP-12 地面层跟随 billboard：阴影片与压草场均按实时姿态推导（贴地不脱节）', () => {
    const yuanMa = duQuCaoDi()
    // 阴影片：统一几何入口（后仰 sin 修正 + 后仰侧偏移 + 贴地 epsilon），创建与每帧共用
    expect(yuanMa).toContain('function gengXinYinYing()')
    expect(yuanMa).toContain('var changTou = 2 * s * Math.sin(e);')
    expect(yuanMa).toContain('var touX = -Math.sin(psi), touZ = -Math.cos(psi);')
    // 每帧同步（在呼吸微动之前刷新基准，避免被旧基准覆盖）
    expect(yuanMa).toContain('gengXinYinYing();')
    // 压草场：投影长/投影轴改读 billboard 实时角度，不再吃 CAN_SHU 俯卧姿态
    expect(yuanMa).toContain('touYingChang = touYingKuan * Math.sin(Math.max(0, -(mesh.rotation.x || 0)))')
    expect(yuanMa).toContain('caiZhi.uCharYaw.value = mesh.rotation.y')
    // FP-12 去依赖：uCharPos 是 vec2（.x/.y 直读），不再强依赖 __fuZhenSanWei 反构的
    // THREE.Vector2——该出口在部分环境永不解析，会把整条压弯注入静默掐死（草永不被压）
    expect(yuanMa).toContain('m.uniforms.uCharPos = { value: { x: yaWanZhongXin.x, y: yaWanZhongXin.z } }')
    expect(yuanMa).not.toContain('new THREE.Vector2(yaWanZhongXin')
  })

  it('父页预载深度贴图（App.vue 双图预载）', () => {
    const appVue = fs.readFileSync(path.resolve(process.cwd(), 'src', 'App.vue'), 'utf-8')
    expect(appVue).toContain("shenDuTu.src = '/grass-bg/wuhaoyang-3d.png'")
    expect(appVue).toContain("huanCun.add('/grass-bg/wuhaoyang-3d.png')")
  })
})
