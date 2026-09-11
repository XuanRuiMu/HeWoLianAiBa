const 数字映射: Record<string, string> = {
  '0': '零',
  '1': '一',
  '2': '二',
  '3': '三',
  '4': '四',
  '5': '五',
  '6': '六',
  '7': '七',
  '8': '八',
  '9': '九',
}

const 缩写映射: Record<string, string> = {
  AI: 'A I',
  CPU: 'C P U',
  GPU: 'G P U',
  URL: 'U R L',
  API: 'A P I',
  HTTP: 'H T T P',
  HTTPS: 'H T T P S',
  JSON: 'J S O N',
  SQL: 'S Q L',
  HTML: 'H T M L',
  CSS: 'C S S',
  JS: 'J S',
  TS: 'T S',
  IDE: 'I D E',
  SDK: 'S D K',
  UI: 'U I',
  UX: 'U X',
  VIP: 'V I P',
  CEO: 'C E O',
  CTO: 'C T O',
  HR: 'H R',
  PR: 'P R',
  FAQ: 'F A Q',
  TODO: 'T O D O',
  BUG: 'B U G',
  PRD: 'P R D',
  MVP: 'M V P',
  KPI: 'K P I',
  OKR: 'O K R',
  DB: 'D B',
  DNS: 'D N S',
  IP: 'I P',
  TCP: 'T C P',
  UDP: 'U D P',
  SSH: 'S S H',
  FTP: 'F T P',
  SMTP: 'S M T P',
  REST: 'R E S T',
  GraphQL: 'Graph Q L',
  WebSocket: 'Web Socket',
  JWT: 'J W T',
  OAuth: 'O Auth',
  UUID: 'U U I D',
  CRUD: 'C R U D',
  ORM: 'O R M',
  MVC: 'M V C',
  MVVM: 'M V V M',
  CI: 'C I',
  CD: 'C D',
  CLI: 'C L I',
  GUI: 'G U I',
  RAM: 'R A M',
  ROM: 'R O M',
  SSD: 'S S D',
  HDD: 'H D D',
  BIOS: 'B I O S',
  OS: 'O S',
  VM: 'V M',
  Docker: 'Docker',
  Kubernetes: 'Kubernetes',
  K8s: 'K eight s',
  AWS: 'A W S',
  GCP: 'G C P',
  Azure: 'Azure',
  Git: 'Git',
  GitHub: 'Git Hub',
  GitLab: 'Git Lab',
  npm: 'N P M',
  yarn: 'Yarn',
  pnpm: 'P N P M',
  webpack: 'Webpack',
  Vite: 'Vite',
  React: 'React',
  Vue: 'Vue',
  Angular: 'Angular',
  NextJS: 'Next J S',
  Nuxt: 'Nuxt',
  TypeScript: 'Type Script',
  JavaScript: 'Java Script',
  Python: 'Python',
  Java: 'Java',
  Go: 'Go',
  Rust: 'Rust',
  'C++': 'C Plus Plus',
  'C#': 'C Sharp',
  PHP: 'P H P',
  Ruby: 'Ruby',
  Swift: 'Swift',
  Kotlin: 'Kotlin',
  Dart: 'Dart',
  Flutter: 'Flutter',
  Electron: 'Electron',
  Tauri: 'Tauri',
  Redis: 'Redis',
  MongoDB: 'Mongo D B',
  PostgreSQL: 'Postgres SQL',
  MySQL: 'My SQL',
  SQLite: 'SQLite',
  Elasticsearch: 'Elastic Search',
  Kafka: 'Kafka',
  RabbitMQ: 'Rabbit M Q',
  gRPC: 'g R P C',
  Protobuf: 'Protobuf',
  WebRTC: 'Web R T C',
  WebAssembly: 'Web Assembly',
  WASM: 'W A S M',
  PWA: 'P W A',
  SPA: 'S P A',
  SSR: 'S S R',
  SSG: 'S S G',
  SEO: 'S E O',
  LLM: 'L L M',
  RAG: 'R A G',
  NLP: 'N L P',
  CV: 'C V',
  ML: 'M L',
  DL: 'D L',
  RL: 'R L',
  GAN: 'G A N',
  BERT: 'BERT',
  GPT: 'GPT',
  Transformer: 'Transformer',
  LoRA: 'LoRA',
  PEFT: 'PEFT',
  SFT: 'SFT',
  RLHF: 'RLHF',
  DPO: 'DPO',
}

const 停顿标记: Record<string, string> = {
  '。': '。<#1.0#>',
  '？': '？<#1.0#>',
  '！': '！<#1.0#>',
  '，': '，<#0.5#>',
  '、': '、<#0.5#>',
  '；': '；<#0.8#>',
  '：': '：<#0.5#>',
  '……': '……<#1.5#>',
  '...': '...<#1.5#>',
  '～': '～<#0.8#>',
  '~': '~<#0.8#>',
}

const 语气词列表 = ['呢', '吧', '啊', '呀', '哦', '嗯', '哈', '嘿', '哇', '诶', '唉', '嘛', '呗', '咯', '呗']

function 数字转中文(文本: string): string {
  return 文本.replace(/\d+/g, (匹配) => {
    if (匹配.length <= 4) {
      return 匹配.split('').map(字 => 数字映射[字] || 字).join('')
    }
    return 匹配
  })
}

function 展开缩写(文本: string): string {
  let 结果 = 文本
  for (const [缩写, 展开] of Object.entries(缩写映射)) {
    const 正则 = new RegExp(`\\b${缩写}\\b`, 'gi')
    结果 = 结果.replace(正则, 展开)
  }
  return 结果
}

function 添加停顿标记(文本: string): string {
  let 结果 = 文本
  for (const [标点, 替换] of Object.entries(停顿标记)) {
    结果 = 结果.replace(new RegExp(标点.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 替换)
  }
  return 结果
}

function 保护语气词(文本: string): string {
  let 结果 = 文本
  for (const 语气词 of 语气词列表) {
    const 正则 = new RegExp(`([^<#])(${语气词})([^#>])`, 'g')
    结果 = 结果.replace(正则, `$1${语气词}$3`)
  }
  return 结果
}

export function 转换TTS文本(原始文本: string): string {
  if (!原始文本 || !原始文本.trim()) {
    return ''
  }

  let 文本 = 原始文本.trim()

  文本 = 数字转中文(文本)
  文本 = 展开缩写(文本)
  文本 = 添加停顿标记(文本)
  文本 = 保护语气词(文本)

  return 文本
}