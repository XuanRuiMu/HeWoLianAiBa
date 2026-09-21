/* global require, module, __dirname */
/* eslint-disable no-console -- 构建脚本 console 为唯一输出通道 */
// 构建产物补齐：tsc 只产出 .js/.d.ts/.map，src 下的非 TS 运行时资源不会进 dist，
// 而生产镜像只 COPY dist（见 backend/Dockerfile），于是「源码里读得到的资源」在生产里 ENOENT。
// 历史事故：config/审核词库/v1.json 未随产物打包 → 每条文本聊天消息在内容审核处抛 ENOENT → HTTP 500。
// 本脚本在构建期把 src 下所有非 TS 文件按同一目录结构复制进 dist，不需要改 Dockerfile。
const fs = require('fs');
const path = require('path');

const BU_FU_ZHI_HOU_ZHUI = ['.ts', '.tsx', '.map'];

function xuYaoFuZhi(相对路径) {
  const 路径段 = 相对路径.split(path.sep);
  if (路径段.includes('__tests__')) return false;
  const 文件名 = 路径段[路径段.length - 1];
  return !BU_FU_ZHI_HOU_ZHUI.some((houZhui) => 文件名.endsWith(houZhui));
}

function 遍历目录(目录, 根目录, 收集) {
  for (const 条目 of fs.readdirSync(目录, { withFileTypes: true })) {
    const 完整路径 = path.join(目录, 条目.name);
    if (条目.isDirectory()) {
      遍历目录(完整路径, 根目录, 收集);
      continue;
    }
    const 相对路径 = path.relative(根目录, 完整路径);
    if (xuYaoFuZhi(相对路径)) 收集.push(相对路径);
  }
}

/** 列出源目录下需要随构建产物分发的资源（相对源目录的路径，排序后返回，便于测试逐条断言）。 */
function 收集静态资源(源目录) {
  const 收集 = [];
  遍历目录(源目录, 源目录, 收集);
  return 收集.sort();
}

/** 把源目录下的非 TS 资源复制进目标目录，返回复制清单。 */
function 复制静态资源(源目录, 目标目录) {
  const 清单 = 收集静态资源(源目录);
  for (const 相对路径 of 清单) {
    const 目标路径 = path.join(目标目录, 相对路径);
    fs.mkdirSync(path.dirname(目标路径), { recursive: true });
    fs.copyFileSync(path.join(源目录, 相对路径), 目标路径);
  }
  return 清单;
}

module.exports = { xuYaoFuZhi, 收集静态资源, 复制静态资源 };

if (require.main === module) {
  const 源目录 = path.resolve(__dirname, '..', 'src');
  const 目标目录 = path.resolve(__dirname, '..', 'dist');
  const 清单 = 复制静态资源(源目录, 目标目录);
  console.log(`[构建] 非 TS 运行时资源已复制进 dist: ${清单.length} 个`);
  for (const 相对路径 of 清单) console.log(`  - ${相对路径.split(path.sep).join('/')}`);
}
