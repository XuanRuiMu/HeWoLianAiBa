// 环境变量加载叶子模块：dotenv 必须在任何「导入即快照 process.env」的配置模块之前执行。
// 单独成模块是为了让 config/AI配置.ts 这类快照型配置能自带加载，而不必反向依赖 config/index.ts
// （它会做密钥校验并在生产缺 key 时直接抛错）。
import dotenv from 'dotenv'

dotenv.config()
