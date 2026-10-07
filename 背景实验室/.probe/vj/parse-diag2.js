const j = require(process.argv[2]);
const d = j.dumpMeshes;
const all = (d.sample || []).concat([]);
// fall back to reconstruct from uniqueNames
function namesContaining(regex) {
  const out = [];
  for (const k of Object.keys(d.uniqueNames || {})) if (regex.test(k)) out.push(k);
  return out;
}
console.log('=== tree-like names ===');
console.log(JSON.stringify(namesContaining(/tree|trunk|foliage|dead/i), null, 1));
console.log('=== rocks / islands ===');
console.log(JSON.stringify(namesContaining(/rock|basalt|island/i), null, 1));
console.log('=== props ===');
console.log(JSON.stringify(namesContaining(/campfire|sparks|fire|light/i), null, 1));
console.log('=== sky / water / misc ===');
console.log(JSON.stringify(namesContaining(/sky|water|cloud|butterfly|bird/i), null, 1));
console.log('=== placed ===');
console.log(JSON.stringify(namesContaining(/^pl-/), null, 1));
console.log('=== placed-x ===');
console.log(JSON.stringify(namesContaining(/^pl-x-/), null, 1));
console.log('=== top 30 unique names (no Grass_*) ===');
const filtered = Object.keys(d.uniqueNames || {}).filter(k => !/^Grass_chunk/.test(k));
console.log(JSON.stringify(filtered.slice(0, 50), null, 1));
console.log('=== TOTAL UNIQUE NAMES (no Grass_*) ===');
console.log(filtered.length);