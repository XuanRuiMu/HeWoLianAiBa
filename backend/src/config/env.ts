import dotenv from 'dotenv'

let yiJinJiaZai = false

function shiFouMingQueYiZhuRu(): boolean {
  const mingQue = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET']
  return (
    (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') &&
    mingQue.every((ming) => (process.env[ming] ?? '').trim() !== '')
  )
}

export function jiaZaiHuanJing(): void {
  if (yiJinJiaZai) return
  yiJinJiaZai = true
  if (!shiFouMingQueYiZhuRu()) dotenv.config({ quiet: true })
}

jiaZaiHuanJing()
