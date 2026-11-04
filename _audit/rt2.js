'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const h=fs.readFileSync(path.join(DIR,'interview-box.html'),'utf8');
const out=[];
function show(label, src, max, before, after){
  out.push('\n========== '+label+' ==========');
  const re=new RegExp(src,'g');let m,count=0;
  while((m=re.exec(h))!==null){
    const s=Math.max(0,m.index-(before||120)), e=Math.min(h.length,m.index+m[0].length+(after||120));
    out.push('--- @'+m.index+' ---');
    out.push(h.slice(s,e).replace(/\n/g,'\\n'));
    count++;
    if(max&&count>=max)break;
  }
  out.push('(matches: '+count+')');
}
show('q.x semantics','q\\.x\\b',20,80,80);
show('lvl usage', '\\blvl\\b', 20, 100, 100);
show('priority usage', 'priority', 15, 100, 100);
show('exportJSON / importJSON', 'function\\s+(exportJSON|importJSON|doImport|doExport)\\w*\\s*\\(', 10, 60, 400);
fs.writeFileSync(path.join(DIR,'_audit','rt2.txt'),out.join('\n'));
console.log('ok');
