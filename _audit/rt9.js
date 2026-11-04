'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
function split(f){const h=fs.readFileSync(path.join(DIR,f),'utf8');const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);return{head:h.slice(0,m.index),bank:m[1],tail:h.slice(m.index+m[0].length)};}
const s=split('interview-box.html');const app=s.head+s.tail;
const out=[];
function show(label,src,max,b,a){
  out.push('\n===== '+label+' =====');
  const re=new RegExp(src,'g');let x,c=0;
  while((x=re.exec(app))!==null){
    out.push('--- @'+x.index+' --- '+app.slice(Math.max(0,x.index-(b||100)),Math.min(app.length,x.index+x[0].length+(a||100))).replace(/\n/g,'\\n'));
    c++;if(max&&c>=max)break;
  }
  out.push('(matches '+c+')');
}
show('cardHtml full','function\\s+cardHtml\\s*\\(',1,0,2400);
show('LAB_EX','var\\s+LAB_EX\\s*=',1,0,600);
show('q.x flag in card','q\\.x===|\\.x\\)\\?.*Fill|fill',12,140,140);
fs.writeFileSync(path.join(DIR,'_audit','rt9.txt'),out.join('\n'));
console.log('ok');
