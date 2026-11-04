'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
function appOf(f){const h=fs.readFileSync(path.join(DIR,f),'utf8');const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);return h.slice(0,m.index)+h.slice(m.index+m[0].length);}
const v1=appOf('v1-interview-box/interview-box.html');
const out=[];
function show(label,src,max,b,a){
  out.push('\n===== '+label+' =====');
  const re=new RegExp(src,'g');let x,c=0;
  while((x=re.exec(v1))!==null){
    out.push('--- @'+x.index+' --- '+v1.slice(Math.max(0,x.index-(b||90)),Math.min(v1.length,x.index+x[0].length+(a||90))).replace(/\n/g,'\\n'));
    c++;if(max&&c>=max)break;
  }
  out.push('(matches '+c+')');
}
show('V1 q.x usage','\\bq\\.x\\b|\\bo\\.x\\b',12,120,120);
show('V1 x: field in mkQ','x:o\\.x',4,60,200);
show('V1 s=== n semantics',"q\\.s==='n'|s==='n'",12,120,120);
show('V1 srcFlags','srcFlags',6,120,320);
fs.writeFileSync(path.join(DIR,'_audit','rt5.txt'),out.join('\n'));
console.log('ok');
