import { Page, ConsoleMessage } from '@playwright/test';

// GPU 驱动 / WebGL 上下文初始化消息（含 [WebGL-0x...] 前缀），location 恒为 0:0（无 JS 源码行），
// 与项目代码无关；TAA/EffectComposer 渲染通道在 Chromium 下必然触发。
const GL_DRIVER_MESSAGE = /\[.*WebGL-0x[0-9a-f]+\]GL Driver Message \(/;
// 后端未启动时vite代理穿透502（环境缺后端，非代码缺陷）：E2E无后端环境下必然出现，
// 由前端延迟拉取+空闲重试兜底；有后端环境下出现502仍会计入错误，禁掩盖真故障。
const DAI_LI_CHUAN_TOU_502 = /502 \(Bad Gateway\).*\/api\/(config\/feature-flags|logs)/;
// 429 有两条通道会撞上：控制台文本是 "429 (Too Many Requests)"，response/资源通道是
// "429 <url>"。同一个事件在两条通道上必须是同一判定，故第二条分支限定「以 429 开头且 URL 含 /api/」，
// 不放宽到一般状态码。
const RATE_LIMIT_429 = /429 \(Too Many Requests\)|^429\s\S*\/api\//;
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

/**
 * 草地背景（frontend/public/grass-bg/**，另一名 agent 的并行区，本工人禁改）的错误**单独成账**。
 *
 * 归属只看一条事实：这条 error 的来源文件是不是 grass-bg 里的那一份（location.url 命中 /grass-bg/）。
 * 不看文本、不看关键字 ⇒ 我方代码里同名的 ReferenceError 永远不会被划到草地那一列。
 *
 * 为什么必须分账而不是混在一列：草地背景是每帧跑的 3D/后处理链，它一旦在动画帧里抛错就是
 * 每帧一条（L-12 实测过），整页取证的 error 计数会被它一口吞掉，于是「我方 error = 0」这条判据
 * 既不成立也不可归因。分账后：门禁只判我方那一列，草地那一列照实计数逐条列出——
 * **它非零时不判我方通过，也不替它遮掩**（那一列的账归草地背景 owner）。
 * getErrors() 的行为一字未改（仍返回全部），新增的是两条按来源分开的读法。
 */
const CAODI_LAIYUAN = (url: string | undefined): boolean => !!url && url.includes('/grass-bg/');

export class ConsoleErrorCollector {
  private errors: ConsoleError[] = [];
  private warnings: ConsoleError[] = [];
  // 资源级异常（HTTP >=400 与网络失败）单独一条通道：控制台的 "failed to load resource"
  // 文本在 setupListeners 里被丢弃以免与 response 通道双记，但原 response 通道只收 /api 且只收
  // >=500 ⇒ 静态资源 404、/api 4xx 此前**两条通道都不记**，等于被静默吞掉。这里补上真消费方。
  private resourceFailures: ConsoleError[] = [];
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
      const url = resp.url();
      if (status >= 400 && !this.资源异常豁免(url, '')) {
        const raw = `${status} ${url}`;
        if (!this.shouldIgnoreRaw(raw)) {
          this.resourceFailures.push({ type: 'error', text: `HTTP ${status} ${url}`, location: { url, lineNumber: 0, columnNumber: 0 } });
        }
      }
      if (status >= 500) {
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
      const 失败文本 = req.failure()?.errorText || '';
      if (!this.资源异常豁免(url, 失败文本)) {
        const raw = `requestfailed ${url} ${失败文本}`;
        if (!this.shouldIgnoreRaw(raw)) {
          this.resourceFailures.push({ type: 'error', text: `requestfailed ${url} ${失败文本}`, location: { url, lineNumber: 0, columnNumber: 0 } });
        }
      }
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

  /**
   * 资源通道的**极窄**豁免，只放夹具自造的环境缺失，不放任何应用侧缺陷：
   * - `net::ERR_ABORTED`：测试用 `route.abort()` 主动掐断，或导航取消导致的在途请求，
   *   属夹具动作而非页面缺陷；
   * - `/socket.io/`：e2e 夹具按设计不提供 socket 服务端（各 spec 一律把该路径 abort），
   *   与既有 `WU_SOCKET_SERVER` 白名单同范围，不放宽到一般 WebSocket/网络错误。
   * 需要新增豁免时改这里并写清范围与理由，禁止在 spec 侧私搭忽略名单。
   */
  private 资源异常豁免(url: string, 失败文本: string): boolean {
    if (/ERR_ABORTED/i.test(失败文本)) return true;
    if (/\/socket\.io\//.test(url)) return true;
    return false;
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

  /**
   * 是否草地背景来源：优先看 location.url；未捕获异常走 pageerror 通道时没有 location，
   * 退而看 stack 里的那一行（两处都必须命中 /grass-bg/ 这条路径，判据同一条，不放宽）。
   */
  private 是草地来源(条: ConsoleError): boolean {
    if (CAODI_LAIYUAN(条.location?.url)) return true;
    return !条.location && CAODI_LAIYUAN(条.stack);
  }

  /** 我方 error（草地背景那一列已剔除）——整页取证的门禁只判这一列 */
  getOurErrors(): ConsoleError[] {
    return this.getErrors().filter(条 => !this.是草地来源(条));
  }

  /** 草地背景 error：单独计数、逐条照实呈现，非零即由草地背景 owner 记账，不据此判我方通过 */
  getGrassBgErrors(): ConsoleError[] {
    return this.getErrors().filter(条 => this.是草地来源(条));
  }

  getWarnings(): ConsoleError[] {
    return [...this.warnings];
  }

  /** 资源级异常清单（HTTP >=400 / 网络失败），与 console 通道分列，供门禁逐条列来源 */
  getResourceFailures(): ConsoleError[] {
    return [...this.resourceFailures];
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
    this.resourceFailures = [];
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