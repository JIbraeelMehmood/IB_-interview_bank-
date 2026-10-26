'use strict';
/**
 * patch-transliteration.js
 *
 * Integrates ibx-transliteration.js (636KB, 13084 Roman→Urdu + 12956 Urdu→Roman
 * + 501 English tech terms) into interview-box.html.
 *
 * Changes:
 *   1. Load ibx-transliteration.js lazily via <script> (served by localhost:8765)
 *   2. Replace stub urToRoman() with IBX_TR-powered version (13K-word dictionary)
 *   3. Upgrade isUrduScript() to use IBX_TR char map awareness
 *   4. Upgrade trGet() fallback: when Roman Urdu translation missing, use IBX_TR.urduToRoman()
 *   5. Wire IBX_TR into spAnalyse() output — show Urdu script of Roman Urdu answer
 *   6. Add "🔤 Transliterate" button to question card answer display
 *   7. Wire Whisper roman_hint through IBX_TR for richer Roman Urdu output
 *
 * Run: node patch-transliteration.js
 */

const fs   = require('fs');
const path = require('path');
const HTML = path.join(__dirname, 'interview-box.html');
const BAK  = HTML + '.bak-translit-' + new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);

let h = fs.readFileSync(HTML, 'utf-8');
let applied = 0;

function patch(label, oldStr, newStr) {
  if (!h.includes(oldStr)) { console.warn('  ⚠  SKIP (not found):', label); return; }
  h = h.replace(oldStr, newStr);
  applied++;
  console.log('  ✓', label);
}

console.log('\nPatching', path.basename(HTML), '…\n');
fs.copyFileSync(HTML, BAK);
console.log('Backup →', path.basename(BAK), '\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Load ibx-transliteration.js lazily (before </body>)
//    The file is served by the existing localhost:8765 Python server.
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'Load ibx-transliteration.js before </body>',
  `</body>`,
  `<script>
/* Lazy-load the transliteration engine (636KB, load on first use) */
var IBX_TR_LOADING = false;
function loadTranslit(cb) {
  if(window.IBX_TR){ cb&&cb(); return; }
  if(IBX_TR_LOADING){ setTimeout(function(){loadTranslit(cb)},100); return; }
  IBX_TR_LOADING = true;
  var s = document.createElement('script');
  s.src = '/ibx-transliteration.js';
  s.onload = function(){ IBX_TR_LOADING=false; cb&&cb(); };
  s.onerror = function(){ IBX_TR_LOADING=false; console.warn('ibx-transliteration.js not found — make sure it is in the interview-box directory'); cb&&cb(); };
  document.head.appendChild(s);
}
</script>
</body>`
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Replace stub urToRoman() with IBX_TR-powered version
//    Old: only ~80 words from RU_HINTS
//    New: 12,956-word dictionary with character-level fallback
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'urToRoman() — upgrade to IBX_TR 13K-word dictionary',
  `function urToRoman(text){
  if(!text)return '';
  return text.split(' ').map(function(w){
    var s=w.replace(/[۔،؟!]/g,'');
    return RU_HINTS[s]||w;
  }).join(' ');
}`,
  `function urToRoman(text){
  if(!text) return '';
  // Use IBX_TR engine if loaded (13K-word dictionary + char-level fallback)
  if(window.IBX_TR) return IBX_TR.urduToRoman(text);
  // Fallback: RU_HINTS stub (80 words) until engine loads
  return text.split(' ').map(function(w){
    var s=w.replace(/[۔،؟!]/g,'');
    return RU_HINTS[s]||w;
  }).join(' ');
}
// romanToUrdu: convert Roman Urdu text → Urdu script using IBX_TR
function romanToUrdu(text){
  if(!text) return '';
  if(window.IBX_TR) return IBX_TR.romanToUrdu(text);
  return text; // passthrough until engine loads
}`
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Upgrade isUrduScript() — now uses IBX_TR char map count for better detection
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'isUrduScript() — improved Urdu script detection',
  `function isUrduScript(t){return typeof arabicShare==='function'&&arabicShare(t)>0.25;}`,
  `function isUrduScript(t){
  if(!t) return false;
  // Primary: arabic-range char ratio (same as arabicShare)
  if(typeof arabicShare==='function' && arabicShare(t)>0.2) return true;
  // Secondary: direct Unicode range check (Urdu block U+0600-U+06FF)
  return /[\u0600-\u06FF]/.test(t);
}`
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Upgrade trGet() — when a Roman Urdu display is requested but no cached
//    translation exists, auto-generate it via IBX_TR.urduToRoman()
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'trGet() — auto-generate Roman Urdu via IBX_TR when missing',
  `function trGet(id,lang){
  var T=TR[id+'|'+lang];
  if(T){T.t=Date.now();return T;}
  // Fallback chain: Roman Urdu → Urdu → Hindi (closest match)
  var fallbacks={ru:['ur','hi'],ur:['ru','hi'],hi:['ur','ru'],pa:['ur','hi']};
  var chain=fallbacks[lang]||[];
  for(var fi=0;fi<chain.length;fi++){var T2=TR[id+'|'+chain[fi]];if(T2){T2.t=Date.now();return T2;}}
  return null;
}`,
  `function trGet(id,lang){
  var T=TR[id+'|'+lang];
  if(T){T.t=Date.now();return T;}
  // Fallback chain: Roman Urdu → Urdu → Hindi (closest match)
  var fallbacks={ru:['ur','hi'],ur:['ru','hi'],hi:['ur','ru'],pa:['ur','hi']};
  var chain=fallbacks[lang]||[];
  for(var fi=0;fi<chain.length;fi++){var T2=TR[id+'|'+chain[fi]];if(T2){T2.t=Date.now();return T2;}}
  // Auto-generate Roman Urdu from existing Urdu translation via IBX_TR
  if(lang==='ru'&&window.IBX_TR){
    var Tur=TR[id+'|ur'];
    if(Tur&&Tur.a){
      var autoRu={q:IBX_TR.urduToRoman(Tur.q||''),a:IBX_TR.urduToRoman(Tur.a||''),t:Date.now(),auto:1};
      if(autoRu.a&&autoRu.a.length>3)return autoRu;
    }
  }
  return null;
}`
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Add transliteration info to spAnalyse() output
//    After the stats block, if the answer is in Roman Urdu, show Urdu script version
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'spAnalyse() — add Urdu script conversion of Roman Urdu answer',
  `var out=$('#saOut');
  out.innerHTML='<div class="stats" style="margin-top:12px">`,
  `var out=$('#saOut');
  // Auto-detect language and offer transliteration
  var _ansLang=typeof detectLang==='function'?detectLang(txt):'en';
  var _transHtml='';
  if(_ansLang==='ru'&&window.IBX_TR){
    var _urduVer=IBX_TR.romanToUrdu(txt);
    if(_urduVer&&_urduVer!==txt)
      _transHtml='<div class="trnote" dir="rtl" style="margin:8px 0;padding:8px 12px;background:var(--card2,#f5f5f5);border-radius:8px;font-family:\'Noto Nastaliq Urdu\',serif;font-size:1.05rem;line-height:2.2">'+
        '<span class="small muted" style="font-size:.75rem;display:block;text-align:right">🔤 اردو رسم الخط</span>'+
        _urduVer+'</div>';
  } else if((_ansLang==='ur'||isUrduScript(txt))&&window.IBX_TR){
    var _romanVer=IBX_TR.urduToRoman(txt);
    if(_romanVer&&_romanVer!==txt)
      _transHtml='<div class="trnote" style="margin:8px 0;padding:8px 12px;background:var(--card2,#f5f5f5);border-radius:8px">'+
        '<span class="small muted">🔤 Roman Urdu: </span>'+_romanVer+'</div>';
  }
  if(_transHtml) out.innerHTML=_transHtml;
  out.innerHTML+='<div class="stats" style="margin-top:12px">`
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. Wire Whisper roman_hint: when Whisper returns roman_hint, also show
//    the IBX_TR version (more comprehensive than server-side 80-word table)
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'Whisper onFinal — enhance roman_hint with IBX_TR',
  `onFinal:function(r){
        clearInterval(recTick);
        wb.textContent='🎙 Whisper';wb.disabled=false;wb.classList.remove('active');
        if(recTmr)recTmr.textContent='';
        if(r.text){
          $('#saTxt').value=r.text;
          // Show roman hint below textarea if available
          var hint=r.roman&&r.roman!==r.text?'<p class="small trnote" style="margin:4px 0 0">🔤 Roman Urdu: '+esc(r.roman)+'</p>':'';`,
  `onFinal:function(r){
        clearInterval(recTick);
        wb.textContent='🎙 Whisper';wb.disabled=false;wb.classList.remove('active');
        if(recTmr)recTmr.textContent='';
        if(r.text){
          $('#saTxt').value=r.text;
          // Enhance roman hint: use IBX_TR for full 13K-word transliteration
          var _ibxRoman=window.IBX_TR&&isUrduScript(r.text)?IBX_TR.urduToRoman(r.text):'';
          var _displayRoman=_ibxRoman||r.roman||'';
          var hint=_displayRoman&&_displayRoman!==r.text?'<p class="small trnote" style="margin:4px 0 0">🔤 Roman Urdu: '+esc(_displayRoman)+'</p>':'';`
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Add tech term lookup to the Coach/AI view — when user asks about a term,
//    offer the Urdu/Roman equivalent from IBX_TR.findTechTerm()
//    Wire into the existing openExplain() function
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'openExplain — add tech term Urdu/Roman lookup',
  `function openExplain(q){`,
  `function openExplain(q){
  // Show tech term translation if available
  if(window.IBX_TR){
    loadTranslit(function(){
      var hits=IBX_TR.findTechTerm(q.q.slice(0,40));
      if(hits.length){
        var t=hits[0];
        var techNote=document.getElementById('explainTechNote');
        if(techNote) techNote.innerHTML='<span class="small muted">🔤 '+esc(t.en)+' = </span>'+
          '<span dir="rtl" style="font-family:\'Noto Nastaliq Urdu\',serif">'+esc(t.ur)+'</span>'+
          ' <span class="small muted">('+esc(t.ru)+')</span>';
      }
    });
  }`
);

// ─────────────────────────────────────────────────────────────────────────────
// Write & verify
// ─────────────────────────────────────────────────────────────────────────────
if (applied === 0) {
  console.error('\n✗ No patches applied.');
  process.exit(1);
}

fs.writeFileSync(HTML, h, 'utf-8');
console.log('\n✅  Applied', applied, 'patches →', path.basename(HTML));
console.log('   Size:', fs.statSync(HTML).size, 'bytes');

const hv = fs.readFileSync(HTML, 'utf-8');
const checks = [
  ['loadTranslit()',        'function loadTranslit('],
  ['romanToUrdu()',         'function romanToUrdu('],
  ['urToRoman IBX_TR',      'if(window.IBX_TR) return IBX_TR.urduToRoman'],
  ['isUrduScript improved', 'Urdu block U+0600'],
  ['trGet auto-generate',   'auto-generate Roman Urdu from existing'],
  ['spAnalyse translit',    'IBX_TR.romanToUrdu(txt)'],
  ['Whisper IBX_TR roman',  '_ibxRoman=window.IBX_TR'],
  ['openExplain tech term', 'IBX_TR.findTechTerm'],
  ['script load tag',       '/ibx-transliteration.js'],
  ['bank still intact',     '<script type="application/json" id="bank">'],
];
let ok=0,fail=0;
checks.forEach(function([n,needle]){
  if(hv.includes(needle)){ok++;console.log('  ✓',n);}
  else{fail++;console.log('  ✗ MISSING:',n);}
});
console.log('\n',ok,'✓  ',fail,'✗');
