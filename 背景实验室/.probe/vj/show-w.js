const j = require(process.argv[2]);
['W1','W2','W3','W1-probe'].forEach(function(k){
  const v = j[k];
  if (!v) { console.log(k, 'undefined'); return; }
  console.log(k, JSON.stringify(v).slice(0, 500));
});