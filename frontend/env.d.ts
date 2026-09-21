/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

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
