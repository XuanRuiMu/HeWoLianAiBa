import { vi } from 'vitest'

class JiaLocalStorage implements Storage {
  private cunChu = new Map<string, string>()

  get length() {
    return this.cunChu.size
  }

  getItem(jian: string): string | null {
    return this.cunChu.has(jian) ? (this.cunChu.get(jian) as string) : null
  }

  setItem(jian: string, zhi: string): void {
    this.cunChu.set(jian, zhi)
  }

  removeItem(jian: string): void {
    this.cunChu.delete(jian)
  }

  clear(): void {
    this.cunChu.clear()
  }

  key(suoYin: number): string | null {
    return Array.from(this.cunChu.keys())[suoYin] || null
  }
}

const jiaLocalStorage = new JiaLocalStorage()

Object.defineProperty(globalThis, 'localStorage', {
  value: jiaLocalStorage,
  writable: true,
  configurable: true,
})

vi.stubGlobal('localStorage', jiaLocalStorage)
