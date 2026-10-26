'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const out=[];
// 1. exact filename bytes for Answers-2
fs.readdirSync(DIR).filter(function(f){return /Answers-2/.test(f);}).forEach(function(f){
  out.push('FILENAME: ['+f+'] len='+f.length);
  out.push('  ends with ")": '+/\)$/.test(f));
  out.push('  ends with ".md": '+/\.md$/.test(f));
});
const imp='Senior PHP Laravel Interview 5 Server Questions + Top 25 (Roman Urdu Answers-2.md';
out.push('\nimport-banks-clean.js key exists on disk: '+fs.existsSync(path.join(DIR,imp)));
const imp2=imp+')';
out.push('key + ")" exists on disk: '+fs.existsSync(path.join(DIR,imp2)));
// 2. x usage anywhere in v1 app code
const hv=fs.readFileSync(path.join(DIR,'v1-interview-box/interview-box.html'),'utf8');
const mv=hv.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
const appv=hv.slice(0,mv.index)+hv.slice(mv.index+mv[0].length);
const xhits=(appv.match(/\.x\b/g)||[]).length;
out.push('\nv1 app code ".x" occurrences: '+xhits);
const rx=new RegExp('\\.x\\b','g');let m2,c=0;
while((m2=rx.exec(appv))!==null&&c<8){out.push('  @'+m2.index+': '+appv.slice(Math.max(0,m2.index-90),m2.index+90).replace(/\n/g,'\\n'));c++;}
// 3. current app .x occurrences
const hc=fs.readFileSync(path.join(DIR,'interview-box.html'),'utf8');
const mc=hc.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
const appc=hc.slice(0,mc.index)+hc.slice(mc.index+mc[0].length);
out.push('\ncurrent app code ".x" occurrences: '+(appc.match(/\.x\b/g)||[]).length);
fs.writeFileSync(path.join(DIR,'_audit','rt20.txt'),out.join('\n'));
console.log(out.join('\n'));
