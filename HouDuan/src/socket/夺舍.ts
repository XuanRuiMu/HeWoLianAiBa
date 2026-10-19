import type { Server } from 'socket.io'
import type { RenZhengSocket } from './认证'
import { 数据库 } from '../数据库'
import { baoCunJiaoSeXiaoXi } from '../services/AI输入准备'
import {
  sheZhiDuoSheZhuangTai,
  shanChuDuoSheZhuangTai,
  huoQuDuoSheGuanLiYuan,
  huoQuJiaoSeYongHuId,
  duoSheXinTiao,
  shiFangGuanLiYuanQuanBuDuoShe,
} from '../services/夺舍'
import { anYongHuIdJuBeiNengLi } from '../middleware/管理员'
import { debug日志, jiLuSocketShiJian, jiLuXiaoXiCaoZuo } from '../utils/debug日志'
import { yanZhengUUID, maDianChangDu } from '../utils/验证'
import { huoQuFanYi } from '../config/translations'

// 夺舍回复正文长度上限：按 Unicode 码点计数（emoji 计 1），与消息内容口径同一量纲，
// 防超长文本绕过校验直落库 / 广播
const DUO_SHE_HUI_FU_NEI_RONG_ZUI_DA_MA_DIAN = 2000

// FP-18 夺舍/归还等会话接管操作与 HTTP 侧 /api/管理/夺舍 同源，一律按 gao_we 授权
async function panDuanKeGaoWei(yongHuId: string): Promise<boolean> {
  try {
    return await anYongHuIdJuBeiNengLi(yongHuId, 'gao_we')
  } catch (cuoWu) {
    debug日志.error('夺舍Socket', '管理身份校验失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return false
  }
}

function shengChengDuoSheFangJian(jiao_se_id: string): string {
  return `duo_she:${jiao_se_id}`
}

export function chuShiHuaDuoSheSocket(io: Server): void {
  io.on('connection', (socket: RenZhengSocket) => {
    const yongHu = socket.yong_hu
    if (!yongHu) return

    void panDuanKeGaoWei(yongHu.yongHuId).then((keGaoWei) => {
      jiLuSocketShiJian('Socket连接', yongHu.yongHuId, { socket_id: socket.id, shi_jian: 'duo_she', neng_li_gao_wei: keGaoWei })
    })

    socket.on('夺舍', async (jiao_se_id: unknown, huiDiao?: (jieGuo: unknown) => void) => {
      if (!(await panDuanKeGaoWei(yongHu.yongHuId))) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: huoQuFanYi('duoShe', 'wuQuanCaoZuo') })
        return
      }
      if (!yanZhengUUID(jiao_se_id)) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: huoQuFanYi('duoShe', 'jiaoSeIdBuHeFa') })
        return
      }
      const jiaoSeId = jiao_se_id

      await sheZhiDuoSheZhuangTai(jiaoSeId, yongHu.yongHuId)
      socket.join(shengChengDuoSheFangJian(jiaoSeId))
      jiLuSocketShiJian('夺舍', yongHu.yongHuId, { jiao_se_id: jiaoSeId, socket_id: socket.id })
      if (huiDiao) huiDiao({ cheng_gong: true, jiao_se_id: jiaoSeId })
    })

    socket.on('归还', async (jiao_se_id: unknown, huiDiao?: (jieGuo: unknown) => void) => {
      if (!(await panDuanKeGaoWei(yongHu.yongHuId))) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: huoQuFanYi('duoShe', 'wuQuanCaoZuo') })
        return
      }
      if (!yanZhengUUID(jiao_se_id)) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: huoQuFanYi('duoShe', 'jiaoSeIdBuHeFa') })
        return
      }
      const jiaoSeId = jiao_se_id

      const dangQianGuanLiYuan = await huoQuDuoSheGuanLiYuan(jiaoSeId)
      if (dangQianGuanLiYuan !== yongHu.yongHuId) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: huoQuFanYi('duoShe', 'buShiDangQianDuoSheZhe') })
        return
      }

      await shanChuDuoSheZhuangTai(jiaoSeId)
      await 数据库.query(
        `UPDATE "夺舍日志" SET "结束时间" = NOW()
         WHERE "管理员ID" = $1 AND "角色ID" = $2 AND "结束时间" IS NULL`,
        [yongHu.yongHuId, jiaoSeId],
      )
      socket.leave(shengChengDuoSheFangJian(jiaoSeId))
      jiLuSocketShiJian('归还', yongHu.yongHuId, { jiao_se_id: jiaoSeId, socket_id: socket.id })
      if (huiDiao) huiDiao({ cheng_gong: true, jiao_se_id: jiaoSeId })
    })

    socket.on('夺舍心跳', async (jiao_se_id: unknown, huiDiao?: (jieGuo: unknown) => void) => {
      if (!(await panDuanKeGaoWei(yongHu.yongHuId))) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: huoQuFanYi('duoShe', 'wuQuanCaoZuo') })
        return
      }
      if (!yanZhengUUID(jiao_se_id)) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: huoQuFanYi('duoShe', 'jiaoSeIdBuHeFa') })
        return
      }
      const jiaoSeId = jiao_se_id
      const xuZu = await duoSheXinTiao(jiaoSeId, yongHu.yongHuId)
      if (huiDiao) huiDiao(xuZu ? { cheng_gong: true, jiao_se_id: jiaoSeId } : { cheng_gong: false, ti_shi: huoQuFanYi('duoShe', 'buShiDangQianDuoSheZhe') })
    })

    socket.on('开始输入', async (shuJu: unknown) => {
      if (!(await panDuanKeGaoWei(yongHu.yongHuId))) return
      const canShu = (typeof shuJu === 'object' && shuJu !== null ? shuJu : {}) as { jiao_se_id?: unknown }
      const jiaoSeId = canShu.jiao_se_id
      if (!yanZhengUUID(jiaoSeId)) return

      const yongHuId = await huoQuJiaoSeYongHuId(jiaoSeId)
      if (!yongHuId) return

      jiLuSocketShiJian('开始输入', yongHu.yongHuId, { jiao_se_id: jiaoSeId, mu_biao_yong_hu_id: yongHuId, socket_id: socket.id })
      io.to(yongHuId).emit('对方正在输入', jiaoSeId)
    })

    socket.on('夺舍回复', async (shuJu: unknown, huiDiao?: (jieGuo: unknown) => void) => {
      if (!(await panDuanKeGaoWei(yongHu.yongHuId))) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: huoQuFanYi('duoShe', 'wuQuanCaoZuo') })
        return
      }
      // 入参三重校验：类型 + UUID 白名单 + 长度。jiao_se_id / yong_hu_id 必须为合法 UUID，
      // nei_rong 必须为字符串且码点长度不超上限；任何一项不满足即拒绝，杜绝裸转型后的脏值落库。
      const canShu = (typeof shuJu === 'object' && shuJu !== null ? shuJu : {}) as {
        jiao_se_id?: unknown
        nei_rong?: unknown
        yong_hu_id?: unknown
      }
      const jiaoSeId = canShu.jiao_se_id
      const neiRong = canShu.nei_rong
      const muBiaoYongHuId = canShu.yong_hu_id
      if (
        !yanZhengUUID(jiaoSeId) ||
        !yanZhengUUID(muBiaoYongHuId) ||
        typeof neiRong !== 'string' ||
        maDianChangDu(neiRong) > DUO_SHE_HUI_FU_NEI_RONG_ZUI_DA_MA_DIAN
      ) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'canShuBuHeFa') })
        return
      }

      // 归属校验：yong_hu_id 由客户端自报是高危面（可借此把消息落到他人会话、广播到他人房间）。
      // socket 会话只推导出操作者（管理员）身份（见 panDuanKeGaoWei(yongHu.yongHuId)），目标用户
      // 一律以 jiao_se_id 反查服务端归属；自报值与真实归属不一致即越权，拒绝落库、拒绝广播。
      const suoYouZheId = await huoQuJiaoSeYongHuId(jiaoSeId)
      if (!suoYouZheId || suoYouZheId !== muBiaoYongHuId) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: huoQuFanYi('duoShe', 'wuQuanCaoZuoGaiJiaoSe') })
        return
      }

      try {
        const xiaoXi = await baoCunJiaoSeXiaoXi({ yong_hu_id: suoYouZheId, jiao_se_id: jiaoSeId, nei_rong: neiRong })
        io.to(suoYouZheId).emit('角色回复', { 角色ID: jiaoSeId, 消息列表: [xiaoXi] })
        jiLuXiaoXiCaoZuo('夺舍回复发送', suoYouZheId, jiaoSeId, 'jiaose', { socket_id: socket.id, guan_li_yuan_id: yongHu.yongHuId })
        if (huiDiao) huiDiao({ cheng_gong: true, xiao_xi: xiaoXi })
      } catch (cuoWu) {
        debug日志.error('夺舍Socket', '夺舍回复保存失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: huoQuFanYi('duoShe', 'baoCunShiBai') })
      }
    })

    socket.on('disconnect', () => {
      jiLuSocketShiJian('Socket断开', yongHu.yongHuId, { socket_id: socket.id, shi_jian: 'duo_she' })
      // YH-012 断线自动释放加审计：不断线不清会永久静默，断线即释放该管理员全部租约
      void shiFangGuanLiYuanQuanBuDuoShe(yongHu.yongHuId).then((shiFang) => {
        if (shiFang.length > 0) {
          jiLuSocketShiJian('夺舍断线释放', yongHu.yongHuId, { socket_id: socket.id, jiao_se_lie_biao: shiFang })
        }
      }).catch(() => undefined)
    })
  })
}

export async function zhuanFaYongHuXiaoXiGeiGuanLiYuan(
  io: Server,
  jiao_se_id: string,
  yong_hu_id: string,
  xiao_xi: unknown,
): Promise<void> {
  io.to(shengChengDuoSheFangJian(jiao_se_id)).emit('夺舍消息', {
    jiao_se_id,
    yong_hu_id,
    xiao_xi,
  })
}
