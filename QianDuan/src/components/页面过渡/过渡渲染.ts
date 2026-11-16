import { 建全部 } from './墨带几何'
import { 烧穿GLSL } from './烧穿着色器'
import { GuoDuRuChangHaoMiao } from '@/router/预取'

export const 节奏 = { 入场总时长: GuoDuRuChangHaoMiao, 单段时长: 1100, 错开: 300 }

export interface 配色方案 {
  底: string
  带: string
  烧: [number, number, number]
}

export const 配色表: Record<'深' | '浅', 配色方案> = {
  深: { 底: '#b9d7ec', 带: '#0a0a0c', 烧: [0, 0, 0] },
  浅: { 底: '#f6d873', 带: '#f4c2d4', 烧: [0, 0, 0] },
}

export function 取配色(浅色: boolean): 配色方案 {
  return 浅色 ? 配色表.浅 : 配色表.深
}

const 夹 = (值: number): number => Math.min(1, Math.max(0, 值))

export function 取段进度(入场进度: number, 次序: number): number {
  return 夹((入场进度 * 节奏.入场总时长 - 次序 * 节奏.错开) / 节奏.单段时长)
}

export function 取烧穿进度(退场进度: number): number {
  const 原 = 夹(退场进度)
  if (原 <= 0) return 0
  if (原 >= 1) return 1
  return 0.1 + 原 * 0.85
}

export interface 几何 {
  段: {
    键: string
    层: number
    地块路径: string
    绸带路径: string
    盒: { x: number; y: number; w: number; h: number }
    隐: { x: number; y: number }
    盖: { x: number; y: number }
  }[]
  入场次序: number[]
}

const 顶GLSL = 'attribute vec2 _p; varying vec2 _uv; void main(){ gl_Position = vec4(_p, 0.0, 1.0); _uv = _p * 0.5 + 0.5; }'

const 头GLSL = `precision highp float;
varying vec2 _uv;
uniform sampler2D from, to;
uniform float progress;
vec4 getFromColor(vec2 uv){ return texture2D(from, uv); }
vec4 getToColor(vec2 uv){ return texture2D(to, uv); }
`

const 尾GLSL = ' void main(){ gl_FragColor = transition(_uv); }'

function 建GL(画布: HTMLCanvasElement) {
  const gl = 画布.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  })
  if (!gl) return null

  function 编译(型: number, 源: string): WebGLShader {
    const 着 = gl.createShader(型) as WebGLShader
    gl.shaderSource(着, 源)
    gl.compileShader(着)
    if (!gl.getShaderParameter(着, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(着) ?? '着色器编译失败')
    }
    return 着
  }

  const 程 = gl.createProgram() as WebGLProgram
  gl.attachShader(程, 编译(gl.VERTEX_SHADER, 顶GLSL))
  gl.attachShader(程, 编译(gl.FRAGMENT_SHADER, 头GLSL + '\n' + 烧穿GLSL + '\n' + 尾GLSL))
  gl.bindAttribLocation(程, 0, '_p')
  gl.linkProgram(程)
  if (!gl.getProgramParameter(程, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(程) ?? '着色器链接失败')
  }

  const 点缓 = gl.createBuffer() as WebGLBuffer
  gl.bindBuffer(gl.ARRAY_BUFFER, 点缓)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

  const 位 = {
    from: gl.getUniformLocation(程, 'from'),
    to: gl.getUniformLocation(程, 'to'),
    progress: gl.getUniformLocation(程, 'progress'),
    burnColor: gl.getUniformLocation(程, 'burnColor'),
  }

  function 贴图(): WebGLTexture {
    const 贴 = gl.createTexture() as WebGLTexture
    gl.bindTexture(gl.TEXTURE_2D, 贴)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return 贴
  }

  const 甲 = 贴图()
  const 乙 = 贴图()
  gl.bindTexture(gl.TEXTURE_2D, 乙)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]))

  gl.clearColor(0, 0, 0, 0)

  function 上传(帧布: HTMLCanvasElement): void {
    gl.bindTexture(gl.TEXTURE_2D, 甲)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, 帧布)
  }

  function 画(进度: number, 烧: [number, number, number]): void {
    gl.useProgram(程)
    gl.bindBuffer(gl.ARRAY_BUFFER, 点缓)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, 甲)
    gl.uniform1i(位.from, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, 乙)
    gl.uniform1i(位.to, 1)
    gl.uniform1f(位.progress, 进度)
    gl.uniform3fv(位.burnColor, 烧)
    gl.viewport(0, 0, 画布.width, 画布.height)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  function 释放(): void {
    gl.deleteTexture(甲)
    gl.deleteTexture(乙)
    gl.deleteBuffer(点缓)
    gl.deleteProgram(程)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  return { 上传, 画, 释放 }
}

export interface 渲染器 {
  设尺寸(宽: number, 高: number, 比: number): void
  画(入场进度: number, 退场进度: number | null, 配色: 配色方案): void
  释放(): void
}

export function 建渲染器(画布: HTMLCanvasElement): 渲染器 {
  const 帧布 = document.createElement('canvas')
  const 笔 = 帧布.getContext('2d')
  let 几何: 几何 | null = null
  let 宽 = 0
  let 高 = 0
  let 比 = 1
  let 缓存键 = ''
  let gl包: ReturnType<typeof 建GL> = null
  let 平笔: CanvasRenderingContext2D | null = null

  try {
    gl包 = 建GL(画布)
  } catch {
    gl包 = null
  }
  if (!gl包) 平笔 = 画布.getContext('2d')

  function 设尺寸(新宽: number, 新高: number, 新比: number): void {
    宽 = Math.max(1, Math.floor(新宽))
    高 = Math.max(1, Math.floor(新高))
    比 = Math.min(Math.max(新比, 1), 1.5)
    画布.width = Math.floor(宽 * 比)
    画布.height = Math.floor(高 * 比)
    帧布.width = Math.floor(宽 * 比)
    帧布.height = Math.floor(高 * 比)
    const 段 = ['甲', '乙', '丙'].map((键, 序) => ({
      键,
      方向: 序 === 2 ? -1 : 1,
      层: [2, 1, 3][序],
      色: { 辉: '#000000', 起: '#000000', 止: '#000000' },
    }))
    几何 = 建全部(宽, 高, { 方案: '散毫', 段 }) as unknown as 几何
    缓存键 = ''
  }

  function 画帧(入场进度: number, 配色: 配色方案): void {
    if (!几何 || !笔 || typeof Path2D === 'undefined') return
    笔.setTransform(比, 0, 0, 比, 0, 0)
    笔.clearRect(0, 0, 宽, 高)
    笔.fillStyle = 配色.底
    笔.fillRect(0, 0, 宽, 高)
    const 次序 = 几何.段.map((段, 序) => 序).sort((甲, 乙) => 几何.段[甲].层 - 几何.段[乙].层)
    for (const 序 of 次序) {
      const 段 = 几何.段[序]
      const 段进度 = 取段进度(入场进度, 几何.入场次序.indexOf(序))
      if (段进度 <= 0) continue
      const tx = 段.隐.x + (段.盖.x - 段.隐.x) * 段进度
      const ty = 段.隐.y + (段.盖.y - 段.隐.y) * 段进度
      笔.save()
      笔.clip(new Path2D(段.地块路径))
      笔.translate(段.盒.x + tx, 段.盒.y + ty)
      笔.fillStyle = 配色.带
      笔.fill(new Path2D(段.绸带路径))
      笔.restore()
    }
  }

  function 画(入场进度: number, 退场进度: number | null, 配色: 配色方案): void {
    if (!几何) return
    const 冻 = 退场进度 === null ? 入场进度 : 夹(入场进度)
    const 键 = `${冻.toFixed(4)}|${配色.底}|${配色.带}|${宽}x${高}@${比}`
    if (键 !== 缓存键) {
      画帧(冻, 配色)
      缓存键 = 键
      if (gl包) gl包.上传(帧布)
    }
    const 烧 = 退场进度 === null ? 0 : 取烧穿进度(退场进度)
    if (gl包) {
      gl包.画(烧, 配色.烧)
    } else if (平笔) {
      平笔.setTransform(1, 0, 0, 1, 0, 0)
      平笔.clearRect(0, 0, 画布.width, 画布.height)
      平笔.globalAlpha = 1 - 烧
      平笔.drawImage(帧布, 0, 0)
      平笔.globalAlpha = 1
    }
  }

  function 释放(): void {
    gl包?.释放()
    gl包 = null
    平笔 = null
    几何 = null
  }

  return { 设尺寸, 画, 释放 }
}
