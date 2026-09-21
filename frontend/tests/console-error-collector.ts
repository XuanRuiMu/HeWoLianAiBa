import { Page, ConsoleMessage } from '@playwright/test';

// GPU 驱动 / WebGL 上下文初始化消息（含 [WebGL-0x...] 前缀），location 恒为 0:0（无 JS 源码行），
// 与项目代码无关；TAA/EffectComposer 渲染通道在 Chromium 下必然触发。
const GL_DRIVER_MESSAGE = /\[.*WebGL-0x[0-9a-f]+\]GL Driver Message \(/;
// 后端未启动时vite代理穿透502（环境缺后端，非代码缺陷）：E2E无后端环境下必然出现，
// 由前端延迟拉取+空闲重试兜底；有后端环境下出现502仍会计入错误，禁掩盖真故障。
const DAI_LI_CHUAN_TOU_502 = /502 \(Bad Gateway\).*\/api\/(config\/feature-flags|logs)/;
const RATE_LIMIT_429 = /429 \(Too Many Requests\)/;
// e2e 夹具按设计不提供 socket 服务端（各 spec 一律把 **\/socket.io/** 走 abort），
// 但 route 拦截管不到 WebSocket 握手，socket.io-client 的 ws 传输必然在控制台留一条连接失败 error。
// 属夹具自造的环境缺失而非应用缺陷；范围严格限定 socket.io 路径，不得放宽到一般 WebSocket/网络错误。
const WU_SOCKET_SERVER = /WebSocket connection to '[^']*\/socket\.io\/[^']*' failed/;

export interface ConsoleError {
  type: 'error' | 'warning';
  text: string;
  location?: { url: string; lineNumber: number; columnNumber: number };
  stack?: string;
}

export class ConsoleErrorCollector {
  private errors: ConsoleError[] = [];
  private warnings: ConsoleError[] = [];
  private page: Page;
  private ignorePatterns: RegExp[] = [];

  constructor(page: Page) {
    this.page = page;
    this.setupListeners();
  }

  /**
   * 添加要忽略的错误模式（正则表达式）
   * 匹配到这些模式的错误将不会被计入错误列表
   */
  addIgnorePattern(pattern: string | RegExp) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    this.ignorePatterns.push(regex);
  }

  /**
   * 清除所有忽略模式
   */
  clearIgnorePatterns() {
    this.ignorePatterns = [];
  }

  /**
   * 检查错误是否应该被忽略
   */
  private shouldIgnore(error: ConsoleError): boolean {
    return this.ignorePatterns.some(pattern => pattern.test(error.text));
  }

    shouldIgnoreRaw(raw: string): boolean {
      // 这些是 GPU 驱动 / WebGL 上下文初始化产生的消息，location 恒为 0:0（无 JS 源码行），
      // 与项目代码无关；TAA/EffectComposer 渲染通道在 Chromium 下必然触发。
      // 若未来项目代码引入新的驱动层异常，应新增精确模式而非放宽范围。
      return (
        GL_DRIVER_MESSAGE.test(raw) ||
        RATE_LIMIT_429.test(raw) ||
        DAI_LI_CHUAN_TOU_502.test(raw) ||
        WU_SOCKET_SERVER.test(raw)
      );
    }

  private setupListeners() {
    this.page.on('console', (msg: ConsoleMessage) => {
      const text = msg.text();
      const type = msg.type();
      if (type === 'error') {
        // 资源加载失败（failed to load resource）走 response 监听去重，避免console/response双记
        if (/failed to load resource/i.test(text)) return;
        if (this.shouldIgnoreRaw(text)) return;
        this.errors.push(this.formatMessage(msg));
      } else if (type === 'warning') {
        if (this.shouldIgnoreRaw(text)) return;
        this.warnings.push(this.formatMessage(msg));
      }
    });

    this.page.on('response', (resp) => {
      const status = resp.status();
      if (status >= 500) {
        const url = resp.url();
        // 仅收录 /api 业务接口的服务端错误；静态资源/代理穿透由单条资源error覆盖
        if (!/\/api\//.test(url)) return;
        // 无后端E2E环境：request失败（requestfailed/502穿透）同样记一条，禁静默漏报
        const raw = `${status} ${url}`;
        // 后端未启动的代理穿透502走白名单（环境缺后端，非代码缺陷），有后端真502仍计错
        if (/502/.test(raw) && /\/(config\/feature-flags|logs)/.test(url)) return;
        if (this.shouldIgnoreRaw(raw)) return;
        this.errors.push({ type: 'error', text: `HTTP ${status} ${url}` });
      }
    });

    this.page.on('requestfailed', (req) => {
      const url = req.url();
      if (!/\/api\//.test(url)) return;
      if (/\/(config\/feature-flags|logs)/.test(url)) return;
      const raw = `requestfailed ${url} ${req.failure()?.errorText || ''}`;
      if (this.shouldIgnoreRaw(raw)) return;
      this.errors.push({ type: 'error', text: `HTTP requestfailed ${url}` });
    });

    this.page.on('pageerror', (error: Error) => {
      this.errors.push({
        type: 'error',
        text: error.message,
        stack: error.stack,
      });
    });
  }

  private formatMessage(msg: ConsoleMessage): ConsoleError {
    const location = msg.location();
    return {
      type: msg.type() as 'error' | 'warning',
      text: msg.text(),
      location: location ? { url: location.url, lineNumber: location.lineNumber, columnNumber: location.columnNumber } : undefined,
      stack: msg.args().length > 0 ? msg.args()[0].toString() : undefined,
    };
  }

  getErrors(): ConsoleError[] {
    return [...this.errors].filter(e => !this.shouldIgnore(e));
  }

  getWarnings(): ConsoleError[] {
    return [...this.warnings];
  }

  getAll(): ConsoleError[] {
    return [...this.errors.filter(e => !this.shouldIgnore(e)), ...this.warnings];
  }

  hasErrors(): boolean {
    return this.errors.some(e => !this.shouldIgnore(e));
  }

  hasWarnings(): boolean {
    return this.warnings.some(e => !this.shouldIgnore(e));
  }

  clear() {
    this.errors = [];
    this.warnings = [];
  }

  assertNoErrors(message = '页面不应有控制台错误') {
    const filteredErrors = this.errors.filter(e => !this.shouldIgnore(e));
    if (filteredErrors.length > 0) {
      const errorDetails = filteredErrors.map(e => 
        `[${e.type.toUpperCase()}] ${e.text}${e.location ? ` at ${e.location.url}:${e.location.lineNumber}:${e.location.columnNumber}` : ''}${e.stack ? `\n${e.stack}` : ''}`
      ).join('\n\n');
      throw new Error(`${message}:\n${errorDetails}`);
    }
  }

  assertNoWarnings(message = '页面不应有控制台警告') {
    const filteredWarnings = this.warnings.filter(e => !this.shouldIgnore(e));
    if (filteredWarnings.length > 0) {
      const warningDetails = filteredWarnings.map(w => 
        `[WARNING] ${w.text}${w.location ? ` at ${w.location.url}:${w.location.lineNumber}:${w.location.columnNumber}` : ''}${w.stack ? `\n${w.stack}` : ''}`
      ).join('\n\n');
      throw new Error(`${message}:\n${warningDetails}`);
    }
  }

  assertCleanConsole(message = '页面控制台应无错误和警告') {
    this.assertNoErrors(message);
    this.assertNoWarnings(message);
  }
}

export function createConsoleCollector(page: Page): ConsoleErrorCollector {
  return new ConsoleErrorCollector(page);
}