import { pipeline, env } from '@huggingface/transformers'

export interface 嵌入配置 {
  model?: string
  quantized?: boolean
  dtype?: 'fp32' | 'q8' | 'fp16'
}

let cached: Promise<unknown> | null = null

function 准备环境(): void {
  const dir = process.env.BIAO_QING_LOCAL_MODEL_PATH
  if (dir) {
    env.localModelPath = dir
    env.cacheDir = dir
  }
  env.allowRemoteModels = false
  ;(env as unknown as { local_files_only: boolean }).local_files_only = true
}

export async function 生成向量(texts: string[], 配置: 嵌入配置 = {}): Promise<number[][]> {
  const inputs = Array.isArray(texts) ? texts.map((t) => typeof t === 'string' ? t : '') : []
  if (inputs.length === 0) return []
  准备环境()
  if (!cached) {
    cached = pipeline('feature-extraction', 配置.model || 'bge-small-zh-v1.5', {
      local_files_only: true,
      dtype: 配置.dtype || 'q8',
    } as Parameters<typeof pipeline>[2])
  }
  const q = await cached as unknown as (input: string[] | string, options?: Record<string, unknown>) => Promise<{ dims: number[]; data: Float32Array | number[] }>
  const outputs: number[][] = []
  for (const text of inputs) {
    const r = await q(text, { pooling: 'cls', normalize: true })
    const dim = r.dims[r.dims.length - 1]
    outputs.push(Array.from(r.data.slice(0, dim)))
  }
  return outputs
}

export function 重置向量缓存(): void {
  cached = null
}
