'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const h=fs.readFileSync(path.join(DIR,'interview-box.html'),'utf8');
const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
const app=h.slice(0,m.index)+h.slice(m.index+m[0].length);
const out=[];
function show(label,src,max,b,a){
  out.push('\n===== '+label+' =====');
  const re=new RegExp(src,'g');let x,c=0;
  while((x=re.exec(app))!==null){
    out.push('--- @'+x.index+' --- '+app.slice(Math.max(0,x.index-(b||90)),Math.min(app.length,x.index+x[0].length+(a||90))).replace(/\n/g,'\\n'));
    c++;if(max&&c>=max)break;
  }
  out.push('(matches '+c+')');
}
show('q.x / o.x','\\bq\\.x\\b|\\bo\\.x\\b|\\.x===|x===1|\\.x\\s*\\?\\s*1',25,110,110);
show('q.f flags','q\\.f\\b|\\bo\\.f\\b|\\.f===',25,110,110);
show('q.p / q.c','q\\.p\\b|q\\.c\\b|\\bo\\.p\\b|\\bo\\.c\\b',25,110,110);
show('bank tr usage','\\.tr\\b|tr\\[',25,110,110);
show('mkQ body + tagQ','function\\s+mkQ\\(',1,0,900);
show('rebuild/bank load','QS=\\[\\]|PARTS_BOOK',6,200,300);
fs.writeFileSync(path.join(DIR,'_audit','rt4.txt'),out.join('\n'));
console.log('ok');
