const moShi = [
  /UNION\s+SELECT/i,
  /DROP\s+TABLE/i,
  /INSERT\s+INTO/i,
  /DELETE\s+FROM/i,
  /UPDATE\s+SET/i,
  /OR\s+['"]?1['"]?\s*=\s*['"]?1['"]?/i,
  /EXEC\s*\(/i,
  /EXECUTE\s*\(/i,
  /INFORMATION_SCHEMA/i,
  /SLEEP\s*\(/i,
  /BENCHMARK\s*\(/i,
  /LOAD_FILE\s*\(/i,
  /INTO\s+OUTFILE/i,
  /CHAR\s*\(/i,
  /CONCAT\s*\(/i,
]
const s = 'SELECT * FROM 用户'
console.log('matches', moShi.some((m) => m.test(s)))
