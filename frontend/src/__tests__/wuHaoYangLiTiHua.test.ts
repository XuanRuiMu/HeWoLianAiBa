import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function duQuCaoDi(): string {
  const wenJian = path.resolve(process.cwd(), 'public', 'grass-bg', 'grass-bg.html')
  return fs.readFileSync(wenJian, 'utf-8')
}

/* FP-R2 吴昊阳立体化链路冗余清除：
   深度浮雕（LI_TI 顶点位移/片元视差/法线重光照 + wuhaoyang-3d 预载）已整段删除。
   本文件其余不变式仍钉：GANG_TI 参考保留、细分几何、DI_BIAN、billboard 比例、
   接触 AO / 压伏场 / 阴影片、FP-R1 全身足迹（禁止回退 sin 压缩）。 */
describe('FP-10 吴昊阳立体化', () => {
  it('FP-R2 深度浮雕链路零残留：无 LI_TI / zaiRuShenDu / wuhaoyang-3d 引用', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).not.toContain('var LI_TI')
    expect(yuanMa).not.toContain('LI_TI_DING_DIAN')
    expect(yuanMa).not.toContain('LI_TI_PIAN_YUAN')
    expect(yuanMa).not.toContain('LI_TI_SHI_CHA_TI')
    expect(yuanMa).not.toContain('LI_TI_MAP_TI')
    expect(yuanMa).not.toContain('LI_TI_GUANG_TI')
    expect(yuanMa).not.toContain('LI_TI_ZHU_TI')
    expect(yuanMa).not.toContain('function zaiRuShenDu')
    expect(yuanMa).not.toContain('wuhaoyang-3d')
    expect(yuanMa).not.toContain('wu-liTi')
    expect(yuanMa).not.toContain('uWuShenDu')
    expect(yuanMa).not.toContain('__wuLiTi')
    expect(yuanMa).not.toContain('liTi.tongYi')
    // URL 强开保持删除
    expect(yuanMa).not.toContain("duQuURLShuZhi('wuLiTi')")
    expect(yuanMa).not.toContain("duQuURLShuZhi('wuDepth')")
    expect(yuanMa).not.toContain("duQuURLShuZhi('wuShiCha')")
    expect(yuanMa).not.toContain("duQuURLShuZhi('wuAO')")
    expect(yuanMa).not.toContain("duQuURLShuZhi('wuGuangQiang')")
  })

  it('FP-R2 页头无 wuhaoyang-3d preload（unused-preload 根因已除）', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).not.toContain('rel="preload" href="/grass-bg/wuhaoyang-3d.png"')
    expect(yuanMa).toContain('rel="preload" href="/grass-bg/wuhaoyang-2d.png"')
  })

  it('GANG_TI 刚体立体化：配置集中 + 贴地写入点叠加呼吸 + 每帧 transform 驱动', () => {
    const yuanMa = duQuCaoDi()
    // 刚体配置集中一处（【用户裁定】qiYong=false：缩放脉动改变角色比例被禁，
    // 角色时时刻刻保持原 2D 图比例；代码保留供后续非比例类方案参考）
    expect(yuanMa).toContain('var GANG_TI = { qiYong: false, fuDu: 0.01, suoFang: 0.004, yaoYe: 0.006 }')
    // 呼吸浮动融入 FP-06 唯一 y 写入点（避免独立写入被健康监测覆盖），与阴影片同源同频 sin
    expect(yuanMa).toContain('mesh.position.y = ceXin - chenRu2 + (GANG_TI.qiYong ? Math.sin((Date.now() - gongYong.t0) / 1000 * 0.9) * GANG_TI.fuDu : 0)')
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

  it('onBeforeCompile 只剩底边渐隐注入，深度浮雕三段 GLSL 已删', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('mat.onBeforeCompile = function (sq)')
    expect(yuanMa).toContain('mat.customProgramCacheKey = function ()')
    expect(yuanMa).toContain("return 'wu-diBian-v1'")
    expect(yuanMa).not.toContain('wu-liTi-v1')
    // 深度位移/视差/重光照片段零残留
    expect(yuanMa).not.toContain('transformed.z += wuShenD')
    expect(yuanMa).not.toContain('vec2 wuUv2 = vMapUv')
    expect(yuanMa).not.toContain('diffuseColor.rgb *= mix(vec3(1.0), wuGuang')
    expect(yuanMa).not.toContain('for (var uk in liTi.tongYi)')
  })

  it('人物/mask/阴影片仍走引擎同类拆源克隆（keLongDuLi 保留）', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('function keLongDuLi(yuan, tuPian)')
    // 与人物贴图共用 donor，严禁第二纹理源；深度贴图加载器已删
    expect(yuanMa.match(/keLongDuLi\(yuan, /g) || []).not.toHaveLength(0)
    expect(yuanMa).not.toContain("st.src = '/grass-bg/wuhaoyang-3d.png'")
  })

  it('FP-R2 每帧驱动无 liTi 块；主线同步（yaw/足迹/压弯）仍在', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).not.toContain('liTi.tongYi.uWuShenDuKai')
    expect(yuanMa).not.toContain('liTi.zhouYiTiQu')
    expect(yuanMa).not.toContain('LI_TI_ZHU_TI[')
    // flipY 预签注释不得再指向已删的深度法线图路径（实现仍钉 mask/plane 同签）
    expect(yuanMa).toContain('maskKeLong.flipY = TIE_TU_FLIP_Y;')
  })

  it('草地接触 AO：varying 传递 + 片元压暗 + uniforms 同步', () => {
    const yuanMa = duQuCaoDi()
    expect(yuanMa).toContain('varying float vWuCaoAO;')
    expect(yuanMa).toContain('m.uniforms.uWuCaoAODu = { value: 0.55 }')
    expect(yuanMa).toContain("var caoFsMao = 'gl_FragColor=vec4(vGrassColor,1.0);'")
    expect(yuanMa).toContain('gl_FragColor=vec4(vGrassColor*(1.0-vWuCaoAO*uWuCaoAODu),1.0);')
    expect(yuanMa).toContain('vWuCaoAO=clamp(wuA*1.05+wuAoYuan*0.5+wuWai*0.35,0.0,1.0);')
    // FP-13：接触 AO 随 reveal 淡入；强度源=独立 CAO_AO_QIANG_DU（原 LI_TI.aoQiangDu）
    expect(yuanMa).toContain('var CAO_AO_QIANG_DU = 0.85')
    expect(yuanMa).toContain('caiZhi.uWuCaoAODu.value = (tiao.aoDu != null ? tiao.aoDu : CAO_AO_QIANG_DU) * bu')
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
    // 阴影片：统一几何入口（FP-R1 全身足迹 + 身体轴方向 + 贴地 epsilon），创建与每帧共用
    expect(yuanMa).toContain('function gengXinYinYing()')
    expect(yuanMa).toContain('var changTou = 2 * s * zuChangXiY;')
    expect(yuanMa).not.toContain('var changTou = 2 * s * Math.sin(e);')
    expect(yuanMa).toContain('var touX = -Math.sin(psi), touZ = -Math.cos(psi);')
    // 每帧同步（在呼吸微动之前刷新基准，避免被旧基准覆盖）
    expect(yuanMa).toContain('gengXinYinYing();')
    // 压草场：投影长=全身足迹（FP-R1），投影轴改读 billboard 实时角度
    expect(yuanMa).toContain('var touYingChang = PEI_ZHI.chiCun * CAN_SHU.chiCunBeiShu * zuChangXi;')
    expect(yuanMa).toContain('caiZhi.uCharYaw.value = mesh.rotation.y')
    // FP-12 去依赖：uCharPos 是 vec2（.x/.y 直读），不再强依赖 __fuZhenSanWei 反构的
    // THREE.Vector2——该出口在部分环境永不解析，会把整条压弯注入静默掐死（草永不被压）
    expect(yuanMa).toContain('m.uniforms.uCharPos = { value: { x: yaWanZhongXin.x, y: yaWanZhongXin.z } }')
    expect(yuanMa).not.toContain('new THREE.Vector2(yaWanZhongXin')
    // FP-14：纯 {x,y} 还需 toArray——three 的 vec2 上传会调它，缺了会每帧抛 TypeError
    expect(yuanMa).toContain('m.uniforms.uCharPos.value.toArray = function (a)')
  })

  it('FP-13 伪3D深化：风动抑制 / 前景草带 / 底边渐隐 / 压伏淡入 / 中心对准', () => {
    const yuanMa = duQuCaoDi()
    // ① 身下草风动抑制：注入段位于风之后、压弯之前，按被压度把朝向拉回无风朝向
    expect(yuanMa).toContain('finalGrassInclination=inclineVectorTowardSlerp(finalGrassInclination,terrainAdjustedNormal,clamp(wuYa*uCharFengYiZhi,0.0,1.0));')
    expect(yuanMa).toContain("'wuYa=clamp(wuNei+wuBian+wuWai*0.85,0.0,1.0);'")
    // ② 卡片前方窄带内的草朝身体弯折（草微微遮住角色），带头尾/两侧淡出
    expect(yuanMa).toContain("'float wuQianFu=-wuZhou;'")
    expect(yuanMa).toContain("'charInfl=clamp(wuNei*uCharNeiQiangDu+wuBian*charInfl+wuWai*uCharWaiFan,0.0,1.0);'")
    // 新增三项 uniform 声明 + 注入 + 每帧同步
    expect(yuanMa).toContain('uniform float uCharFengYiZhi;uniform float uCharQianJingChang;uniform float uCharQianJingQiang;')
    expect(yuanMa).toContain('m.uniforms.uCharFengYiZhi = { value: YA_WAN.fengYiZhi };')
    expect(yuanMa).toContain('caiZhi.uCharQianJingQiang.value = tiao.qianJingQiang != null ? tiao.qianJingQiang : gongYong.YA_WAN.qianJingQiang;')
    // ③ 底边渐隐：只改 alpha，不动几何；cache key 固定 wu-diBian-v1（深度浮雕键已删）
    expect(yuanMa).toContain("var DI_BIAN_JIAN_YIN_TI = 'diffuseColor.a*=smoothstep(0.0,max(uWuDiBianJianYin,0.0001),vMapUv.y);\\n'")
    expect(yuanMa).toContain("sq.uniforms.uWuDiBianJianYin = { value: DI_BIAN.jianYin }")
    expect(yuanMa).toContain("return 'wu-diBian-v1'")
    // ④ 压伏与接触 AO 随揭示进度淡入（草是逐渐被趴下去的）
    expect(yuanMa).toContain('caiZhi.uCharStrength.value = zuiZhong * bu;')
    expect(yuanMa).toContain('caiZhi.uWuCaoAODu.value = (tiao.aoDu != null ? tiao.aoDu : CAO_AO_QIANG_DU) * bu;')
    // ⑤ billboard 对准基准点改卡片中心（迭代两轮收敛），比例红线不变
    expect(yuanMa).toContain('for (var ci = 0; ci < 2; ci++) {')
    expect(yuanMa).toContain('var ux = Math.sin(m.rotation.x) * Math.sin(m.rotation.y);')
    // 配置集中且默认开启 + FP-R1 接触物理层参数
    expect(yuanMa).toContain('fengYiZhi: 1.0, qianJingChang: 0.32, qianJingQiang: 0.7, yaSui: 0.04, chuanTou: 1.0, zaSheng: 0.4,')
    expect(yuanMa).toContain('zuKuanXi: 1.0, zuChangXi: 1.0,')
    expect(yuanMa).toContain('waiHuan: 0.3, waiSui: 0.14, waiFan: 0.85,')
    expect(yuanMa).toContain('qianGao: 3.0, qianQing: 0.55, qianXi: 0.08 };')
    expect(yuanMa).toContain('var DI_BIAN = { jianYin: 0.035 };')
  })

  it('FP-14 物理深化：体重钉死 / 压塌 / 稀疏倒伏回盖 / 轮廓阴影 / 微沉', () => {
    const yuanMa = duQuCaoDi()
    // ① 体重钉死：身下草切断鼠标弯折贴图（bending 贴图读入后归零），风抑制保留
    expect(yuanMa).toContain("'bendingIntensity=bendingIntensity*(1.0-step(0.40,wuPin));'")
    expect(yuanMa).toContain("'bendingDirection=mix(bendingDirection,charDir,max(charInfl*0.9,wuYa));'")
    // ② 体重压塌：身下/轮廓内草高压到近贴地；外环明显变矮（FP-R1 waiSui）
    expect(yuanMa).toContain("'float wuYaSui=mix(1.0,uCharYaSui,wuYa);'")
    expect(yuanMa).toContain("'float wuWaiSui=mix(1.0,uCharWaiSui,wuWai);'")
    expect(yuanMa).toContain("'grassScale*=(wuYaSui*wuWaiSui*(1.0+wuGai*uCharQianGao));'")
    // ③ 周身倒伏回盖：轮廓边+外环+身前全覆盖，高草向身体倒
    expect(yuanMa).toContain("'float wuGaiZhou=clamp(max(max(wuBian*1.2,wuWai),wuQianRou*1.1),0.0,1.0);'")
    expect(yuanMa).toContain("'float wuGai=wuGaiZhou*step(uCharQianXi,wuHash);'")
    // ⑤ 倒伏带自然起伏
    expect(yuanMa).toContain("'wuQianRou*=mix(1.0-uCharZaSheng,1.0,wuZao);'")
    // ④ 轮廓形接触阴影（人物剪影软接触痕，回退径向渐变）
    expect(yuanMa).toContain('chuangJianYinYing(tuPian);')
    expect(yuanMa).toContain('youJianYing')
    // ⑥ 体重微沉（只改位置 y，比例零改动）；阴影 y 用草根高度不随下沉
    expect(yuanMa).toContain('var WEI_CHEN = { biLi: 0.018 };')
    expect(yuanMa).toContain('mesh.position.set(PEI_ZHI.weiZhi.x, yaoGaoDu - chenRu, PEI_ZHI.weiZhi.z);')
    expect(yuanMa).toContain('(dangQianGaoDu != null ? dangQianGaoDu : mesh.position.y) + YIN_YING.eP')
    // 新 uniform 全链路
    expect(yuanMa).toContain('uniform float uCharYaSui;uniform float uCharChuanTou;uniform float uCharZaSheng;')
    expect(yuanMa).toContain('m.uniforms.uCharYaSui = { value: YA_WAN.yaSui };')
    expect(yuanMa).toContain('caiZhi.uCharYaSui.value = tiao.yaSui != null ? tiao.yaSui : gongYong.YA_WAN.yaSui;')
  })

  it('FP-R1 接触物理层根因：全身足迹场长 / 压塌环 / 高草微搭 / 阴影同尺度', () => {
    const yuanMa = duQuCaoDi()
    // H1 根因：场长=全身足迹（与卡高同量级），不再乘 sin(后仰角)
    expect(yuanMa).toContain('var touYingChang = PEI_ZHI.chiCun * CAN_SHU.chiCunBeiShu * zuChangXi;')
    expect(yuanMa).not.toContain('touYingKuan * Math.sin(Math.max(0, -(mesh.rotation.x || 0)))')
    // H5：阴影长同足迹尺度，不再 sin 压缩
    expect(yuanMa).toContain('var changTou = 2 * s * zuChangXiY;')
    expect(yuanMa).not.toContain('2 * s * Math.sin(e)')
    // H4：轮廓外压塌环（mask 膨胀采样 → wuWai；明显变矮 waiSui + 外翻 waiFan）
    expect(yuanMa).toContain("'float wuHuanR=max(uCharWaiHuan,0.001);'")
    expect(yuanMa).toContain("'wuWai=clamp(wuWaiNei-wuNei,0.0,1.0);'")
    expect(yuanMa).toContain("'charInfl=clamp(wuNei*uCharNeiQiangDu+wuBian*charInfl+wuWai*uCharWaiFan,0.0,1.0);'")
    expect(yuanMa).toContain("'wuYa=clamp(wuNei+wuBian+wuWai*0.85,0.0,1.0);'")
    // H3：周身倒伏草中等倾角微搭身体（不是压平）
    expect(yuanMa).toContain("'bendingIntensity=mix(bendingIntensity,clamp(uCharQianQing,0.0,1.0),wuGai);'")
    expect(yuanMa).toContain("'bendingDirection=mix(bendingDirection,wuGaiDir,wuGai);'")
    expect(yuanMa).not.toContain("'charInfl=max(charInfl,wuQianRou*uCharQianJingQiang);}'")
    // 新 uniform 全链路：声明 + 注入初值 + 每帧同步（__yaWanTiao 可覆盖）
    expect(yuanMa).toContain('uniform float uCharWaiHuan;uniform float uCharWaiSui;uniform float uCharWaiFan;')
    expect(yuanMa).toContain('uniform float uCharQianGao;uniform float uCharQianQing;uniform float uCharQianXi;')
    expect(yuanMa).toContain('m.uniforms.uCharWaiHuan = { value: YA_WAN.waiHuan };')
    expect(yuanMa).toContain('m.uniforms.uCharQianQing = { value: YA_WAN.qianQing };')
    expect(yuanMa).toContain('caiZhi.uCharWaiHuan.value = tiao.waiHuan != null ? tiao.waiHuan : gongYong.YA_WAN.waiHuan;')
    expect(yuanMa).toContain('caiZhi.uCharQianQing.value = tiao.qianQing != null ? tiao.qianQing : gongYong.YA_WAN.qianQing;')
    // 身下草钉死保留：无风、无鼠标弯折、高度近 0
    expect(yuanMa).toContain("'bendingIntensity=bendingIntensity*(1.0-step(0.40,wuPin));'")
    expect(yuanMa).toContain("'finalGrassInclination=inclineVectorTowardSlerp(finalGrassInclination,terrainAdjustedNormal,clamp(wuYa*uCharFengYiZhi,0.0,1.0));'")
  })

  it('FP-R2 父页只预载 wuhaoyang-2d，深度图预载/入缓存已删', () => {
    const appVue = fs.readFileSync(path.resolve(process.cwd(), 'src', 'App.vue'), 'utf-8')
    expect(appVue).toContain("tu.src = '/grass-bg/wuhaoyang-2d.png'")
    expect(appVue).toContain("huanCun.add('/grass-bg/wuhaoyang-2d.png')")
    expect(appVue).not.toContain('wuhaoyang-3d')
    expect(appVue).not.toContain('shenDuTu')
  })
})
