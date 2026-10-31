
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SHI_LI =
  /(?:像「|比如「|例如「|就像「|"[^"]{1,20}"|“[^”]{1,20}”|「[^」]{1,20}」|比如[（(][^）)]{1,8}[）)])/g

const WU_YINHAO_LIE_JU = /(?:比如|例如|比方说|像是|就像)\s*[「“"']?[^「」“”"'，。！？、\s][^「」“”"'，。！？、\s]{0,5}/g

const CHENG_DU = /(偶尔|有时|一般|通常|大多|不少|可能会|适当时机|看情况|有时候)/
const DONG_ZUO = /(拖|带|加|写|用|发|垫|甩)/
const JIN_ZHI = /(别每条|不要每条|不用每句|别每句|别都|别一条里|别连着|别每轮|别硬凑)/
const XU_KI = /(可以用|想用就用|允许|可以写|就用|也正常|都可以|就(回|接着问|问|照实答)|照实答|你是知道的)/
const JIN_LING = /(别用|不要用|不许|禁止|别把|别拿)/

const LI_WAI: Array<{ guanJianZi: string; liYou: string }> = [
  { guanJianZi: '也正常', liYou: '第二十轮成果：授权「不接话/换话题」，真人本就如此（行为基线：常岔开常收住），必要保留' },
  { guanJianZi: '这种话命令自己', liYou: '禁令+反例：列的是「不许说的话」，不是可用的花样；去掉反例模型反而不知道禁的是哪种腔调' },
  { guanJianZi: '字段记法带进回复里', liYou: '禁令+反例：列的是格式字段，禁的是把格式抄进回复，属输出格式约束' },
  { guanJianZi: '类策略', liYou: '禁令+反例：列的是导演不许写的策略类型，属反向点名' },
  { guanJianZi: '只允许两种取值', liYou: '「允许」此处是枚举（true/false 二选一），不是行为许可，判据按字面误伤' },
]


function duQuWenJian(wen: string): string[] {
  const shiLi = (wen.match(SHI_LI) || []).length
  const chengDu = CHENG_DU.test(wen)
  const xuKi = XU_KI.test(wen)
  const jinZhi = JIN_ZHI.test(wen)
  const jinLing = JIN_LING.test(wen)
  const wuYinHao = (wen.match(WU_YINHAO_LIE_JU) || []).length
  const wenti: string[] = []
  if (xuKi && shiLi >= 2) wenti.push('许可型+例句')
  else if (xuKi && chengDu) wenti.push('许可型+程度副词')
  else if (shiLi >= 3) wenti.push('例句过多')
  if (wuYinHao >= 3) wenti.push('无引号列例')
  if (chengDu && DONG_ZUO.test(wen) && !jinLing) wenti.push('裸授权')
  if (xuKi && !jinZhi && !jinLing) wenti.push('有许可无禁止')
  if (jinLing && shiLi >= 1) wenti.push('禁令型+示范例句')
  return wenti
}

const ZI_CE: Array<{ ming: string; wen: string; yao: string[] }> = [
  { ming: '全角引号例句≥3（本轮第一层真实存在的形态）',
    wen: '对方问你什么，就答什么——“有没有资源”答“有”，问冷不冷答“冷死了”，问位置答位置，答完了再问回去也正常。',
    yao: ['许可型+例句'] },
  { ming: '1 字引号例句（本项目病灶域全是极短答）',
    wen: '用一句话接住就行，"嗯"、"哈"、"啊"、"行"都行。', yao: ['例句过多'] },
  { ming: '无引号列例≥3', wen: '接住就行，比如嗯，比如哈哈，比如好啊。', yao: ['无引号列例'] },
  { ming: '许可型+程度副词', wen: '可以用波浪号，偶尔拿来软化语气。', yao: ['许可型+程度副词'] },
  { ming: '裸授权：程度副词+动作、无许可词也无禁令词',
    wen: '句尾偶尔拖个 ~ 软化语气。', yao: ['裸授权'] },
  { ming: '有许可无禁止', wen: '可以用波浪号来软化语气。', yao: ['有许可无禁止'] },
  { ming: '禁令型+示范例句', wen: '别用「嗯」「哈哈」这种口水话当回复。', yao: ['禁令型+示范例句'] },
  { ming: '隐性许可型：就+动词（第二十八轮被漏报的那条）',
    wen: '同感就回一句同感的，不然就接着问他那件事别的。', yao: ['有许可无禁止'] },
  { ming: '隐性许可型：照实答',
    wen: '聊到你生活里真有的东西，你是知道的，照实答。', yao: ['有许可无禁止'] },
]

if (process.argv.includes('--自测')) {
  let si = 0
  for (const { ming, wen, yao } of ZI_CE) {
    const mingZhong = duQuWenJian(wen)
    const que = yao.filter((y) => !mingZhong.includes(y))
    if (que.length) {
      si += 1
      process.stdout.write(`  ✗ ${ming}\n      期望：${yao.join(' / ')}｜实得：${mingZhong.length ? mingZhong.join(' / ') : '（无）'}\n`)
    } else {
      process.stdout.write(`  ✓ ${ming} → ${mingZhong.join(' / ')}\n`)
    }
  }
  process.stdout.write(`\n判据自测：${ZI_CE.length} 条样例，${si} 条未按预期触发。\n`)
  if (si > 0) {
    process.stdout.write('⚠️ 有判据已经**沉默失效**（或换了判据名）。先修守卫，再谈它报的结论。\n')
    process.exit(1)
  }
  process.stdout.write('⚠️ 本自测只验证「判据活着且叫对名字」，不验证「判据写得对不对」；两者都要人看。\n')
  process.exit(0)
}

function qieZiMianLiang(yuan: string, qi: string, zhi: string): string[] {
  const a = yuan.indexOf(qi)
  if (a < 0) throw new Error('定位失败：找不到 ' + qi + '，Prompt构建器.ts 结构可能已变')
  const b = yuan.indexOf(zhi, a)
  if (b < 0) throw new Error('定位失败：找不到 ' + qi + ' 的结束标记 ' + zhi)
  return [yuan.slice(a, b)]
}

function loadGeCeng(): Array<{ 层: string; 段: string[] }> {
  const p = resolve(__dirname, '../src/services/Prompt构建器.ts')
  const yuan = readFileSync(p, 'utf8')
  const 层 = [
    { 层: '第一层·出话约束', 切片: qieZiMianLiang(yuan, 'function gouJianDiYiCeng', 'function gouJianDiErCeng') },
    { 层: '第五层·历史与指代', 切片: qieZiMianLiang(yuan, 'function gouJianDiWuCeng', 'function gouJianDiLiuCeng') },
    { 层: '第六层·你自己', 切片: qieZiMianLiang(yuan, 'function gouJianDiLiuCeng', 'const fengGeShiLiHuoQuCache') },
    { 层: '导演·策略约束', 切片: qieZiMianLiang(yuan, 'function gouJianDirectorPrompt', 'export function gouJianQingGanFenXiPrompt') },
    { 层: '第二层·人设事实', 切片: qieZiMianLiang(yuan, 'function gouJianDiErCeng', 'function gouJianDiSanCeng') },
    { 层: '第三/四层·处境与阶段', 切片: qieZiMianLiang(yuan, 'function gouJianDiSanCeng', 'function gouJianDiWuCeng') },
  ]
  const 出: Array<{ 层: string; 段: string[] }> = []
  const re = /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)\s*,?\s*$/gm
  for (const { 层: 名, 切片 } of 层) {
    const wen = 切片[0]
    const xian: string[] = []
    let m: RegExpExecArray | null
    re.lastIndex = 0
    while ((m = re.exec(wen)) !== null) xian.push(m[1] ?? m[2] ?? m[3] ?? '')
    if (xian.length === 0) throw new Error(名 + ' 切片出 0 条：切片正则没吃到任何字面量（引号形态变了？）')
    出.push({ 层: 名, 段: xian })
  }
  return 出
}

const GE_CENG = loadGeCeng()
const duan = GE_CENG.find((x) => x.层 === '第一层·出话约束')!.段
let QUAN_BU_CENG = duan.join('\n')
let zongShu = 0
const xian: string[] = []
const zhuTiJi = new Map<string, string[]>()
const liWaiJi = new Map<string, { guanJianZi: string; liYou: string }>()

GE_CENG.forEach(({ 层, 段 }) => {
 段.forEach((s, i) => {
  s = 层 + ' ' + s
  const wen = s.replace(/\\n/g, ' ').replace(/\\'/g, "'")
  const wenti = duQuWenJian(wen).map((t) =>
    t === '许可型+例句' ? `${t}(${(wen.match(SHI_LI) || []).length}处)`
    : t === '例句过多' ? `${t}(${(wen.match(SHI_LI) || []).length}处)`
    : t === '无引号列例' ? `${t}(${(wen.match(WU_YINHAO_LIE_JU) || []).length}处：「比如X」连着列＝当模板)`
    : t === '许可型+程度副词' ? `${t}（「偶尔」对模型无效，只会读到「可以用」）`
    : t === '裸授权' ? '程度副词+动作动词（裸授权句式：没写「可以」但意思是可以用）'
    : t === '有许可无禁止' ? '有许可无禁止（只说了可以用，没说别滥用）'
    : t === '禁令型+示范例句' ? `${t}(${(wen.match(SHI_LI) || []).length}处)`
    : t,
  )
  const xuKi = XU_KI.test(wen)
  if (xuKi) {
    for (const zhuTi of ['方括号', '波浪号|~', '简写', 'emoji|表情']) {
      if (new RegExp(zhuTi).test(wen)) {
        const k = zhuTi.split('|')[0]
        zhuTiJi.set(k, [...(zhuTiJi.get(k) || []), `#${i + 1}`])
      }
    }
  }
  const 已判例外 = LI_WAI.find((x) => wen.includes(x.guanJianZi))
  if (已判例外) liWaiJi.set(`${层} #${i + 1}`, 已判例外)
  const chuLi = 已判例外 ? [] : wenti
  if (chuLi.length === 0) return
  zongShu++
  xian.push(`    ${层} #${i + 1} ${chuLi.join(' / ')}\n      ${wen.slice(0, 110)}`)
 })
})

const ZONG_TIAO = GE_CENG.reduce((a, x) => a + x.段.length, 0)
process.stdout.write(`\n检查全部出话约束层（都会直接进模型 prompt）：` + GE_CENG.map((x) => x.层 + ' ' + x.段.length + '条').join('｜') + `，共 ${ZONG_TIAO} 条，命中 ${xian.length} 条\n`)
if (xian.length) process.stdout.write(xian.join('\n') + '\n')
for (const [k, v] of zhuTiJi) {
  if (v.length >= 2) {
    zongShu++
    process.stdout.write(`    ⚠️ 同一主题「${k}」被 ${v.length} 条约束授权：${v.join(' ')}\n       两条许可叠加会放大输出（第二十二轮 ~ 事故第二阶段）。\n`)
  }
}
for (const [hao, x] of liWaiJi) {
  process.stdout.write(`    ℹ️ ${hao} 命中但已登记例外（关键词「${x.guanJianZi}」）：${x.liYou}\n`)
}

const 回归集路径 = resolve(__dirname, '../../语料实验室/回归集.json')
let 回归缺失 = 0
let 回归残留 = 0
try {
  const ji = JSON.parse(readFileSync(回归集路径, 'utf8')) as {
    出话层必须存在: Array<{ 关键词: string; 管什么: string }>
    出话层必须不存在: Array<{ 关键词: string; 为什么: string }>
  }
  const quanWen = QUAN_BU_CENG
  process.stdout.write('\n回归集检查（语料实验室/回归集.json）：\n')
  for (const x of ji.出话层必须存在) {
    if (!quanWen.includes(x.关键词)) {
      回归缺失 += 1
      process.stdout.write(`  ✗ 缺失「${x.关键词}」——管：${x.管什么}\n`)
    } else {
      process.stdout.write(`  ✓ 在位「${x.关键词}」\n`)
    }
  }
  for (const x of ji.出话层必须不存在) {
    if (quanWen.includes(x.关键词)) {
      回归残留 += 1
      process.stdout.write(`  ✗ 残留「${x.关键词}」——为什么不该有：${x.为什么}\n`)
    } else {
      process.stdout.write(`  ✓ 已无「${x.关键词}」\n`)
    }
  }
  if (回归缺失 || 回归残留) {
    process.stdout.write(`\n⚠️ 回归集：缺失 ${回归缺失} 条、残留 ${回归残留} 条。\n`)
  }
} catch (e) {
  process.stdout.write(`\n⚠️ 回归集未加载（${String(e)}），跳过该项。\n`)
}

process.stdout.write(`\n合计命中 ${zongShu} 条（写法）；回归集缺失 ${回归缺失} 条、残留 ${回归残留} 条。\n`)
process.stdout.write('⚠️ 命中不等于违规，但「许可型 + 例句 + 程度副词」这个组合已被 `~` 实测证明会引发 6 倍过度使用。\n')
process.exit(zongShu > 0 || 回归缺失 > 0 || 回归残留 > 0 ? 1 : 0)
