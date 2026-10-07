const j = require(process.argv[2]);
const d = j.dumpMeshes;
if (!d) { console.log('NO DUMP:', JSON.stringify(j).slice(0, 800)); process.exit(1); }
console.log('total:', d.total);
console.log('trees:', JSON.stringify(d.trees));
console.log('cam:', JSON.stringify(d.cam));
console.log('---unique names count---');
console.log(Object.keys(d.uniqueNames || {}).length);
console.log('---unique names---');
console.log(JSON.stringify(d.uniqueNames, null, 1));
console.log('---filtered sample (tree|trunk|dead|foliage|rock|island|grass) count=24---');
console.log(JSON.stringify((d.sample || []).slice(0, 24), null, 1));