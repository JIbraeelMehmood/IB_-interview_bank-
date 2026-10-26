'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const h=fs.readFileSync(path.join(DIR,'interview-box.html'),'utf8');
const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
const app=h.slice(0,m.index)+h.slice(m.index+m[0].length);
const out=[];
function grab(label,re,max,b,a){out.push('\n===== '+label+' =====');const r=new RegExp(re,'g');let x,c=0;while((x=r.exec(app))!==null&&(!max||c<max)){out.push('@'+x.index+': '+app.slice(Math.max(0,x.index-(b||200)),Math.min(app.length,x.index+x[0].length+(a||200))).replace(/\n/g,'\\n'));c++;}out.push('(matches '+(app.match(re)||[]).length+')');}
grab('flags UI','fl\\.imp|data-fl',10,180,180);
grab('delete handler',"act==='del'",1,80,400);
grab('renderFlagChips','function renderFlagChips',1,0,1200);
grab('S.my load','S\\.my',6,150,150);
fs.writeFileSync(path.join(DIR,'_audit','rt18.txt'),out.join('\n'));
console.log('ok');
