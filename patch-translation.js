'use strict';
/**
 * patch-translation.js
 * Improves trGet with a fallback chain for Roman Urdu:
 *   ru → ur → hi (so if Roman Urdu translation not found, use Urdu, then Hindi)
 * Also adds a trGetBest(id, lang) helper.
 */
const fs   = require('fs');
const path = require('path');
const HTML = path.join(__dirname, 'interview-box.html');

let h = fs.readFileSync(HTML, 'utf-8');

// ── 1. Improve trGet with fallback chain ──────────────────────────────────
const OLD_TR_GET = `function trGet(id,lang){var T=TR[id+'|'+lang];if(T)T.t=Date.now();return T||null}`;

const NEW_TR_GET = `function trGet(id,lang){
  var T=TR[id+'|'+lang];
  if(T){T.t=Date.now();return T;}
  // Fallback chain: Roman Urdu → Urdu → Hindi (closest match)
  var fallbacks={ru:['ur','hi'],ur:['ru','hi'],hi:['ur','ru'],pa:['ur','hi']};
  var chain=fallbacks[lang]||[];
  for(var fi=0;fi<chain.length;fi++){var T2=TR[id+'|'+chain[fi]];if(T2){T2.t=Date.now();return T2;}}
  return null;
}
// trGetBest: returns translation object with best available language label
function trGetBest(id,lang){
  var T=trGet(id,lang);
  if(!T)return null;
  return T;
}`;

if (!h.includes(OLD_TR_GET)) {
  console.error('trGet: NOT FOUND');
  process.exit(1);
}
h = h.replace(OLD_TR_GET, NEW_TR_GET);
console.log('✓ trGet improved with fallback chain');

// ── 2. Add a ruToRoman() helper for client-side Urdu→Roman Urdu conversion ──
// Inject after trGetBest, before the next function
const INJECT_AFTER = `function trGetBest(id,lang){
  var T=trGet(id,lang);
  if(!T)return null;
  return T;
}`;

const ROMAN_HELPER = `
// Roman Urdu pronunciation hints — common Urdu words mapped to Roman phonetics
var RU_HINTS={
  'ہے':'hai','ہیں':'hain','کا':'ka','کی':'ki','کے':'ke','کو':'ko',
  'سے':'se','میں':'mein','اور':'aur','نہیں':'nahin','کیا':'kya',
  'یہ':'yeh','وہ':'woh','آپ':'aap','ہم':'hum','تم':'tum',
  'اگر':'agar','لیکن':'lekin','صرف':'sirf','بھی':'bhi',
  'کرنا':'karna','کریں':'karein','ہوتا':'hota','ہوتی':'hoti',
  'جاتا':'jata','جاتی':'jati','مطلب':'matlab','جب':'jab','تب':'tab',
  'کیسے':'kaise','کیوں':'kyun','ہوگا':'hoga','ٹھیک':'theek',
  'بات':'baat','پھر':'phir','بہت':'bohot','ایک':'ek',
  'اچھا':'achha','سمجھ':'samajh','پتا':'pata','لگتا':'lagta',
  'یاد':'yaad','ضرورت':'zaroorat','پورا':'poora','اتنا':'itna',
  'کچھ':'kuch','سب':'sab','ہر':'har','بس':'bas'
};
function urToRoman(text){
  if(!text)return '';
  return text.split(' ').map(function(w){
    var s=w.replace(/[۔،؟!]/g,'');
    return RU_HINTS[s]||w;
  }).join(' ');
}
// Detect if text is predominantly Urdu script (>25% Arabic-range chars)
function isUrduScript(t){return typeof arabicShare==='function'&&arabicShare(t)>0.25;}
`;

h = h.replace(INJECT_AFTER, INJECT_AFTER + ROMAN_HELPER);
console.log('✓ urToRoman() helper + RU_HINTS added');

// ── 3. Write result ──────────────────────────────────────────────────────────
fs.writeFileSync(HTML, h, 'utf-8');
const size = fs.statSync(HTML).size;
console.log('✅  Translation improvements written →', path.basename(HTML), '('+size+' bytes)');

// Verify
const trGetOk = fs.readFileSync(HTML,'utf-8').includes('function trGetBest(');
const ruOk    = fs.readFileSync(HTML,'utf-8').includes('function urToRoman(');
console.log('   trGetBest:', trGetOk?'✓':'✗', ' urToRoman:', ruOk?'✓':'✗');
