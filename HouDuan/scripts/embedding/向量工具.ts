import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

export interface XiangLiangRow {
  duan: string
  text: string
  vector: number[]
}

export async function 计算文本向量(texts: string[], 模型目录?: string): Promise<number[][]> {
  const pyPath = process.env.BIAO_QING_PYTHON || 'python'
  const script = path.join(osRoot(), 'bge-embed.py')
  const modelPath = 模型目录 || process.env.BIAO_QING_EMBED_MODEL || path.join(osRoot(), 'bge-model')
  const proc = spawn(pyPath, [script, modelPath], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, stdio: ['pipe', 'pipe', 'pipe'] })
  const err: Buffer[] = []
  const out: Buffer[] = []
  proc.stdout.on('data', (x) => out.push(x))
  proc.stderr.on('data', (x) => err.push(x))
  proc.stdin.end(JSON.stringify(texts), 'utf-8')
  const code = await new Promise<number>((resolve, reject) => {
    proc.once('error', reject)
    proc.once('close', (c) => resolve(c ?? -1))
  })
  if (code !== 0) throw new Error(`生成向量失败 ${Buffer.concat(err).toString('utf-8').slice(0, 250)}`)
  const parsed = JSON.parse(Buffer.concat(out).toString('utf-8')) as { vectors: number[][] }
  return parsed.vectors
}

function osRoot(): string {
  return process.env.BIAO_QING_EMBED_TOOLS || path.join(os.tmpdir())
}
