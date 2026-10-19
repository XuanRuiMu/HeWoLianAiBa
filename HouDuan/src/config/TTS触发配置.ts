function duQuZhengShu(ming: string, moRen: number, zuiXiao: number, zuiDa: number): number {
  const yuan = parseInt(process.env[ming] || '', 10)
  if (!Number.isFinite(yuan)) return moRen
  return Math.max(zuiXiao, Math.min(zuiDa, yuan))
}

function duQuFuDian(ming: string, moRen: number, zuiXiao: number, zuiDa: number): number {
  const yuan = Number(process.env[ming])
  if (!Number.isFinite(yuan)) return moRen
  return Math.max(zuiXiao, Math.min(zuiDa, yuan))
}

function duQuCiBiao(ming: string, moRen: string[]): string[] {
  const yuan = process.env[ming]
  if (yuan === undefined || yuan.trim() === '') return moRen
  try {
    const jieXi = JSON.parse(yuan) as unknown
    if (Array.isArray(jieXi)) {
      const guoLv = jieXi.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      if (guoLv.length > 0) return guoLv
    }
  } catch {
  }
  return yuan.split(',').map((x) => x.trim()).filter((x) => x !== '')
}

const MO_REN_JIN_YONG = [
  '代码', '编程', '技术', '逻辑分析', '算法', '数据结构', '架构', '框架',
  'api', '接口', '数据库', 'sql', '函数', '变量', '类', '对象', '继承',
  '多态', '封装', '设计模式', '重构', '调试', '报错', '异常', '堆栈',
  '部署', '运维', '服务器', '容器', '微服务', '分布式', '并发', '锁',
  '事务', '索引', '查询优化', '缓存', '消息队列', '负载均衡',
]

const MO_REN_JIA_CHENG = [
  '表白', '告白', '喜欢', '爱', '道歉', '对不起', '抱歉', '晚安', '睡觉',
  '想你', '想念', '拥抱', '亲吻', '牵手', '陪伴', '守护', '珍惜', '心动',
  '感动', '温柔', '深情', '真心', '真诚', '承诺', '永远', '一辈子',
]

export const TTS_PEI_ZHI = {
  jiChuGaiLv: duQuFuDian('TTS_JI_CHU_GAI_LV', 0.1, 0, 1),
  gaiLvShangXian: duQuFuDian('TTS_GAI_LV_SHANG_XIAN', 0.95, 0, 1),
  gaiLvXiaXian: duQuFuDian('TTS_GAI_LV_XIA_XIAN', 0, 0, 1),
  douDongFuDu: duQuFuDian('TTS_DOU_DONG_FU_DU', 0.2, 0, 1),
  jiaChengXiShu: duQuFuDian('TTS_JIA_CHENG_XI_SHU', 2.0, 0, 10),
  jinYongGuanJianCi: duQuCiBiao('TTS_JIN_YONG_GUAN_JIAN_CI', MO_REN_JIN_YONG),
  jiaChengGuanJianCi: duQuCiBiao('TTS_JIA_CHENG_GUAN_JIAN_CI', MO_REN_JIA_CHENG),
  tuiSongZuiDaZiFu: duQuZhengShu('TTS_TUI_SONG_ZUI_DA_ZI_FU', 500, 1, 5000),
} as const

export type TTS触发场景 = 'biaoBai' | 'wanAn' | 'siNian' | 'daoQian' | 'riChang'

const CHANG_JING_BAI_MING_DAN: ReadonlySet<string> = new Set(['biaoBai', 'wanAn', 'siNian', 'daoQian', 'riChang'])

function guiFanChangJing(changJing: unknown): TTS触发场景 {
  if (typeof changJing === 'string' && CHANG_JING_BAI_MING_DAN.has(changJing)) return changJing as TTS触发场景
  return 'riChang'
}

export function shiTTSChangJingBaiMingDan(changJing: unknown): boolean {
  return typeof changJing === 'string' && CHANG_JING_BAI_MING_DAN.has(changJing)
}

export function panDingTTSChangJingYunXu(changJing: unknown): { yunXu: boolean; guiFanHou: TTS触发场景 } {
  const guiFanHou = guiFanChangJing(changJing)
  return { yunXu: true, guiFanHou }
}
