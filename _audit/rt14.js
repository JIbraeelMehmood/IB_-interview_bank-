'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
function split(f){const h=fs.readFileSync(path.join(DIR,f),'utf8');const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);return{head:h.slice(0,m.index),bank:m[1],tail:h.slice(m.index+m[0].length)};}
const cur=split('interview-box.html');
const out=[];
function show(label,src,max,b,a){
  out.push('\n===== '+label+' =====');
  const re=new RegExp(src,'g');let x,c=0;
  while((x=re.exec(cur.tail))!==null){
    out.push('--- @'+x.index+' --- '+cur.tail.slice(Math.max(0,x.index-(b||100)),Math.min(cur.tail.length,x.index+x[0].length+(a||100))).replace(/\n/g,'\\n'));
    c++;if(max&&c>=max)break;
  }
  out.push('(matches '+c+')');
}
show('BASE_TECHS','var\\s+BASE_TECHS',1,0,2500);
show('SRS / srs','function\\s+srsDue|function\\s+srsNext',3,40,400);
fs.writeFileSync(path.join(DIR,'_audit','rt14.txt'),out.join('\n'));
console.log('ok');
