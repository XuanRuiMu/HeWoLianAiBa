/// <reference types="node" />
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import {
  dengLiCuoWuXianRongLieBiao,
  huoQuCuoWuXianRong,
  shiCuoWuDaiMa,
  zhuanHuanJiuDaiMa,
  type CuoWuDaiMa,
} from '../src/config/错误码注册表'

const 后端根 = resolve(__dirname, '..')
const 注册表路径 = resolve(后端根, 'src', 'config', '错误码注册表.ts')

export const 错误码文档路径 = resolve(后端根, '..', 'docs', '错误码大全.md')

type 分类名 = '依赖' | '认证' | '数据' | '业务' | '网络' | 'Docker 启动' | '战绩' | '角色生成' | '管理'

const 分类顺序: readonly 分类名[] = [
  '依赖',
  '认证',
  '数据',
  '业务',
  '网络',
  'Docker 启动',
  '战绩',
  '角色生成',
  '管理',
]

export interface 错误码行 {
  码: CuoWuDaiMa
  状态: number
  文案: string
  可重试: boolean
  重试间隔毫秒: number | undefined
  分类: 分类名
}

export interface 旧码映射行 {
  旧码: string
  现码: CuoWuDaiMa
}

function quFenLei(码: CuoWuDaiMa, 界面: string): 分类名 {
  if (界面 === 'qiDong' || 码.startsWith('DOCKER_')) return 'Docker 启动'
  if (界面 === 'zhanJi') return '战绩'
  if (界面 === 'jiaoSe') return '角色生成'
  if (界面 === 'guanLiYuan' || 码.startsWith('ORIGIN_')) return '管理'
  if (码.startsWith('DEPENDENC') || 码.startsWith('SERVICE_')) return '依赖'
  if (码.startsWith('DATABASE_')) return '数据'
  if (码.startsWith('UPSTREAM_')) return '网络'
  if (码.startsWith('AUTH')) return '认证'
  return '业务'
}

export function duiQu全部错误码(): 错误码行[] {
  return dengLiCuoWuXianRongLieBiao.map((码) => {
    const 定义 = huoQuCuoWuXianRong(码)
    return {
      码,
      状态: 定义.httpStatus,
      文案: 定义.message,
      可重试: 定义.retryable,
      重试间隔毫秒: 定义.retryAfterMs,
      分类: quFenLei(码, 定义.jieMian),
    }
  })
}

export function duiQu旧码映射(): 旧码映射行[] {
  const 源 = readFileSync(注册表路径, 'utf8')
  const 声明 = [...源.matchAll(/const\s+\w+[^=]*Record<string,\s*CuoWuDaiMa>[^=]*=\s*\{([\s\S]*?)\n\}/g)]
  if (声明.length !== 1) {
    throw new Error(`注册表里的旧码映射声明解析到 ${声明.length} 处，必须恰好一处`)
  }
  const 行 = [...声明[0][1].matchAll(/([A-Z][A-Z0-9_]*):\s*CUO_WU_DAI_MA\.([A-Z][A-Z0-9_]*)/g)].map(
    (匹配) => ({ 旧码: 匹配[1], 现码: 匹配[2] as CuoWuDaiMa }),
  )
  if (行.length === 0) {
    throw new Error('注册表里的旧码映射解析为空，护栏拒绝静默通过')
  }
  for (const 项 of 行) {
    if (!shiCuoWuDaiMa(项.现码)) {
      throw new Error(`旧码 ${项.旧码} 映射到未注册码 ${项.现码}`)
    }
    if (zhuanHuanJiuDaiMa(项.旧码) !== 项.现码) {
      throw new Error(`旧码 ${项.旧码} 的实读转换结果与注册表声明不一致`)
    }
  }
  return 行
}

function 码表(行: 错误码行[]): string[] {
  return [
    '|码|HTTP|玩家可见文案|可重试|retryAfterMs|',
    '|---|---|---|---|---|',
    ...行.map(
      (项) =>
        `|${项.码}|${项.状态}|${项.文案}|${项.可重试 ? '是' : '否'}|${项.重试间隔毫秒 ?? '—'}|`,
    ),
  ]
}

export function 生成错误码文档(): string {
  const 全部 = duiQu全部错误码()
  const 旧码 = duiQu旧码映射()
  const 行: string[] = [
    '# 和我恋爱吧 错误码大全',
    '',
    '## 用途与唯一真源',
    '',
    '本文面向开发者与运维，用于按 `code` 判定失败语义、HTTP 状态与可重试口径。',
    '',
    '- 码、HTTP 状态、玩家可见文案、可重试与建议重试间隔的唯一真源是 `backend/src/config/错误码注册表.ts`，玩家可见文案取自 `backend/src/config/translations.ts`。',
    '- 本文件由 `backend/scripts/错误码文档.ts` 生成，禁止手改：改注册表或文案后重新生成，`backend/scripts/__tests__/错误码文档.test.ts` 会断言与真源逐字一致。',
    '- 码一经发布不得改名，文案措辞可随时改写；告警、看板、工单与前端分支一律以 `code` 为锚点，禁止解析 `message`。',
    '- 文案列是玩家原样可见的文案，本文只登记不润色；接口与请求参数口径见 `docs/API文档.md`，本文不复制接口清单。',
    '',
    '## 响应包络',
    '',
    '失败响应统一由 `backend/src/utils/xiangying.ts::chuangJianCuoWuXiangYing` 产出，字段类型见 `backend/src/types/index.ts::ApiXiangYing`。',
    '',
    '|字段|类型|说明|',
    '|---|---|---|',
    '|`cheng_gong`|boolean|失败时恒为 `false`|',
    '|`shu_ju`|null|失败时恒为 `null`|',
    '|`ti_shi`|string|兼容字段，与 `message` 同源，经脱敏过滤|',
    '|`cuo_wu_ma`|string|兼容字段，与 `code` 同值|',
    '|`code`|string|稳定错误码，取自注册表|',
    '|`message`|string|中文文案，取自注册表指向的翻译条目|',
    '|`traceId`|string|追踪号，与响应头 `X-Request-Id`、`X-Trace-Id` 同值|',
    '|`retryable`|boolean|是否可原样重试，取自注册表|',
    '|`retryAfterMs`|number|可选，注册表给出建议间隔或调用方显式传入时才出现|',
    '|`fieldErrors`|object|可选，仅安全白名单字段的提示，不含内部键|',
    '',
    '外部传入的 `ti_shi` 与 `code` 都要过白名单校验才被采用，否则回落为注册表文案；数据库原文、堆栈、文件路径与凭据不会下发客户端。',
    '',
    '## traceId 与重试规则',
    '',
    '追踪号由 `backend/src/middleware/日志追踪.ts` 统一产出：',
    '',
    '- 请求头 `X-Request-Id` 合法时沿用，合法性为 16 至 128 字符、首字符是字母或数字、其余限于 `[A-Za-z0-9._:-]`；缺失或非法时生成随机 UUID。',
    '- 同一值写入响应头 `X-Request-Id`、`X-Trace-Id`、失败包络 `traceId` 与该请求全部日志的 `trace_id`。',
    '- 玩家报障只需给出 `traceId`，运维凭此在脱敏日志中定位同一次请求；日志已移除密码、令牌、API key 与连接串凭据。',
    '',
    '重试口径：',
    '',
    '- `retryable=false` 不得原样重试：先修正入参、重新登录或刷新状态。',
    '- `retryable=true` 可原样重试；带 `retryAfterMs` 时必须等待该毫秒数，退避以服务端返回值为准。',
    '- 可重试标志逐码固定在注册表，不由状态码推导：限流类为 `true`；参数、认证、权限、资源、冲突、启动校验与未知内部错误为 `false`；上游与依赖不可用为 `true`。',
    '- 服务端不代客户端重试；业务写操作重试前须确认上一次是否已落库。',
    '',
    '## 分类码表',
    '',
    '分类只用于检索与分派，不改变任何运行时行为：先按注册表的界面字段归入启动、战绩、角色生成与管理员四类，其余按码前缀归入依赖、数据、网络、认证与访问控制，剩余通用码归入业务。',
    '',
  ]
  for (const 分类 of 分类顺序) {
    行.push(`### ${分类}`, '', ...码表(全部.filter((项) => 项.分类 === 分类)), '')
  }
  行.push(
    '## 旧码兼容映射',
    '',
    '旧码映射由 `backend/src/config/错误码注册表.ts::zhuanHuanJiuDaiMa` 统一执行：已是注册码的原样返回，旧码按下表转换，都未命中时返回 `null`；只拿到 HTTP 状态的旧调用方由同文件的 `daiMaHuoQuZhuangTaiMa` 兜底转换。',
    '',
    '|旧码|现码|',
    '|---|---|',
    ...旧码.map((项) => `|${项.旧码}|${项.现码}|`),
    '',
    '注册表仍导出旧码常量 `JIU_DAI_MA` 供过渡期调用方识别，其两个取值都已并入上表映射。',
    '',
    '## 运维处置原则',
    '',
    '- 先看 `code` 再看 `message`：`message` 是玩家可见文案，随时可能改写，不能作为归类依据。',
    '- 排查入口是 `traceId`：凭它取同一请求的脱敏日志，日志里的内部原因不外发、不写入本文。',
    '- 依赖、网络与启动类码反映基础设施状态：先确认依赖存活与网络可达，再判应用逻辑，禁止用重试掩盖依赖故障。',
    '- 启动类码由启动校验与镜像入口脚本输出并中止进程，不会出现在失败响应体里；容器不就绪时先看启动日志末尾的码。',
    '- 健康检查按 `DEPENDENCY_*` 与 `DEPENDENCIES_UNAVAILABLE` 判定具体依赖，两者同时出现即为整体依赖不可用。',
    '- 认证与权限类码不进重试：先判定是凭证失效、来源被拒还是能力位不足，再决定重新登录还是修正授权。',
    '- 战绩与角色生成类码是业务阶段语义：阶段码只说明失败落在哪一步，不得改写为通用内部错误，也不得用空结果伪装成功。',
    '',
    '## 生成与校验',
    '',
    '```bash',
    'npx ts-node scripts/错误码文档.ts',
    '```',
    '',
    '校验随 `npm test` 执行：重新生成结果须与本文件逐字一致；每个注册码恰好一行且状态与可重试标志与注册表一致；无重复、遗漏与未注册码；文件为 UTF-8 无 BOM 且不含敏感样例。',
    '',
  )
  return 行.join('\n')
}

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  writeFileSync(错误码文档路径, 生成错误码文档(), 'utf8')
  process.stdout.write(`已生成 ${错误码文档路径}\n`)
}
