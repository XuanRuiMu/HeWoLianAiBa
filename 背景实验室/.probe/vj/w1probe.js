const j = require(process.argv[2]);
const w1 = j['W1-probe'];
if (!w1) { console.log('no probe'); process.exit(0); }
w1.list.forEach(function(x){ console.log(x.name, 'wpos', x.worldCenter, 'ndc', x.ndcX, ',', x.ndcY); });