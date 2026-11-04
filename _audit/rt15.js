'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const h=fs.readFileSync(path.join(DIR,'interview-box.html'),'utf8');
const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
const app=h.slice(0,m.index)+h.slice(m.index+m[0].length);
const out=[];
const re=/\.lvl\b/g;let x,c=0;
while((x=re.exec(app))!==null&&c<14){
  out.push('@'+x.index+': '+app.slice(Math.max(0,x.index-160),Math.min(app.length,x.index+160)).replace(/\n/g,'\\n'));
  c++;
}
out.push('(matches '+(app.match(/\.lvl\b/g)||[]).length+')');
fs.writeFileSync(path.join(DIR,'_audit','rt15.txt'),out.join('\n'));
console.log('ok');
