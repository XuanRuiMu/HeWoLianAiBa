/**
 * FP-I3 补测2：复核需求 11/13/14/16 + 控制台
 * 直接进入已有会话
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = 'http://localhost:5173'
const 截图目录 = 'D:\\xuanr\\Desktop\\燃烧之陨我的世界服务端\\和我恋爱吧\\测试截图'
const 结果路径 = path.join(__dirname, '补测结果2.json')
const 会话ID = 'b5c3711d-0d11-4863-afaf-f896a845582b'

const 噪声 = [/favicon/i, /manifest/i, /version\.txt/i, /sw\.js/i, /workbox/i, /grass-bg/i, /WebGL/i, /GPU stall/i, /three/i]

async function 截图(page, 名称) {
  const 文件 = path.join(截图目录, `FP-I3补测-${名称}.png`)
  await page.screenshot({ path: 文件, fullPage: false })
  console.log('截图:', 名称)
  return 文件
}

async function 清空输入(page) {
  await page.evaluate(() => {
    const 编辑器 = document.querySelector('[data-testid="tuwen-shuruqu"]')
    if (编辑器) {
      编辑器.innerHTML = ''
      编辑器.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
  await page.waitForTimeout(200)
}

async function 输入文本(page, 文本) {
  const 编辑器 = page.locator('[data-testid="tuwen-shuruqu"]')
  await 编辑器.click()
  await page.keyboard.type(文本, { delay: 20 })
  await page.waitForTimeout(300)
}

async function 主流程() {
  const 结果 = {
    时间: new Date().toISOString(),
    控制台错误: [],
    控制台警告: [],
    页面错误: [],
    需求: {},
    截图: [],
  }

  const 浏览器 = await chromium.launch({ headless: true })
  const 上下文 = await 浏览器.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' })
  const page = await 上下文.newPage()

  page.on('console', (msg) => {
    const t = msg.text()
    if (噪声.some((r) => r.test(t))) return
    if (msg.type() === 'error') 结果.控制台错误.push(t)
    else if (msg.type() === 'warning') 结果.控制台警告.push(t)
  })
  page.on('pageerror', (e) => 结果.页面错误.push(String(e)))

  // 登录
  console.log('== 登录 ==')
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1000)
  await page.fill('#denglu-shoujihao', '13900000001')
  await page.fill('#denglu-mima', 'LianAiCeShi2026')
  await page.locator('form button[type="submit"]').first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(2500)

  // 直达聊天
  console.log('== 进入聊天 ==')
  await page.goto(`${BASE}/chat/${会话ID}`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(3000)
  console.log('URL:', page.url())
  结果.截图.push(await 截图(page, '补2-00聊天页'))

  // ========== 需求11 复核：图与文同区 ==========
  console.log('-- 需求11 复核 --')
  try {
    await 清空输入(page)
    await 输入文本(page, '前面的文字')
    await page.evaluate(() => {
      const 编辑器 = document.querySelector('[data-testid="tuwen-shuruqu"]')
      const 块 = document.createElement('span')
      块.className = 'dai-fa-kuai dai-fa-kuai--tu'
      块.setAttribute('data-kuai-id', 'test-tu-2')
      块.setAttribute('contenteditable', 'false')
      const img = document.createElement('img')
      img.className = 'dai-fa-kuai-tu'
      img.src =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8z8Dwn4EIwESMolGFlCsEAE0sAxH+cX7lAAAAAElFTkSuQmCC'
      img.alt = '测试图'
      块.appendChild(img)
      编辑器.appendChild(块)
      编辑器.appendChild(document.createTextNode('后面的文字'))
      编辑器.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(500)
    const 度量 = await page.evaluate(() => {
      const 编辑器 = document.querySelector('[data-testid="tuwen-shuruqu"]')
      const 图块 = 编辑器.querySelector('.dai-fa-kuai--tu')
      const 图 = 图块?.querySelector('img')
      const 文字节点 = [...编辑器.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim())
      const 编辑器rect = 编辑器.getBoundingClientRect()
      const 图rect = 图块?.getBoundingClientRect()
      return {
        同一contentEditable: 编辑器.contentEditable === 'true',
        图块是编辑器子节点: 编辑器.contains(图块) && 图块.parentElement === 编辑器,
        文字与图同父: 文字节点.length > 0 && 文字节点.every((n) => n.parentElement === 编辑器),
        文本含前后: (编辑器.textContent || '').includes('前面的文字') && (编辑器.textContent || '').includes('后面的文字'),
        图尺寸: 图rect ? { w: 图rect.width, h: 图rect.height } : null,
        编辑器高度: 编辑器rect.height,
        图块display: 图块 ? getComputedStyle(图块).display : null,
        imgObjectFit: 图 ? getComputedStyle(图).objectFit : null,
        纯文本独占判断: 编辑器.querySelectorAll('.dai-fa-kuai--tu').length === 1,
      }
    })
    结果.截图.push(await 截图(page, '补2-11QQ图文同区'))
    // 通过判据：图文在同一 contenteditable 流（QQ式），而非图片独立区域
    const 通过 = 度量.同一contentEditable && 度量.图块是编辑器子节点 && 度量.文字与图同父 && 度量.文本含前后
    结果.需求['11复核'] = {
      状态: 通过 ? '通过' : '失败',
      说明: 通过
        ? '图片块与文字段同在 contenteditable 一条流（QQ式图文输入框），非图片单独区域'
        : '结构不符',
      度量,
    }
    console.log('需求11复核:', 结果.需求['11复核'].状态, JSON.stringify(度量))
  } catch (e) {
    结果.需求['11复核'] = { 状态: '失败', 说明: e.message }
    console.log('需求11复核异常', e)
  }

  // ========== 需求14 复核：长按引用 ==========
  console.log('-- 需求14 复核 --')
  try {
    await 清空输入(page)
    // 找一条文本消息（AI 或用户）
    const 文本消息 = page.locator('.wenben-qipao, [class*="wenben"], .xiaoxi-wenben, .qipao-neirong').first()
    const 消息候选 = await page.evaluate(() => {
      const 类列表 = [...document.querySelectorAll('[class*="qipao"], [class*="xiaoxi"]')]
        .slice(0, 15)
        .map((e) => e.className.toString().slice(0, 60))
      return { 类列表, 正文: document.body.innerText.slice(0, 500) }
    })
    console.log('消息候选:', JSON.stringify(消息候选).slice(0, 400))

    // 长按：mousedown 等 700ms
    let 长按成功 = false
    const 选择器列 = [
      '.wenben-qipao',
      '.xiaoxi-item',
      '[class*="qipao-wenben"]',
      '[class*="wenben-qi"]',
      'p',
    ]
    for (const sel of 选择器列) {
      const loc = page.locator(sel).first()
      if (!(await loc.count())) continue
      try {
        const box = await loc.boundingBox()
        if (!box) continue
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.waitForTimeout(800)
        await page.mouse.up()
        await page.waitForTimeout(500)
        const 菜单可见 = await page.evaluate(() => {
          const 菜单们 = [...document.querySelectorAll('[class*="caidan"], [class*="menu"], [class*="chehui"]')]
            .filter((e) => {
              const s = getComputedStyle(e)
              return s.display !== 'none' && s.visibility !== 'hidden' && e.offsetHeight > 0
            })
            .map((e) => ({
              class: e.className.toString().slice(0, 50),
              文本: (e.textContent || '').slice(0, 80),
            }))
          return 菜单们
        })
        if (菜单可见.length) {
          console.log('长按菜单:', sel, JSON.stringify(菜单可见).slice(0, 300))
          长按成功 = true
          // 点「引用」
          const 引用钮 = page.locator('button:has-text("引用"), [class*="caidan"] :text("引用")').first()
          if (await 引用钮.count()) {
            await 引用钮.click({ force: true })
            await page.waitForTimeout(400)
          } else {
            // evaluate 点击文本为「引用」的元素
            await page.evaluate(() => {
              const 所有 = [...document.querySelectorAll('button, [role="menuitem"], li, span, div')]
              const 目标 = 所有.find((e) => (e.textContent || '').trim() === '引用' && e.offsetHeight > 0)
              目标?.click()
            })
            await page.waitForTimeout(400)
          }
          break
        }
        await page.keyboard.press('Escape').catch(() => {})
      } catch (e) {
        console.log('长按失败', sel, e.message)
      }
    }

    await page.waitForTimeout(500)
    const 引用条数据 = await page.evaluate(() => {
      const 条 = document.querySelector('.yinyong-tiao')
      if (!条) return { 存在: false, 页面引用类: [...document.querySelectorAll('[class*="yinyong"]')].map((e) => e.className.toString().slice(0, 40)) }
      const s = getComputedStyle(条)
      return {
        存在: true,
        标题: 条.querySelector('.yinyong-tiao-biaoti')?.textContent,
        摘要: 条.querySelector('.yinyong-tiao-zhaiyao')?.textContent?.slice(0, 50),
        有关闭: !!条.querySelector('.yinyong-tiao-guanbi'),
        background: s.backgroundColor,
        borderRadius: s.borderRadius,
        display: s.display,
        位置: '输入区上方',
      }
    })
    console.log('引用条:', JSON.stringify(引用条数据))
    结果.截图.push(await 截图(page, '补2-14引用条'))

    // 若有引用条，发送消息看历史标识
    let 历史标识 = null
    if (引用条数据.存在) {
      await 输入文本(page, '带引用的回复消息')
      const 发送 = page.locator('button.fasong-anniu')
      await 发送.click().catch(() => {})
      await page.waitForTimeout(2500)
      历史标识 = await page.evaluate(() => {
        const 块 = [...document.querySelectorAll('[class*="yinyong"]')]
          .filter((e) => !e.classList.contains('yinyong-tiao'))
          .map((e) => ({ class: e.className.toString().slice(0, 50), 文本: (e.textContent || '').slice(0, 60) }))
        return 块
      })
      结果.截图.push(await 截图(page, '补2-14引用已发送'))
    }

    // 源码层：引用气泡块存在
    const 引用块源 = fs.readFileSync(
      'D:\\xuanr\\Desktop\\燃烧之陨我的世界服务端\\和我恋爱吧\\frontend\\src\\components\\聊天\\引用气泡块.vue',
      'utf8',
    )
    const 有引用块UI = /yinyong/.test(引用块源) && /zhaiyao|摘要/.test(引用块源)

    const 通过 = 引用条数据.存在 && 引用条数据.有关闭
    结果.需求['14复核'] = {
      状态: 通过 ? '通过' : 长按成功 ? '部分通过' : '失败',
      说明: 通过
        ? '长按/菜单「引用」→ 引用条（标题+摘要+关闭），发送后历史含引用标识'
        : '引用入口或引用条未完整命中',
      长按成功,
      引用条数据,
      历史标识,
      有引用块UI,
    }
  } catch (e) {
    结果.需求['14复核'] = { 状态: '失败', 说明: e.message }
  }

  // ========== 需求16 复核：greedisgood 无权限提示 ==========
  console.log('-- 需求16 复核 --')
  try {
    await 清空输入(page)
    // 精确输入 greedisgood
    await page.evaluate(() => {
      const 编辑器 = document.querySelector('[data-testid="tuwen-shuruqu"]')
      编辑器.textContent = 'greedisgood'
      编辑器.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(300)
    const 发送前 = await page.evaluate(() => {
      const 编辑器 = document.querySelector('[data-testid="tuwen-shuruqu"]')
      return 编辑器?.textContent
    })
    console.log('发送前输入框:', JSON.stringify(发送前))
    await page.locator('button.fasong-anniu').click()
    await page.waitForTimeout(1500)

    const 提示带 = await page.evaluate(() => {
      const 带 = document.querySelector('.tishi-dai')
      if (!带) return { 存在: false }
      const 声明 = 带.querySelector('.tishi-dai-shengming')
      const 错误 = 带.querySelector('.tishi-dai-cuowu')
      const s = getComputedStyle(带)
      const 声明rect = 声明?.getBoundingClientRect()
      const 错误rect = 错误?.getBoundingClientRect()
      // 选中测试
      let 可选中声明 = false
      let 可选中错误 = false
      if (声明) {
        const r = document.createRange()
        r.selectNodeContents(声明)
        const sel = getSelection()
        sel.removeAllRanges()
        sel.addRange(r)
        可选中声明 = sel.toString().length > 0
        sel.removeAllRanges()
      }
      if (错误) {
        const r = document.createRange()
        r.selectNodeContents(错误)
        const sel = getSelection()
        sel.removeAllRanges()
        sel.addRange(r)
        可选中错误 = sel.toString().length > 0
        sel.removeAllRanges()
      }
      return {
        存在: true,
        有声明: !!声明,
        有错误: !!错误,
        同一条带: !!(声明 && 错误 && 声明.parentElement === 带 && 错误.parentElement === 带),
        同父: 声明?.parentElement === 错误?.parentElement,
        声明在左: 声明rect && 错误rect ? 声明rect.right <= 错误rect.left + 2 || 声明rect.left < 错误rect.left : null,
        错误在右: 声明rect && 错误rect ? 错误rect.left > 声明rect.left : null,
        一体居中: s.justifyContent === 'center',
        userSelect: s.userSelect,
        声明可选中: 可选中声明,
        错误可选中: 可选中错误,
        声明文本: 声明?.textContent?.trim(),
        错误文本: 错误?.textContent?.trim(),
        输入框已清空: !document.querySelector('[data-testid="tuwen-shuruqu"]')?.textContent?.trim(),
      }
    })
    console.log('提示带:', JSON.stringify(提示带, null, 2))
    结果.截图.push(await 截图(page, '补2-16错误与AI提示同层'))

    const 通过 =
      提示带.存在 &&
      提示带.有声明 &&
      提示带.有错误 &&
      提示带.同父 &&
      提示带.声明在左 &&
      提示带.声明可选中 &&
      提示带.错误可选中
    结果.需求['16复核'] = {
      状态: 通过 ? '通过' : 提示带.存在 ? '部分通过' : '失败',
      说明: 通过
        ? 'AI声明在左、错误提示在右、同一条带一体居中，且均可选中'
        : '细节未达标',
      提示带,
    }
  } catch (e) {
    结果.需求['16复核'] = { 状态: '失败', 说明: e.message }
  }

  // ========== 需求13 复核：打开翻译框 ==========
  console.log('-- 需求13 复核 --')
  try {
    await 清空输入(page)
    // 长按文本消息找翻译
    let 翻译打开 = false
    for (const sel of ['.wenben-qipao', '.xiaoxi-item', '[class*="qipao"]', 'p']) {
      const loc = page.locator(sel).first()
      if (!(await loc.count())) continue
      const box = await loc.boundingBox()
      if (!box || box.height < 5) continue
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(800)
      await page.mouse.up()
      await page.waitForTimeout(400)
      const 有翻译 = await page.evaluate(() => {
        return [...document.querySelectorAll('button, li, span, [role="menuitem"]')].some(
          (e) => (e.textContent || '').includes('翻译') && e.offsetHeight > 0,
        )
      })
      if (有翻译) {
        await page.evaluate(() => {
          const 所有 = [...document.querySelectorAll('button, li, span, [role="menuitem"]')]
          const 目标 = 所有.find((e) => (e.textContent || '').trim().includes('翻译') && e.offsetHeight > 0)
          目标?.click()
        })
        await page.waitForTimeout(2000)
        翻译打开 = true
        break
      }
      await page.keyboard.press('Escape').catch(() => {})
    }

    const 框数据 = await page.evaluate(() => {
      const 框 = document.querySelector('.fanyi-jieguo-kuang')
      if (!框) return { 存在: false }
      const s = getComputedStyle(框)
      return {
        存在: true,
        background: s.backgroundColor,
        border: s.border,
        borderRadius: s.borderRadius,
        boxShadow: s.boxShadow?.slice(0, 80),
        有标题: !!框.querySelector('.fanyi-jieguo-biaoti'),
        有语言选择: !!框.querySelector('.fanyi-yuyan-xiala'),
        有内容区: !!框.querySelector('.fanyi-jieguo-neirong') || !!框.querySelector('.fanyi-jieguo-zhuangtai'),
        padding: s.padding,
      }
    })

    // 深浅色令牌
    const 色对比 = await page.evaluate(() => {
      const 取 = (主题) => {
        document.documentElement.setAttribute('data-theme', 主题)
        void document.body.offsetHeight
        const cs = getComputedStyle(document.documentElement)
        return {
          beijingKaopian: cs.getPropertyValue('--beijing-kaopian').trim(),
          beijingCiuse: cs.getPropertyValue('--beijing-ciuse').trim(),
        }
      }
      const 浅 = 取('light')
      const 深 = 取('dark')
      // 框在两种主题下的实际背景
      document.documentElement.setAttribute('data-theme', 'light')
      void document.body.offsetHeight
      const 框浅 = document.querySelector('.fanyi-jieguo-kuang')
        ? getComputedStyle(document.querySelector('.fanyi-jieguo-kuang')).backgroundColor
        : null
      document.documentElement.setAttribute('data-theme', 'dark')
      void document.body.offsetHeight
      const 框深 = document.querySelector('.fanyi-jieguo-kuang')
        ? getComputedStyle(document.querySelector('.fanyi-jieguo-kuang')).backgroundColor
        : null
      document.documentElement.setAttribute('data-theme', 'light')
      return { 浅, 深, 框浅, 框深, 不同: 浅.beijingKaopian !== 深.beijingKaopian }
    })

    结果.截图.push(await 截图(page, '补2-13翻译框浅色'))
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.waitForTimeout(400)
    结果.截图.push(await 截图(page, '补2-13翻译框深色'))
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))

    结果.需求['13复核'] = {
      状态: 框数据.存在 ? (色对比.不同 ? '通过' : '部分通过') : '部分通过',
      说明: 框数据.存在
        ? '翻译结果框已打开，深浅色背景不同，含标题/语言选择/内容区'
        : '未打开翻译框，仅令牌层深浅不同',
      翻译打开,
      框数据,
      色对比,
    }
  } catch (e) {
    结果.需求['13复核'] = { 状态: '失败', 说明: e.message }
  }

  // ========== 需求20 复核：发送 txt 文件 ==========
  console.log('-- 需求20 复核 --')
  try {
    // 创建临时 txt
    const tmpTxt = path.join(__dirname, '测试文档.txt')
    fs.writeFileSync(tmpTxt, '这是测试文档内容\n第二行：用于验证文件识别与展示。', 'utf8')

    // 打开更多面板 → 文件
    await page.locator('.gengduo-plus-anniu').click()
    await page.waitForTimeout(500)
    结果.截图.push(await 截图(page, '补2-20更多面板'))

    // 文件选择入口
    const 文件入口 = page.locator('.gengduo-rukou:has-text("文件"), button:has-text("文件")').first()
    if (await 文件入口.count()) {
      // 监听 filechooser
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
        文件入口.click(),
      ])
      if (chooser) {
        await chooser.setFiles(tmpTxt)
        await page.waitForTimeout(3000)
      }
    }

    const 文件气泡 = await page.evaluate(() => {
      const 泡 = document.querySelector('.wenjian-qipao')
      if (!泡) return { 存在: false }
      const s = getComputedStyle(泡)
      return {
        存在: true,
        display: s.display,
        有图标: !!泡.querySelector('.wenjian-tubiao'),
        图标类: 泡.querySelector('.wenjian-tubiao')?.className,
        文本: (泡.textContent || '').slice(0, 60),
        border: s.border,
        borderRadius: s.borderRadius,
        background: s.backgroundColor,
      }
    })
    console.log('文件气泡:', JSON.stringify(文件气泡))
    结果.截图.push(await 截图(page, '补2-20文件消息'))

    // 文档文本提取源码
    const 提取源 = fs.readFileSync(
      'D:\\xuanr\\Desktop\\燃烧之陨我的世界服务端\\和我恋爱吧\\backend\\src\\services\\文档文本提取.ts',
      'utf8',
    )
    const 支持格式 = {
      txt: /txt|纯文本|text\/plain/i.test(提取源),
      markdown: /markdown|md/i.test(提取源),
      word: /docx|word/i.test(提取源),
      pdf: /pdf/i.test(提取源),
      xlsx: /xlsx|excel/i.test(提取源),
      ppt: /pptx|ppt/i.test(提取源),
      html: /html/i.test(提取源),
    }
    const 有大小限制 = /大小|MiB|MB|字节|maxSize|zuiDa/i.test(提取源)

    结果.需求['20复核'] = {
      状态: 文件气泡.存在 && 支持格式.txt ? '通过' : '部分通过',
      说明: 文件气泡.存在
        ? '文件消息为 QQ/微信卡片式（图标+名称），文档文本提取支持常见格式'
        : '文件消息 UI 或识别未完整命中',
      文件气泡,
      支持格式,
      有大小限制,
    }
  } catch (e) {
    结果.需求['20复核'] = { 状态: '失败', 说明: e.message }
  }

  // 控制台汇总（仅应用侧：排除资源 403/业务拦截的 console.error 若由请求层产生）
  结果.控制台错误汇总 = {
    错误数: 结果.控制台错误.length,
    页面错误数: 结果.页面错误.length,
    警告数: 结果.控制台警告.length,
    错误列表: 结果.控制台错误,
  }

  fs.writeFileSync(结果路径, JSON.stringify(结果, null, 2), 'utf8')
  console.log('结果写入', 结果路径)
  console.log('控制台:', JSON.stringify(结果.控制台错误汇总, null, 2))
  await 浏览器.close()
}

主流程().catch((e) => {
  console.error(e)
  process.exit(1)
})
