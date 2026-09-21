// FP-04：合成消息身份唯一入口。不落库、仅经 socket 推送的系统提示以 id 作为
// 前端幂等去重键（stores/聊天.ts 的 jiaRuXiaoXi），只用时间戳会让同毫秒两条互相吞掉。
let xiTongTiShiXuHao = 0

export function shengChengXiTongTiShiId(): string {
  xiTongTiShiXuHao += 1
  return `sys-${Date.now()}-${xiTongTiShiXuHao}`
}
