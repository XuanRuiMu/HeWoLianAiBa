import type { Server } from 'socket.io'
import { yunXingAIYinQing } from './AI引擎'
import { pingPanHaoGanDuBianHua } from './好感度评判'
import { gengXinHaoGanDu, huoQuWanZhengHaoGanDu } from './好感度'
import {
  baoCunJiaoSeXiaoXi,
  huoQuAIJiaoSeXinXi,
  huoQuZuiJinDuiHuaLiShi,
} from './AI输入准备'
import { cheHuiJiaoSeXiaoXi } from './消息'
import {
  jianCeYongHuXiaoXiBingChuLi,
  chuLiAIHuiFuHouJieShuJianCha,
} from './胜利失败条件'
import { jiaoSeShiFouBeiDuoShe } from './夺舍'
import type {
  AIYinQingShuChu,
  AIYinQingShuRu,
} from '../types'
import type { XiaoXiXinXi } from './消息'

export interface AIHuiFuXiaoXiShiJian {
  角色ID: string
  消息列表: XiaoXiXinXi[]
}

const DENG_DAI_BIAO_BAI_GUO_QI_SHI_JIAN = 30 * 60 * 1000

interface DengDaiBiaoBaiHuiFuZhuangTai {
  deng_dai_zhong: boolean
  chuang_jian_shi_jian: number
}

const dengDaiBiaoBaiHuiFuMap = new Map<string, DengDaiBiaoBaiHuiFuZhuangTai>()

function shengChengDengDaiBiaoBaiJian(yong_hu_id: string, jiao_se_id: string): string {
  return `${yong_hu_id}:${jiao_se_id}`
}

function qingChuGuoQiDengDaiZhuangTai(): void {
  const xianZai = Date.now()
  for (const [jian, zhuangTai] of dengDaiBiaoBaiHuiFuMap.entries()) {
    if (xianZai - zhuangTai.chuang_jian_shi_jian > DENG_DAI_BIAO_BAI_GUO_QI_SHI_JIAN) {
      dengDaiBiaoBaiHuiFuMap.delete(jian)
    }
  }
}

export class AI回复调度器 {
  private 计时器: NodeJS.Timeout | null = null
  private 当前处理ID = 0
  private 取消控制器: AbortController | null = null
  private 处理中 = false

  constructor(
    private readonly 角色ID: string,
    private readonly 用户ID: string,
    private readonly IE类型: 'I' | 'E',
    private readonly io: Server,
  ) {}

  处理用户消息(): Promise<void> {
    this.重置()
    return this.检测用户消息并决定后续()
  }

  重置(): void {
    if (this.计时器) {
      clearTimeout(this.计时器)
      this.计时器 = null
    }
    if (this.取消控制器) {
      this.取消控制器.abort()
      this.取消控制器 = null
    }
  }

  是否处理中(): boolean {
    return this.处理中
  }

  private async 检测用户消息并决定后续(): Promise<void> {
    try {
      const [角色, 好感度, 历史消息] = await Promise.all([
        huoQuAIJiaoSeXinXi(this.角色ID),
        huoQuWanZhengHaoGanDu(this.用户ID, this.角色ID),
        huoQuZuiJinDuiHuaLiShi(this.用户ID, this.角色ID, 20),
      ])

      if (!角色) {
        return
      }

      const 最新用户消息 = this.获取最新用户消息(历史消息)
      if (!最新用户消息) {
        this.启动AI计时器()
        return
      }

      const 等待表白回复 = this.是否等待表白回复()
      const jieShuJieGuo = await jianCeYongHuXiaoXiBingChuLi(
        this.用户ID,
        this.角色ID,
        最新用户消息,
        好感度?.zong_fen || 0,
        等待表白回复,
        角色,
      )

      if (jieShuJieGuo) {
        this.清除等待表白回复状态()
        return
      }

      if (等待表白回复) {
        this.清除等待表白回复状态()
      }

      this.启动AI计时器()
    } catch (cuoWu) {
      console.error('用户消息检测失败', cuoWu)
      this.启动AI计时器()
    }
  }

  private 启动AI计时器(): void {
    this.计时器 = setTimeout(() => {
      this.计时器 = null
      void this.触发AI处理()
    }, 10000)
  }

  private 是否等待表白回复(): boolean {
    qingChuGuoQiDengDaiZhuangTai()
    const jian = shengChengDengDaiBiaoBaiJian(this.用户ID, this.角色ID)
    const zhuangTai = dengDaiBiaoBaiHuiFuMap.get(jian)
    if (!zhuangTai) return false
    if (Date.now() - zhuangTai.chuang_jian_shi_jian > DENG_DAI_BIAO_BAI_GUO_QI_SHI_JIAN) {
      dengDaiBiaoBaiHuiFuMap.delete(jian)
      return false
    }
    return zhuangTai.deng_dai_zhong
  }

  private 设置等待表白回复状态(): void {
    dengDaiBiaoBaiHuiFuMap.set(shengChengDengDaiBiaoBaiJian(this.用户ID, this.角色ID), {
      deng_dai_zhong: true,
      chuang_jian_shi_jian: Date.now(),
    })
  }

  private 清除等待表白回复状态(): void {
    dengDaiBiaoBaiHuiFuMap.delete(shengChengDengDaiBiaoBaiJian(this.用户ID, this.角色ID))
  }

  private async 触发AI处理(): Promise<void> {
    const beiDuoShe = await jiaoSeShiFouBeiDuoShe(this.角色ID)
    if (beiDuoShe) {
      this.处理中 = false
      return
    }

    this.处理中 = true
    const 处理ID = ++this.当前处理ID
    this.取消控制器 = new AbortController()
    const 信号 = this.取消控制器.signal

    try {
      this.io.to(this.用户ID).emit('对方正在输入', this.角色ID)

      const ai结果 = await this.运行AI()
      if (信号.aborted || 处理ID !== this.当前处理ID) return

      if (ai结果.shi_fou_che_hui) {
        await cheHuiJiaoSeXiaoXi({ yong_hu_id: this.用户ID, jiao_se_id: this.角色ID })
      }

      if (!ai结果.shi_fou_hui_fu || ai结果.xiao_xi_lie_biao.length === 0) {
        this.io.to(this.用户ID).emit('角色回复', {
          角色ID: this.角色ID,
          消息列表: [],
        })
        return
      }

      if (ai结果.ce_lue?.shi_fou_zhu_dong_biao_bai) {
        const 表白消息 = ai结果.xiao_xi_lie_biao[0]
        if (表白消息) {
          await this.处理AI主动表白(表白消息)
          return
        }
      }

      const 消息列表 = ai结果.xiao_xi_lie_biao.slice(0, 5)
      await this.发送消息列表(消息列表, 信号, 处理ID)
    } catch (错误) {
      if (处理ID !== this.当前处理ID) return
      console.error('AI处理失败', 错误)
      this.io.to(this.用户ID).emit('角色回复', {
        角色ID: this.角色ID,
        消息列表: [],
      })
    } finally {
      if (处理ID === this.当前处理ID) {
        this.处理中 = false
        this.取消控制器 = null
      }
    }
  }

  private async 处理AI主动表白(表白消息: string): Promise<void> {
    const 保存结果 = await baoCunJiaoSeXiaoXi({
      yong_hu_id: this.用户ID,
      jiao_se_id: this.角色ID,
      nei_rong: 表白消息,
    })

    this.设置等待表白回复状态()

    this.io.to(this.用户ID).emit('角色回复', {
      角色ID: this.角色ID,
      消息列表: [保存结果],
    })
  }

  private async 运行AI(): Promise<AIYinQingShuChu> {
    const [角色, 好感度, 历史消息] = await Promise.all([
      huoQuAIJiaoSeXinXi(this.角色ID),
      huoQuWanZhengHaoGanDu(this.用户ID, this.角色ID),
      huoQuZuiJinDuiHuaLiShi(this.用户ID, this.角色ID, 20),
    ])

    if (!角色) {
      throw new Error('角色不存在')
    }

    const 最新用户消息 = this.获取最新用户消息(历史消息)
    const 是第一轮 = !历史消息.some((m) => m.fa_song_zhe_lei_xing === 'jiaose')

    const 输入: AIYinQingShuRu = {
      yong_hu_id: this.用户ID,
      jiao_se_id: this.角色ID,
      jiao_se: 角色,
      hao_gan_du: 好感度 || {
        xin_ren_du: 0,
        qin_mi_du: 0,
        qu_wei_du: 0,
        guan_huai_du: 0,
        zong_fen: 0,
        guan_xi_jie_duan: 'lengDan',
      },
      dui_hua_li_shi: 历史消息,
      yong_hu_xin_xiao_xi: 最新用户消息,
      shi_fou_di_yi_lun: 是第一轮,
    }

    return yunXingAIYinQing(输入)
  }

  private 获取最新用户消息(历史消息: Array<{ fa_song_zhe_lei_xing: string; nei_rong: string }>): string {
    for (let i = 历史消息.length - 1; i >= 0; i--) {
      if (历史消息[i].fa_song_zhe_lei_xing === 'yonghu') {
        return 历史消息[i].nei_rong
      }
    }
    return ''
  }

  private async 发送消息列表(
    消息列表: string[],
    信号: AbortSignal,
    处理ID: number,
  ): Promise<void> {
    const 最新用户消息 = this.获取最新用户消息(await huoQuZuiJinDuiHuaLiShi(this.用户ID, this.角色ID, 20))

    for (let i = 0; i < 消息列表.length; i++) {
      if (信号.aborted || 处理ID !== this.当前处理ID) return
      if (i > 0) {
        await this.等待间隔(信号)
        if (信号.aborted || 处理ID !== this.当前处理ID) return
      }

      const 保存结果 = await baoCunJiaoSeXiaoXi({
        yong_hu_id: this.用户ID,
        jiao_se_id: this.角色ID,
        nei_rong: 消息列表[i],
      })

      if (信号.aborted || 处理ID !== this.当前处理ID) return

      this.io.to(this.用户ID).emit('角色回复', {
        角色ID: this.角色ID,
        消息列表: [保存结果],
      })

      if (最新用户消息) {
        await this.更新好感度(最新用户消息, 消息列表[i])
        const jieShuJieGuo = await chuLiAIHuiFuHouJieShuJianCha(this.用户ID, this.角色ID)
        if (jieShuJieGuo) {
          this.清除等待表白回复状态()
          return
        }
      }
    }
  }

  private async 更新好感度(用户消息: string, 角色回复: string): Promise<void> {
    try {
      const 变化 = await pingPanHaoGanDuBianHua(用户消息, 角色回复, '对方')
      await gengXinHaoGanDu(this.用户ID, this.角色ID, 变化)
    } catch (错误) {
      console.error('更新好感度失败', 错误)
    }
  }

  private 计算间隔(): number {
    if (this.IE类型 === 'I') {
      return 1500 + Math.random() * 3000
    }
    return 400 + Math.random() * 1200
  }

  private async 等待间隔(信号: AbortSignal): Promise<void> {
    const 间隔 = this.计算间隔()
    const 开始时间 = Date.now()
    while (Date.now() - 开始时间 < 间隔) {
      if (信号.aborted) return
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
}
