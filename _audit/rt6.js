'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
function split(f){const h=fs.readFileSync(path.join(DIR,f),'utf8');const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);return{head:h.slice(0,m.index),bank:m[1],tail:h.slice(m.index+m[0].length)};}
const cur=split('interview-box.html');
const app=cur.head+cur.tail;
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
show('q.ex consumption','\\bq\\.ex\\b|\\bo\\.ex\\b',10,140,140);
show('file input','type=.file',8,300,500);
show('S.my assign','S\\.my\\s*=|S\\.my\\.push',10,150,250);
show('LV map','var\\s+LV\\s*=',3,40,220);
fs.writeFileSync(path.join(DIR,'_audit','rt6.txt'),out.join('\n'));
console.log('ok');
