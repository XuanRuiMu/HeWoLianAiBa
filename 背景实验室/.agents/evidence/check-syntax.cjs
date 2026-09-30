const fs = require('fs');
const h = fs.readFileSync('D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/背景实验室/lab-b.html', 'utf8');
const re = /<script>([\s\S]*?)<\/script>/g;
let m, i = 0, bad = 0;
while ((m = re.exec(h))) {
  try {
    new Function(m[1]);
    console.log('script', i, 'OK len=' + m[1].length);
  } catch (e) {
    console.log('script', i, 'ERR', e.message);
    bad++;
  }
  i++;
}
console.log('total', i, 'bad', bad);
