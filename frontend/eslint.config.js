import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    // public/** 为静态资源目录（含第三方库与打包产物），参与 lint 会导致
    // prettier 解析超大压缩文件假死（曾致 eslint . 在 Windows 下卡死 7 分钟+）
    ignores: ['dist/**', 'dist', 'node_modules/**', 'node_modules', '*.d.ts', 'public/**'],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['*.vue', '**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'off',
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'vue/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'no-redeclare': 'off',
      'no-import-assign': 'off',
      'vue/no-dupe-keys': 'off',
      'vue/no-mutating-props': 'off',
      'no-useless-escape': 'off',
      'vue/no-template-shadow': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-closing-bracket-spacing': 'off',
      'vue/html-self-closing': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
    },
  },
  {
    files: ['src/views/聊天页面.vue'],
    rules: {
      'vue/component-definition-name-casing': 'off',
    },
  },
  {
    files: ['src/__tests__/**'],
    rules: {
      'no-console': 'off',
    },
  },
)
