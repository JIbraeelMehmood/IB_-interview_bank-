'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const h=fs.readFileSync(path.join(DIR,'interview-box.html'),'utf8');
const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
const app=h.slice(0,m.index)+h.slice(m.index+m[0].length);
const out=[];
function grab(label,re,max,b,a){out.push('\n===== '+label+' =====');const r=new RegExp(re,'g');let x,c=0;while((x=r.exec(app))!==null&&(!max||c<max)){out.push('@'+x.index+': '+app.slice(Math.max(0,x.index-(b||120)),Math.min(app.length,x.index+x[0].length+(a||120))).replace(/\n/g,'\\n'));c++;}out.push('(matches '+(app.match(re)||[]).length+')');}
grab('filter fn (opt.src/fl.imp)', 'if\\(opt\\.src&&!\\(q\\.raw', 2, 700, 700);
grab('src filter UI population', 'fSrc|fCat', 8, 100, 100);
grab('x flag usage', 'q\\.x\\b', 6, 150, 150);
grab('s==my usage', "\\.s==='my'|s==='my'", 8, 130, 130);
grab('PARTS_BOOK use', 'PARTS_BOOK', 8, 160, 160);
fs.writeFileSync(path.join(DIR,'_audit','rt16.txt'),out.join('\n'));
console.log('ok');
