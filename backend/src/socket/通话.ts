import type { Server } from 'socket.io'
import type { RenZhengSocket } from './认证'
import { yanZhengUUID } from '../utils/验证'
import { huoQuFanYi } from '../config/translations'
import { huoQuJiaoSeSuoYouZhe } from '../services/消息'
import {
  faQi,
  yongHuQuXiao,
  yongHuGuaDuan,
  sheZhiTongHuaIo,
  type TongHuaLeiXing,
} from '../services/通话'
import { jiLuSocketShiJian } from '../utils/debug日志'

const YUN_XU_LEI_XING: TongHuaLeiXing[] = ['yuYin', 'shiPin']

function quZiFuChuan(zhi: unknown): string {
  return typeof zhi === 'string' ? zhi : ''
}

export function chuShiHuaTongHuaSocket(io: Server): void {
  sheZhiTongHuaIo(io)

  io.on('connection', (socket: RenZhengSocket) => {
    const 用户ID = socket.yong_hu?.yongHuId
    if (!用户ID) {
      socket.disconnect(true)
      return
    }

    jiLuSocketShiJian('Socket连接', 用户ID, { socket_id: socket.id, shi_jian: 'tong_hua' })
    socket.join(用户ID)

    socket.on('通话邀请', async (shuJu: unknown, huiDiao?: (jieGuo: unknown) => void) => {
      try {
        const canShu = shuJu as { jiaoSeId?: unknown; leiXing?: unknown } | null
        const jiaoSeId = quZiFuChuan(canShu?.jiaoSeId)
        const leiXing = quZiFuChuan(canShu?.leiXing)

        if (!yanZhengUUID(jiaoSeId)) {
          huiDiao?.({ chengGong: false, tiShi: huoQuFanYi('tongHua', 'canShuBuHeFa') })
          return
        }
        if (!YUN_XU_LEI_XING.includes(leiXing as TongHuaLeiXing)) {
          huiDiao?.({ chengGong: false, tiShi: huoQuFanYi('tongHua', 'leiXingFeiFa') })
          return
        }

        const jiaoSe = await huoQuJiaoSeSuoYouZhe(jiaoSeId)
        if (!jiaoSe) {
          huiDiao?.({ chengGong: false, tiShi: huoQuFanYi('tongHua', 'jiaoSeBuCunZai') })
          return
        }
        if (jiaoSe.yong_hu_id !== 用户ID) {
          huiDiao?.({ chengGong: false, tiShi: huoQuFanYi('tongHua', 'wuQuanXian') })
          return
        }
        if (jiaoSe.shi_fou_feng_cun && !jiaoSe.ke_ji_xu_liao_tian) {
          huiDiao?.({ chengGong: false, tiShi: huoQuFanYi('tongHua', 'youXiYiJieShu') })
          return
        }

        const jieGuo = await faQi(用户ID, jiaoSeId, leiXing as TongHuaLeiXing)
        huiDiao?.(jieGuo)
      } catch (cuoWu) {
        console.error('通话邀请处理失败', cuoWu)
        huiDiao?.({ chengGong: false, tiShi: huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu') })
      }
    })

    socket.on('通话取消', async (shuJu: unknown, huiDiao?: (jieGuo: unknown) => void) => {
      try {
        const tongHuaId = quZiFuChuan(
          (shuJu as { tongHuaId?: unknown } | null)?.tongHuaId,
        )
        if (!yanZhengUUID(tongHuaId)) {
          huiDiao?.({ chengGong: false, tiShi: huoQuFanYi('tongHua', 'canShuBuHeFa') })
          return
        }

        const jieGuo = await yongHuQuXiao(用户ID, tongHuaId)
        huiDiao?.(jieGuo)
      } catch (cuoWu) {
        console.error('通话取消处理失败', cuoWu)
        huiDiao?.({ chengGong: false, tiShi: huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu') })
      }
    })

    socket.on('通话挂断', async (shuJu: unknown, huiDiao?: (jieGuo: unknown) => void) => {
      try {
        const tongHuaId = quZiFuChuan(
          (shuJu as { tongHuaId?: unknown } | null)?.tongHuaId,
        )
        if (!yanZhengUUID(tongHuaId)) {
          huiDiao?.({ chengGong: false, tiShi: huoQuFanYi('tongHua', 'canShuBuHeFa') })
          return
        }

        const jieGuo = await yongHuGuaDuan(用户ID, tongHuaId)
        huiDiao?.(jieGuo)
      } catch (cuoWu) {
        console.error('通话挂断处理失败', cuoWu)
        huiDiao?.({ chengGong: false, tiShi: huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu') })
      }
    })

    socket.on('disconnect', () => {
      jiLuSocketShiJian('Socket断开', 用户ID, { socket_id: socket.id, shi_jian: 'tong_hua' })
    })
  })
}
