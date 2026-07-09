export const peiZhi = {
  houDuanDuanKou: parseInt(process.env.E2E_BACKEND_PORT || '3000', 10),
  qianDuanDuanKou: parseInt(process.env.E2E_FRONTEND_PORT || '5173', 10),
  houDuanJiChuUrl: process.env.E2E_BACKEND_URL || 'http://localhost:3000',
  qianDuanJiChuUrl: process.env.E2E_FRONTEND_URL || 'http://localhost:5173',
  postgresFuWuMing: process.env.E2E_POSTGRES_SERVICE || 'postgresql-x64-17',
  redisFuWuMing: process.env.E2E_REDIS_SERVICE || 'Redis',
  lingPaiJian: process.env.E2E_TOKEN_KEY || '令牌',
  kaiFaYanZhengMa: process.env.E2E_DEV_CODE || '123456',
}
