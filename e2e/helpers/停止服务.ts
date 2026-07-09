import { tingZhiFuWu } from './启动服务'

export default async function globalTeardown(): Promise<void> {
  await tingZhiFuWu()
}
