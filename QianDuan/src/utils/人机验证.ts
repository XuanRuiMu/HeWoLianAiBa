import { REN_JI_YAN_ZHENG_SHI_BAI_DAI_MA } from '@/config/人机验证'
import { 归一前台错误 } from '@/utils/前台错误'

export interface 人机测试实例 {
  biaoShiYanZhengShiBai: () => void
}

export function shiRenJiYanZhengShiBai(cuoWu: unknown): boolean {
  return 归一前台错误(cuoWu).houTaiBaoFeng?.code === REN_JI_YAN_ZHENG_SHI_BAI_DAI_MA
}
