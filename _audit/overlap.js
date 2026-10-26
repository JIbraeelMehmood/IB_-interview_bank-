'use strict';
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
function bank(f){const h=fs.readFileSync(path.join(DIR,f),'utf8');const m=h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);return JSON.parse(m[1].trim());}
const v1=bank('v1-interview-box/interview-box.html');
const cur=bank('interview-box.html');
function norm(s){return String(s||'').toLowerCase().replace(/^q\d+\.\s*/,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();}
const v1k={};v1.forEach(function(x){v1k[norm(x.q)]=(v1k[norm(x.q)]||0)+1;});
let hit=0,miss=0;const hitIds=[];
cur.forEach(function(x){if(v1k[norm(x.q)]){hit++;hitIds.push(x.id);}else miss++;});
console.log('v1 bank='+v1.length+' cur bank='+cur.length);
console.log('cur records whose normalized text exists in v1: '+hit);
console.log('cur records with NO v1 twin: '+miss);
console.log('v1 normalized distinct keys: '+Object.keys(v1k).length);
const curK={};cur.forEach(function(x){curK[norm(x.q)]=(curK[norm(x.q)]||0)+1;});
let both=0;Object.keys(curK).forEach(function(k){if(v1k[k])both++;});
console.log('normalized keys present in BOTH banks: '+both);
// id collisions
const v1ids=new Set(v1.map(function(x){return x.id;}));
console.log('id collisions cur vs v1: '+cur.filter(function(x){return v1ids.has(x.id);}).length);
console.log('sample hits: '+hitIds.slice(0,12).join(', '));
fs.writeFileSync(path.join(DIR,'_audit','overlap.txt'),[
 'v1='+v1.length,'cur='+cur.length,'overlap_text='+hit,'cur_only='+miss,'v1_distinct_keys='+Object.keys(v1k).length,'shared_keys='+both,'id_collisions='+cur.filter(function(x){return v1ids.has(x.id);}).length
].join('\n'));
