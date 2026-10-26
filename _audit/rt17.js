'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const h=fs.readFileSync(path.join(DIR,'interview-box.html'),'utf8');
const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
const app=h.slice(0,m.index)+h.slice(m.index+m[0].length);
const out=[];
function grab(label,re,max,b,a){out.push('\n===== '+label+' =====');const r=new RegExp(re,'g');let x,c=0;while((x=r.exec(app))!==null&&(!max||c<max)){out.push('@'+x.index+': '+app.slice(Math.max(0,x.index-(b||140)),Math.min(app.length,x.index+x[0].length+(a||140))).replace(/\n/g,'\\n'));c++;}out.push('(matches '+(app.match(re)||[]).length+')');}
grab('LV map','var LV=',1,0,220);
grab('fLvl options','id="fLvl"',1,0,300);
grab('lv- class render','lv-',6,120,120);
grab('q.ex render','q\\.ex',4,150,150);
grab('TR render','TR\\[',4,150,150);
fs.writeFileSync(path.join(DIR,'_audit','rt17.txt'),out.join('\n'));
console.log('ok');
