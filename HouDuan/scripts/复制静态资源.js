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

function 收集静态资源(源目录) {
  const 收集 = [];
  遍历目录(源目录, 源目录, 收集);
  return 收集.sort();
}

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
