import js from '@eslint/js'
// ⚠️ 禁用静默降级。原写法 `.catch(() => null)` 曾让 typescript-eslint 缺失时
//    TS 规则整段被跳过，lint 依然返回 0 —— 一个长期存在的「假绿灯」，
//    使 `npx eslint .` 通过完全不代表编码规范合规。
//    现在让它缺失即崩，退出码非 0。
const tseslint = await import('typescript-eslint')

const tsDuan = tseslint.config(...tseslint.configs.recommended)

export default [
  {
    ignores: ['dist', 'node_modules', '*.d.ts', 'scripts/run_migration.js'],
  },
  js.configs.recommended,
  ...tsDuan,
  {
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'prefer-const': 'off',
      'no-useless-assignment': 'off',
      'no-useless-escape': 'off',
      'no-empty': 'off',
      'no-irregular-whitespace': 'off',
      'no-console': 'error',
      'preserve-caught-error': 'off',

      // ⚠️ 本项目**自有约定**：有意不使用的参数/变量一律加下划线前缀
      //    （`_客户端`、`_焦点`、`_zhuangTaiMa`、`_mbti`、`_ku` …）。
      //    规则必须认这个约定，否则 19 处「未使用」全是误报。
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // ⚠️ 关闭原因：`require()` 在本项目是**有意的懒加载**手段
      //    （`复制静态资源.js`、`AI回复调度器.ts:588`、`图像生成.ts:119` 等），
      //    且 `scripts/*.js` 本身就是 CJS。改成静态 import 会改变加载时机。
      '@typescript-eslint/no-require-imports': 'off',
      // ⚠️ 关闭原因：这 3 处（`表情.ts:19`、`文档文本提取.ts:204`、`xiangying.ts:43`）
      //    处理的**就是控制字符**（\u0000-\u001F），禁掉正则里的控制字符会让规则失效。
      'no-control-regex': 'off',
    },
  },
]
