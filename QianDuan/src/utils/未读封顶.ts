import { huoQuFanYi } from '../config/翻译表'

export function weiDuFengDing(shu: number): string {
  return shu > 99 ? huoQuFanYi('tongYong', 'weiDuFengDing') : String(shu)
}
