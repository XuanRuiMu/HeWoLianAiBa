import { spawn, ChildProcess, exec } from 'child_process'
import * as path from 'path'
import * as net from 'net'
import * as fs from 'fs'
import { promisify } from 'util'
import { peiZhi } from './配置'

const execAsync = promisify(exec)

const xiangMuGen = path.resolve(__dirname, '..', '..')
const e2eGen = path.resolve(__dirname, '..')
const houDuanLuJing = path.join(xiangMuGen, 'backend')
const qianDuanLuJing = path.join(xiangMuGen, 'frontend')
const fuWuZhuangTaiLuJing = path.join(e2eGen, '.fu-wu-zhuang-tai.json')

let houDuanJinCheng: ChildProcess | null = null
let qianDuanJinCheng: ChildProcess | null = null

interface FuWuZhuangTai {
  houDuanPid?: number
  qianDuanPid?: number
}

function baoCunFuWuZhuangTai(zhuangTai: FuWuZhuangTai): void {
  fs.writeFileSync(fuWuZhuangTaiLuJing, JSON.stringify(zhuangTai, null, 2), 'utf-8')
}

function duQuFuWuZhuangTai(): FuWuZhuangTai {
  if (!fs.existsSync(fuWuZhuangTaiLuJing)) {
    return {}
  }
  try {
    const neiRong = fs.readFileSync(fuWuZhuangTaiLuJing, 'utf-8')
    return JSON.parse(neiRong) as FuWuZhuangTai
  } catch {
    return {}
  }
}

function shanChuFuWuZhuangTai(): void {
  if (fs.existsSync(fuWuZhuangTaiLuJing)) {
    fs.unlinkSync(fuWuZhuangTaiLuJing)
  }
}

async function duanKouShiFouJiuXu(zhuJi: string, duanKou: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(1000)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.connect(duanKou, zhuJi)
  })
}

function dengDaiDuanKou(zhuJi: string, duanKou: number, chaoShi: number = 30000): Promise<void> {
  const kaiShiShiJian = Date.now()
  return new Promise((resolve, reject) => {
    function changShiLianJie() {
      const socket = new net.Socket()
      socket.setTimeout(1000)
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() - kaiShiShiJian > chaoShi) {
          reject(new Error(`端口 ${duanKou} 在 ${chaoShi}ms 内未就绪`))
          return
        }
        setTimeout(changShiLianJie, 500)
      })
      socket.once('timeout', () => {
        socket.destroy()
        if (Date.now() - kaiShiShiJian > chaoShi) {
          reject(new Error(`端口 ${duanKou} 在 ${chaoShi}ms 内未就绪`))
          return
        }
        setTimeout(changShiLianJie, 500)
      })
      socket.connect(duanKou, zhuJi)
    }
    changShiLianJie()
  })
}

async function jianChaFuWuZhuangTai(fuWuMing: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`sc query "${fuWuMing}"`)
    return stdout.includes('RUNNING')
  } catch {
    return false
  }
}

async function qiDongWindowsFuWu(fuWuMing: string): Promise<void> {
  try {
    await execAsync(`sc start "${fuWuMing}"`)
  } catch (cuoWu) {
    throw new Error(`无法启动服务 ${fuWuMing}: ${cuoWu}`)
  }
}

export async function queRenShuJuKu(): Promise<void> {
  const postgresRunning = await jianChaFuWuZhuangTai(peiZhi.postgresFuWuMing)
  if (!postgresRunning) {
    await qiDongWindowsFuWu(peiZhi.postgresFuWuMing)
  }
  const redisRunning = await jianChaFuWuZhuangTai(peiZhi.redisFuWuMing)
  if (!redisRunning) {
    await qiDongWindowsFuWu(peiZhi.redisFuWuMing)
  }
  await new Promise((resolve) => setTimeout(resolve, 2000))
}

export async function qiDongHouDuan(): Promise<void> {
  if (houDuanJinCheng && !houDuanJinCheng.killed) {
    return
  }
  if (await duanKouShiFouJiuXu('localhost', peiZhi.houDuanDuanKou)) {
    console.log(`后端服务已在端口 ${peiZhi.houDuanDuanKou} 运行，跳过启动`)
    return
  }
  houDuanJinCheng = spawn('npm run dev', {
    cwd: houDuanLuJing,
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'development', PORT: String(peiZhi.houDuanDuanKou) },
  })
  houDuanJinCheng.on('error', (cuoWu) => {
    console.error('后端进程错误:', cuoWu)
  })
  await dengDaiDuanKou('localhost', peiZhi.houDuanDuanKou, 60000)
  if (houDuanJinCheng.pid) {
    baoCunFuWuZhuangTai({ ...duQuFuWuZhuangTai(), houDuanPid: houDuanJinCheng.pid })
  }
}

export async function qiDongQianDuan(): Promise<void> {
  if (qianDuanJinCheng && !qianDuanJinCheng.killed) {
    return
  }
  if (await duanKouShiFouJiuXu('localhost', peiZhi.qianDuanDuanKou)) {
    console.log(`前端服务已在端口 ${peiZhi.qianDuanDuanKou} 运行，跳过启动`)
    return
  }
  qianDuanJinCheng = spawn('npm run dev', {
    cwd: qianDuanLuJing,
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'development' },
  })
  qianDuanJinCheng.on('error', (cuoWu) => {
    console.error('前端进程错误:', cuoWu)
  })
  await dengDaiDuanKou('localhost', peiZhi.qianDuanDuanKou, 60000)
  if (qianDuanJinCheng.pid) {
    baoCunFuWuZhuangTai({ ...duQuFuWuZhuangTai(), qianDuanPid: qianDuanJinCheng.pid })
  }
}

async function shaSiJinCheng(pid: number | undefined): Promise<void> {
  if (!pid) return
  if (process.platform === 'win32') {
    try {
      await execAsync(`taskkill /pid ${pid} /T /F`)
    } catch {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // 进程可能已退出
      }
    }
  } else {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // 进程可能已退出
    }
  }
}

export async function tingZhiFuWu(): Promise<void> {
  const zhuangTai = duQuFuWuZhuangTai()

  if (qianDuanJinCheng && !qianDuanJinCheng.killed) {
    await shaSiJinCheng(qianDuanJinCheng.pid ?? undefined)
  }
  if (zhuangTai.qianDuanPid) {
    await shaSiJinCheng(zhuangTai.qianDuanPid)
  }
  qianDuanJinCheng = null

  if (houDuanJinCheng && !houDuanJinCheng.killed) {
    await shaSiJinCheng(houDuanJinCheng.pid ?? undefined)
  }
  if (zhuangTai.houDuanPid) {
    await shaSiJinCheng(zhuangTai.houDuanPid)
  }
  houDuanJinCheng = null

  shanChuFuWuZhuangTai()
}

export default async function globalSetup(): Promise<void> {
  await queRenShuJuKu()
  await qiDongHouDuan()
  await qiDongQianDuan()
}
