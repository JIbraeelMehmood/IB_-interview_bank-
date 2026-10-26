'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const h=fs.readFileSync(path.join(DIR,'interview-box.html'),'utf8');
const out=[];
function show(label, src, max){
  out.push('\n========== '+label+' ==========');
  const re=new RegExp(src,'g');let m,count=0;
  while((m=re.exec(h))!==null){
    const s=Math.max(0,m.index-200), e=Math.min(h.length,m.index+m[0].length+200);
    out.push('--- @'+m.index+' ---');
    out.push(h.slice(s,e).replace(/\n/g,'\\n'));
    count++;
    if(max&&count>=max)break;
  }
  out.push('(matches: '+count+')');
}
show('mkQ','function\\s+mkQ\\s*\\([^)]*\\)\\s*\\{',3);
show('modern','function\\s+modern\\s*\\(',4);
show('TR decl','\\bTR\\s*=\\s*\\{',4);
show('x field','\\.x\\b',40);
fs.writeFileSync(path.join(DIR,'_audit','runtime.txt'),out.join('\n'));
console.log('lines',out.length);
