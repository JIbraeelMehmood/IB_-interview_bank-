'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const out=[];
function bankOf(f){const h=fs.readFileSync(path.join(DIR,f),'utf8');const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);return {html:h,bank:JSON.parse(m[1].trim()),raw:m[1]};}
const cur=bankOf('interview-box.html'), leg=bankOf('v1-interview-box/interview-box.html');
out.push('=== CURRENT embedded bank: sample record ===');
out.push(JSON.stringify(cur.bank[0],null,1));
out.push('\n=== CURRENT: s values ===');
const sD={};cur.bank.forEach(function(x){sD[x.s]=(sD[x.s]||0)+1;});out.push(JSON.stringify(sD));
out.push('=== CURRENT: lvl values ===');
const lD={};cur.bank.forEach(function(x){lD[x.lvl]=(lD[x.lvl]||0)+1;});out.push(JSON.stringify(lD));
out.push('=== CURRENT: src values ===');
const srD={};cur.bank.forEach(function(x){srD[x.src]=(srD[x.src]||0)+1;});out.push(JSON.stringify(srD));
out.push('=== CURRENT: priority values ===');
const pD={};cur.bank.forEach(function(x){pD[x.priority]=(pD[x.priority]||0)+1;});out.push(JSON.stringify(pD));
out.push('=== CURRENT: t sample ===');
out.push(JSON.stringify(cur.bank[0].t));
const tcount={};cur.bank.forEach(function(x){(Array.isArray(x.t)?x.t:[]).forEach(function(v){tcount[v]=(tcount[v]||0)+1;});});
out.push('t tags: '+JSON.stringify(tcount));
out.push('\n=== CURRENT: does any record have tr/ex/x/p/c/f? ===');
['tr','ex','x','p','c','f'].forEach(function(k){out.push('  '+k+': '+cur.bank.filter(function(x){return x[k]!==undefined;}).length);});
out.push('\n=== LEGACY embedded bank: sample record ===');
out.push(JSON.stringify(leg.bank[0],null,1));
const lsD={};leg.bank.forEach(function(x){lsD[x.s]=(lsD[x.s]||0)+1;});out.push('legacy s: '+JSON.stringify(lsD));
const llD={};leg.bank.forEach(function(x){llD[x.l]=(llD[x.l]||0)+1;});out.push('legacy l: '+JSON.stringify(llD));
const lpD={};leg.bank.forEach(function(x){lpD[x.p||'(empty)']=(lpD[x.p||'(empty)']||0)+1;});out.push('legacy p: '+JSON.stringify(lpD));
const lcD={};leg.bank.forEach(function(x){lcD[x.c||'(empty)']=(lcD[x.c||'(empty)']||0)+1;});out.push('legacy c: '+JSON.stringify(lcD));
const lfD={};leg.bank.forEach(function(x){lfD[x.f||'(empty)']=(lfD[x.f||'(empty)']||0)+1;});out.push('legacy f: '+JSON.stringify(lfD));
out.push('legacy tr records: '+leg.bank.filter(function(x){return x.tr;}).length+'  ex: '+leg.bank.filter(function(x){return x.ex;}).length+'  x=1: '+leg.bank.filter(function(x){return x.x===1;}).length);
out.push('\n=== CLEAN JSON ===');
const cl=JSON.parse(fs.readFileSync(path.join(DIR,'interview-box-banks-clean.json'),'utf8'));
out.push('type: '+(Array.isArray(cl)?'array':'object')+'  keys: '+(Array.isArray(cl)?'n/a':JSON.stringify(Object.keys(cl))));
if(Array.isArray(cl)){out.push('records: '+cl.length);out.push('record keys: '+JSON.stringify(cl.reduce(function(a,x){Object.keys(x).forEach(function(k){a[k]=(a[k]||0)+1;});return a;},{})));out.push('sample: '+JSON.stringify(cl[0],null,1));}
else{Object.keys(cl).forEach(function(k){out.push('  '+k+': '+(Array.isArray(cl[k])?cl[k].length+' records':'type '+typeof cl[k]));});}
fs.writeFileSync(path.join(DIR,'_audit','final.txt'),out.join('\n'));
console.log('ok');
