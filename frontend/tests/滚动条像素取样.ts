import type { Page } from '@playwright/test';

// 滚动条像素取证：DOM 的 offsetWidth/clientWidth 取整到 1px，且被 `::-webkit-scrollbar` 自绘的
// 滚动条不能靠 computed 属性看出「到底画没画」，所以直接对元素截图做逐列取色。
// 输出：条宽像素（从最右列往左连续与底色不同的列数）、thumb/track/底色（用于证明三者可分辨）。

type 条取样 = { 条宽: number; thumb色: string; track色: string; 底色: string };

function 色串(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`;
}

function 相差(a: string, b: string): number {
  const x = a.match(/\d+/g)!.map(Number);
  const y = b.match(/\d+/g)!.map(Number);
  return Math.max(Math.abs(x[0] - y[0]), Math.abs(x[1] - y[1]), Math.abs(x[2] - y[2]));
}

export async function scanScrollStrip(
  page: Page,
  选择器: string,
  参考条宽: number,
): Promise<条取样> {
  const 图 = await page.locator(选择器).screenshot();
  const { default: sharp } = await import('sharp');
  const { data, info } = await sharp(图).raw().toBuffer({ resolveWithObject: true });
  const { width: 宽, height: 高, channels: 道 } = info;
  const 取 = (x: number, y: number) => {
    const i = (y * 宽 + x) * 道;
    return 色串(data[i], data[i + 1], data[i + 2]);
  };
  const 安全上 = Math.min(2, Math.max(0, 高 - 1));
  const 安全下 = Math.max(安全上, 高 - 8);
  const 中线 = Math.floor((安全上 + 安全下) / 2);

  // 底色：内容区（刨掉右侧滚动条带）出现最多的颜色
  const 内容右界 = Math.max(1, 宽 - Math.round(Math.max(参考条宽, 8)) - 4);
  const 计数 = new Map<string, number>();
  for (let x = 0; x < 内容右界; x++) {
    for (let y = 安全上; y < 安全下; y++) {
      const c = 取(x, y);
      计数.set(c, (计数.get(c) ?? 0) + 1);
    }
  }
  const 底色 = [...计数.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const 条宽列 = (x: number): boolean => {
    if (x < 0 || x >= 宽) return false;
    for (let y = 安全上; y < 安全下; y++) {
      if (相差(取(x, y), 底色) > 6) return true;
    }
    return false;
  };
  let 条宽 = 0;
  while (条宽 < 宽 && 条宽列(宽 - 1 - 条宽)) 条宽++;

  const 取样列 = Math.min(宽 - 1, Math.max(0, 宽 - Math.max(4, Math.round(Math.max(条宽, 参考条宽) / 2))));
  const 多数 = (从: number, 到: number): string => {
    const 表 = new Map<string, number>();
    for (let y = Math.max(安全上, 从); y < Math.min(安全下, 到); y++) {
      const c = 取(取样列, y);
      表.set(c, (表.get(c) ?? 0) + 1);
    }
    return [...表.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 底色;
  };
  return { 条宽, thumb色: 多数(安全上, 中线), track色: 多数(中线, 安全下), 底色 };
}
