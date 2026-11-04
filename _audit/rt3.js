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
    out.push('--- @'+x.index+' --- '+app.slice(Math.max(0,x.index-(b||100)),Math.min(app.length,x.index+x[0].length+(a||100))).replace(/\n/g,'\\n'));
    c++;if(max&&c>=max)break;
  }
  out.push('(matches '+c+')');
}
show('lvl in app code','\\blvl\\b',20,80,80);
show('priority in app code','priority',20,80,80);
show('q.l filter','\\.l===',20,90,90);
show('lvlFilter/filt','lvl',30,60,60);
show('import/export fn','(function\\s+\\w*[Ii]mport\\w*|function\\s+\\w*[Ee]xport\\w*|importFile|exportAll|\\.json\\b)',25,60,200);
fs.writeFileSync(path.join(DIR,'_audit','rt3.txt'),out.join('\n'));
console.log('ok');
