'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
function split(f){const h=fs.readFileSync(path.join(DIR,f),'utf8');const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);return{app:h.slice(0,m.index)+h.slice(m.index+m[0].length)};}
const leg=split('v1-interview-box/interview-box.html');
const cur=split('interview-box.html');
const out=[];
function grab(label,src,re,max,b,a){out.push('\n===== '+label+' =====');const r=new RegExp(re,'g');let x,c=0;while((x=r.exec(src))!==null&&(!max||c<max)){out.push('@'+x.index+': '+src.slice(Math.max(0,x.index-(b||150)),Math.min(src.length,x.index+x[0].length+(a||150))).replace(/\n/g,'\\n'));c++;}out.push('(matches '+(src.match(re)||[]).length+')');}
grab('LEGACY q.x usage',leg.app,'q\\.x\\b',6,180,180);
grab('LEGACY q.ex usage',leg.app,'q\\.ex',4,180,180);
grab('LEGACY o.tr usage',leg.app,'o\\.tr',3,180,180);
grab('LEGACY lvl/priority/src in code',leg.app,'\\.(lvl|priority|src)\\b',8,120,120);
grab('CURRENT S.imports',cur.app,'S\\.imports',6,180,180);
grab('CURRENT import file handler',cur.app,'\\.json|FileReader',8,160,160);
fs.writeFileSync(path.join(DIR,'_audit','rt19.txt'),out.join('\n'));
console.log('ok');
