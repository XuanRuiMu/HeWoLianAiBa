import type { YuJiaZaiPeiZhi } from '@/router/预取'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*.md?raw' {
  const content: string
  export default content
}

declare module '*.txt?raw' {
  const content: string
  export default content
}

declare module 'vue-router' {
  interface RouteMeta {
    xuYaoDengLu?: boolean
    yuJiaZai?: YuJiaZaiPeiZhi
  }
}
