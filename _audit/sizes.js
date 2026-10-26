'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
['interview-box.html','v1-interview-box/interview-box.html'].forEach(function(f){
  const h=fs.readFileSync(path.join(DIR,f),'utf8');
  const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
  const bank=JSON.parse(m[1].trim());
  console.log(f);
  console.log('  total file bytes : '+Buffer.byteLength(h));
  console.log('  bank script bytes: '+Buffer.byteLength(m[1]));
  console.log('  head bytes       : '+Buffer.byteLength(h.slice(0,m.index)));
  console.log('  tail bytes       : '+Buffer.byteLength(h.slice(m.index+m[0].length)));
  console.log('  bank records     : '+bank.length);
  console.log('  bank keys        : '+JSON.stringify(bank.reduce(function(a,x){Object.keys(x).forEach(function(k){a[k]=(a[k]||0)+1;});return a;},{})));
  console.log('');
});
