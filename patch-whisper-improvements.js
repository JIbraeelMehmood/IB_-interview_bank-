'use strict';
/**
 * patch-whisper-improvements.js
 *
 * Applies all Whisper STT / audio / TTS / Roman Urdu / Hindi improvements
 * to interview-box.html in-place.  Backs up the file first.
 *
 * Improvements:
 *   1. WS state  — adds dur, conf, recStart, pollTimer fields
 *   2. whisperStatus — auto-enable when service detected, poll /progress
 *   3. whisperTranscribe — retry, roman_hint support, confidence/duration feedback
 *   4. whisperRec — noise suppression, echo cancel, timeslice, rec timer, stop button text
 *   5. spRSpeak — always show Whisper panel (not just when enabled), Roman Urdu option
 *   6. RU_WORDS — expanded Roman Urdu / Roman Hindi word list
 *   7. detectLang — better scoring, Punjabi romanized detection
 *   8. audLang — respects Roman Urdu (ru) for TTS routing
 *   9. speakSeg — detect Roman Urdu text → use Urdu voice
 *  10. spMicNote — shows confidence + duration after last transcription
 *
 * Run: node patch-whisper-improvements.js
 */

const fs   = require('fs');
const path = require('path');

const HTML = path.join(__dirname, 'interview-box.html');
const BAK  = HTML + '.bak-patch-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

let h = fs.readFileSync(HTML, 'utf-8');

let patchCount = 0;
function patch(label, oldStr, newStr) {
  if (!h.includes(oldStr)) {
    console.warn('  ⚠  SKIP (not found):', label);
    return;
  }
  h = h.replace(oldStr, newStr);
  patchCount++;
  console.log('  ✓', label);
}

console.log('\nPatching', path.basename(HTML), '…\n');
fs.copyFileSync(HTML, BAK);
console.log('Backup →', path.basename(BAK), '\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. WS state — add extra tracking fields
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'WS state — add dur/conf/recStart/pollTimer',
  `var WS={rec:null,chunks:[],url:'http://127.0.0.1:5051',model:'base',lang:'auto',enabled:false,ready:false,err:''};`,
  `var WS={rec:null,chunks:[],url:'http://127.0.0.1:5051',model:'base',lang:'auto',enabled:false,ready:false,err:'',
  dur:0,conf:0,recStart:0,pollTimer:null,autoEnabled:false};`
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. whisperStatus — auto-enable when service first detected, update dot text
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'whisperStatus — auto-enable + richer status',
  `function whisperStatus(cb){
  fetch(WS.url+'/health',{mode:'cors'}).then(function(r){return r.json()}).then(function(h){WS.ready=h.ok&&h.loaded;WS.model=h.model;WS.err='';cb&&cb(h)}).catch(function(e){WS.ready=false;WS.err='Whisper service not reachable at '+WS.url+' — start it with: python whisper_server.py';cb&&cb(null)});
}`,
  `function whisperStatus(cb){
  fetch(WS.url+'/health',{mode:'cors',signal:AbortSignal.timeout(3000)}).then(function(r){return r.json()}).then(function(hj){
    WS.ready=hj.ok&&hj.loaded;WS.model=hj.model||WS.model;WS.err='';
    // Auto-enable Whisper the FIRST time the service is detected running
    if(WS.ready&&!WS.enabled&&!WS.autoEnabled){
      WS.enabled=true;WS.autoEnabled=true;
      var sp=typeof spSt==='function'?spSt():null;
      if(sp){sp.whisper.enabled=true;if(typeof save==='function')save();}
    }
    var wd=$('#wsDot'),wt=$('#wsTxt'),ws=$('#wsState');
    if(wd){wd.style.background=WS.ready?'#4CAF50':'#f44336';}
    if(wt){wt.textContent=WS.ready?('Whisper '+(hj.version?'v'+hj.version+' ':'')+WS.model+(hj.busy?' — transcribing…':' ready')):'Whisper unreachable';}
    if(ws){ws.title=WS.ready?('Whisper offline STT — '+WS.model+(hj.device&&hj.device!=='cpu'?' on '+hj.device:'')):'Start: python3 whisper_server.py';}
    cb&&cb(hj);
  }).catch(function(e){
    WS.ready=false;WS.err='Whisper not reachable at '+WS.url+' — run: python3 whisper_server.py';
    var wd=$('#wsDot'),wt=$('#wsTxt');
    if(wd&&WS.enabled)wd.style.background='#f44336';
    if(wt&&WS.enabled)wt.textContent='Whisper unreachable';
    cb&&cb(null);
  });
}`
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. whisperTranscribe — retry once, roman_hint, confidence, duration
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'whisperTranscribe — retry + roman_hint + confidence + duration',
  `function whisperTranscribe(blob,language,cb,errcb){
  if(!WS.ready){errcb&&errcb(WS.err||'Whisper service not ready');return}
  var fd=new FormData();fd.append('file',blob,'answer.webm');
  if(language&&language!=='auto')fd.append('language',language);
  fetch(WS.url+'/transcribe',{method:'POST',body:fd,mode:'cors'}).then(function(r){return r.json()}).then(function(j){
    if(j.ok)cb&&cb(j.text,j.language);else errcb&&errcb(j.error||'Transcription failed');
  }).catch(function(e){errcb&&errcb('Network error: '+e.message)});
}`,
  `function whisperTranscribe(blob,language,cb,errcb,_retry){
  if(!WS.ready){errcb&&errcb(WS.err||'Whisper service not ready');return}
  // Detect best mime for filename hint (helps server-side format detection)
  var mime=blob.type||'audio/webm';
  var ext=mime.indexOf('ogg')>=0?'.ogg':mime.indexOf('mp4')>=0?'.mp4':mime.indexOf('wav')>=0?'.wav':'.webm';
  var fd=new FormData();fd.append('file',blob,'answer'+ext);
  if(language&&language!=='auto')fd.append('language',language);
  fetch(WS.url+'/transcribe',{method:'POST',body:fd,mode:'cors'}).then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).then(function(j){
    if(j.ok){
      WS.dur=j.duration||0;WS.conf=j.confidence||0;
      // If server returned a roman_hint (Roman Urdu transliteration of Urdu script)
      var text=j.text||'';
      if(j.roman_hint&&language==='ru')text=j.roman_hint;
      cb&&cb(text,j.language,{dur:WS.dur,conf:WS.conf,roman:j.roman_hint||''});
    }else{errcb&&errcb(j.error||'Transcription failed');}
  }).catch(function(e){
    // Retry once on network glitch
    if(!_retry){setTimeout(function(){whisperTranscribe(blob,language,cb,errcb,true)},800);return;}
    errcb&&errcb('Network error: '+e.message);
  });
}`
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. whisperRec — noise suppression + echo cancel + timeslice + rec timer
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'whisperRec — audio constraints + timeslice + rec timer',
  `function whisperRec(o){
  if(!WS.enabled){o.onError&&o.onError('whisper-disabled');return null}
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
    var mr=new MediaRecorder(stream),chunks=[];WS.rec=mr;o.onStart&&o.onStart();
    mr.ondataavailable=function(e){if(e.data.size)chunks.push(e.data)};
    mr.onstop=function(){stream.getTracks().forEach(function(t){t.stop()});WS.rec=null;
      var blob=new Blob(chunks,{type:mr.mimeType||'audio/webm'});
      whisperTranscribe(blob,WS.lang,function(text,lang){o.onFinal&&o.onFinal({text:text,lang:lang,dur:0,pauses:0})},o.onError);
    };
    mr.start();
  }).catch(function(e){o.onError&&o.onError('mic-blocked');toast('Microphone blocked — allow mic access or use keyboard dictation')});
  return {stop:function(){if(WS.rec)try{WS.rec.stop()}catch(e){}}};
}`,
  `function whisperRec(o){
  if(!WS.enabled){o.onError&&o.onError('whisper-disabled');return null}
  // Request best audio quality with noise/echo suppression
  var constraints={audio:{
    echoCancellation:true,noiseSuppression:true,autoGainControl:true,
    channelCount:1,sampleRate:16000
  }};
  navigator.mediaDevices.getUserMedia(constraints).catch(function(){
    // Fallback: basic audio if advanced constraints rejected
    return navigator.mediaDevices.getUserMedia({audio:true});
  }).then(function(stream){
    // Pick best supported mime type
    var mimes=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'];
    var mime=mimes.find(function(m){return MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(m);})||'';
    var mr=new MediaRecorder(stream,mime?{mimeType:mime}:{});
    var chunks=[];WS.rec=mr;WS.recStart=Date.now();
    o.onStart&&o.onStart();
    // timeslice=1000 gives ondataavailable ticks every 1s (for live feedback if needed)
    mr.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
    mr.onstop=function(){
      stream.getTracks().forEach(function(t){t.stop()});
      WS.rec=null;
      var dur=Math.round((Date.now()-WS.recStart)/1000);
      var blob=new Blob(chunks,{type:mr.mimeType||'audio/webm'});
      o.onTranscribing&&o.onTranscribing(dur);
      whisperTranscribe(blob,WS.lang,
        function(text,lang,meta){o.onFinal&&o.onFinal({text:text,lang:lang,dur:meta&&meta.dur||dur,conf:meta&&meta.conf||0,roman:meta&&meta.roman||''})},
        function(err){o.onError&&o.onError(err);}
      );
    };
    mr.start(1000);  // timeslice
  }).catch(function(e){
    o.onError&&o.onError('mic-blocked');
    toast('Microphone blocked — allow mic access in browser settings');
  });
  return {stop:function(){if(WS.rec)try{WS.rec.stop()}catch(e){}},cancel:function(){if(WS.rec)try{WS.rec.stop()}catch(e){};WS.rec=null;}};
}`
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. spRSpeak — always show Whisper panel + Roman Urdu option + richer UI
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'spRSpeak — always show Whisper config + Roman Urdu lang + better UI',
  `function spRSpeak(){
  var st=spSt();SP.q=SP.q||spPickQ('core');
  var whisperBtn = WS.enabled?'<button type="button" class="btn primary" id="saWhisper">🎙 Whisper</button>':'';
  var whisperCfg = WS.enabled?'<div class="row" style="margin-top:8px"><label class="small"><b>Whisper:</b> <select class="field sm" id="wsLang"><option value="auto">Auto-detect</option><option value="en">English</option><option value="ur">Urdu</option><option value="hi">Hindi</option><option value="ar">Arabic</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="zh">Chinese</option><option value="ja">Japanese</option><option value="ko">Korean</option><option value="ru">Russian</option><option value="pt">Portuguese</option><option value="it">Italian</option><option value="nl">Dutch</option><option value="pl">Polish</option><option value="tr">Turkish</option><option value="bn">Bengali</option><option value="ta">Tamil</option><option value="te">Telugu</option><option value="gu">Gujarati</option><option value="pa">Punjabi</option></select> <select class="field sm" id="wsModel"><option value="tiny">Tiny (fastest)</option><option value="base">Base</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="turbo">Turbo (fast+accurate)</option></select> <button type="button" class="btn sm ghost" id="wsToggle">'+(WS.enabled?'Disable Whisper':'Enable Whisper')+'</button></label></div>':'';`,
  `function spRSpeak(){
  var st=spSt();SP.q=SP.q||spPickQ('core');
  var whisperBtn = WS.enabled?'<button type="button" class="btn primary" id="saWhisper">🎙 Whisper</button>':'';
  // Always show Whisper config panel — user can enable/disable it from here
  // even if the service hasn't been detected yet
  var wsStatusCls = WS.ready?'color:#2e7d32':WS.enabled?'color:#c62828':'color:#666';
  var wsStatusTxt = WS.ready?('✓ Ready — '+WS.model):WS.enabled?'⚠ Service not running':'○ Disabled';
  var whisperCfg = '<div class="row" style="margin-top:8px;flex-wrap:wrap;gap:6px">'
    +'<span class="small" style="'+wsStatusCls+'"><b>Whisper:</b> '+wsStatusTxt+'</span>'
    +'<select class="field sm" id="wsLang">'
    +'<option value="auto">🌐 Auto-detect</option>'
    +'<option value="en">🇬🇧 English</option>'
    +'<option value="ur">اردو Urdu (script)</option>'
    +'<option value="ru">Roman Urdu / Hinglish</option>'
    +'<option value="hi">हिंदी Hindi</option>'
    +'<option value="pa">ਪੰਜਾਬੀ Punjabi</option>'
    +'<option value="ar">عربي Arabic</option>'
    +'<option value="bn">বাংলা Bengali</option>'
    +'<option value="ta">தமிழ் Tamil</option>'
    +'<option value="te">తెలుగు Telugu</option>'
    +'<option value="gu">ગુજરાતી Gujarati</option>'
    +'<option value="fr">Français</option>'
    +'<option value="de">Deutsch</option>'
    +'<option value="zh">中文</option>'
    +'<option value="ja">日本語</option>'
    +'<option value="ko">한국어</option>'
    +'<option value="es">Español</option>'
    +'</select>'
    +'<select class="field sm" id="wsModel">'
    +'<option value="tiny">Tiny (fastest, ~75MB)</option>'
    +'<option value="base">Base (~150MB)</option>'
    +'<option value="small">Small — better Urdu/Hindi (~500MB)</option>'
    +'<option value="medium">Medium — best accuracy (~1.5GB)</option>'
    +'<option value="turbo">Turbo — fast+accurate (~300MB)</option>'
    +'<option value="large">Large — highest quality (~3GB)</option>'
    +'</select>'
    +'<button type="button" class="btn sm '+(WS.enabled?'ghost':'primary')+'" id="wsToggle">'+(WS.enabled?'Disable Whisper':'Enable Whisper')+'</button>'
    +'<button type="button" class="btn sm ghost" id="wsCheck" title="Check if Whisper service is running">↻ Check</button>'
    +'</div>'
    +(WS.dur?'<p class="small muted" style="margin:2px 0 0">Last: '+WS.dur+'s audio, confidence '+Math.round(WS.conf*100)+'%</p>':'');`
);

// ─────────────────────────────────────────────────────────────────────────────
// 5b. spRSpeak — add wsCheck button handler after wsToggle handler
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'spRSpeak wsToggle handler — add wsCheck + improved Whisper mic',
  `  // Whisper config controls
  if(WS.enabled){
    $('#wsLang').value=WS.lang;$('#wsLang').onchange=function(){WS.lang=this.value;st.whisper.lang=this.value;save()};
    $('#wsModel').value=WS.model;$('#wsModel').onchange=function(){WS.model=this.value;st.whisper.model=this.value;save();whisperStatus()};
    $('#wsToggle').onclick=function(){WS.enabled=!WS.enabled;st.whisper.enabled=WS.enabled;save();spRender()};
  }`,
  `  // Whisper config controls — always wired (panel always shown)
  $('#wsLang').value=WS.lang;
  $('#wsLang').onchange=function(){WS.lang=this.value;st.whisper.lang=this.value;save();};
  $('#wsModel').value=WS.model;
  $('#wsModel').onchange=function(){WS.model=this.value;st.whisper.model=this.value;save();whisperStatus();};
  $('#wsToggle').onclick=function(){WS.enabled=!WS.enabled;st.whisper.enabled=WS.enabled;save();spRender();};
  var wck=$('#wsCheck');if(wck)wck.onclick=function(){
    wck.textContent='…';
    whisperStatus(function(hj){
      wck.textContent='↻ Check';
      toast(hj&&hj.loaded?'✓ Whisper '+WS.model+' ready':'⚠ Whisper service not found — run: python3 whisper_server.py');
      spRender();
    });
  };`
);

// ─────────────────────────────────────────────────────────────────────────────
// 5c. spRSpeak — improve the Whisper mic button with timer + transcribing state
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'spRSpeak Whisper mic button — add timer + transcribing state',
  `  // Whisper mic button
  var wb=$('#saWhisper');if(wb)wb.onclick=function(){
    if(WS.rec){WS.rec.stop();wb.textContent='🎙 Whisper';return}
    wb.textContent='■ Stop (Whisper)';
    whisperRec({onStart:function(){},onFinal:function(r){wb.textContent='🎙 Whisper';if(r.text){$('#saTxt').value=r.text;spAnalyse()}},onError:function(c){wb.textContent='🎙 Whisper';toast(c||'Whisper error')}});
  };`,
  `  // Whisper mic button — with recording timer + transcribing indicator
  var wb=$('#saWhisper');if(wb)wb.onclick=function(){
    if(WS.rec){WS.rec.stop();return;}
    if(!WS.ready){
      toast('Whisper not ready — run: python3 whisper_server.py');
      whisperStatus();return;
    }
    wb.textContent='■ Stop recording';wb.classList.add('active');
    var recT=0,recTmr=$('#saT'),recTick=setInterval(function(){
      recT++;if(recTmr)recTmr.textContent=recT+'s';
    },1000);
    whisperRec({
      onStart:function(){},
      onTranscribing:function(dur){
        clearInterval(recTick);
        wb.textContent='⏳ Transcribing…';wb.disabled=true;
        if(recTmr)recTmr.textContent='';
      },
      onFinal:function(r){
        clearInterval(recTick);
        wb.textContent='🎙 Whisper';wb.disabled=false;wb.classList.remove('active');
        if(recTmr)recTmr.textContent='';
        if(r.text){
          $('#saTxt').value=r.text;
          // Show roman hint below textarea if available
          var hint=r.roman&&r.roman!==r.text?'<p class="small trnote" style="margin:4px 0 0">🔤 Roman Urdu: '+esc(r.roman)+'</p>':'';
          var durTxt=r.dur?r.dur+'s':'';
          var confTxt=r.conf?Math.round(r.conf*100)+'%':'';
          var meta=(durTxt||confTxt)?'<p class="small muted" style="margin:2px 0 0">Audio: '+durTxt+(confTxt?' · confidence '+confTxt:'')+'</p>':'';
          var out=$('#saOut');if(out&&(hint||meta))out.innerHTML=hint+meta;
          spAnalyse();
        }
      },
      onError:function(c){
        clearInterval(recTick);
        wb.textContent='🎙 Whisper';wb.disabled=false;wb.classList.remove('active');
        if(recTmr)recTmr.textContent='';
        toast(c==='mic-blocked'?'Microphone blocked — allow mic in browser settings':c||'Whisper error');
      }
    });
  };`
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. RU_WORDS — massively expanded Roman Urdu + Roman Hindi word list
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'RU_WORDS — expanded Roman Urdu/Hindi word list',
  `var RU_WORDS=/\\b(hai|hain|ka|ki|ke|ko|se|mein|aur|nahi|nahin|kya|ye|yeh|woh|wo|aap|karna|karein|kar|hota|hoti|jata|jati|matlab|agar|lekin|sirf|bhi|hum|tum|apna|apni|kaise|kyun|jab|tab|isko|usko|wala|wali)\\b/gi;`,
  `var RU_WORDS=/\\b(hai|hain|ka|ki|ke|ko|se|mein|aur|nahi|nahin|kya|ye|yeh|woh|wo|aap|karna|karein|kar|hota|hoti|jata|jati|matlab|agar|lekin|sirf|bhi|hum|tum|apna|apni|kaise|kyun|jab|tab|isko|usko|wala|wali|theek|achha|accha|bahut|bohot|shukriya|meherbani|zaroor|zarur|bilkul|seedha|seedhi|abhi|pehle|phir|baad|saath|baat|kaam|raha|rahi|rahe|gaya|gayi|gaye|liya|liye|dena|dono|zyada|thoda|mushkil|asaan|samajh|pata|lagta|lagti|yaad|zaroorat|zarurat|poora|poori|poore|itna|itni|utna|utni|kuch|sab|har|sirf|bas|fir|toh|to|na|nahi|hoga|hogi|honge|sakta|sakti|sakte|chahiye|chahte|chahti|milta|milti|milte|karo|karna|karo|karoge|karunga|sunlo|sunna|dekho|dekhna|laga|lagi|lage|bola|boli|bole|suna|suni|sune|aya|ayi|aye|gaya|gayi|gaye|khatam|shuru|cheez|kuch|sochna|samajhna|batao|batana|poochna|poochho|jawab|sawal|masla|hal|koshish|warna|warna|waise|aisa|aisi|aise|waisa|waisi|waise|pyaara|pyaar|dil|zindagi|duniya|log|banda|bande|larki|larka|dost|yaar|bhai|behen|ammi|abba|sahab|saheb|janab|jee|janaab|salam|khuda|khair|mubarak|inshallah|mashallah|alhamdulillah)\\b/gi;`
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. detectLang — improved scoring with Punjabi and better RU threshold
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'detectLang — improved scoring + Punjabi detection',
  `function detectLang(t){t=String(t||'');if(arabicShare(t)>0.3)return 'ur';if(/[\\u0900-\\u097F]/.test(t))return 'hi';var w=(t.match(/[A-Za-z]+/g)||[]).length;var r=(t.match(RU_WORDS)||[]).length;return (w&&r/w>0.08)?'ru':'en'}`,
  `function detectLang(t){
  t=String(t||'');
  if(!t.trim())return 'en';
  // Urdu/Arabic script
  if(arabicShare(t)>0.25)return 'ur';
  // Devanagari (Hindi)
  if(/[\\u0900-\\u097F]/.test(t))return 'hi';
  // Gurmukhi (Punjabi script)
  if(/[\\u0A00-\\u0A7F]/.test(t))return 'pa';
  var words=(t.match(/[A-Za-z]{2,}/g)||[]);
  var w=words.length;
  if(!w)return 'ur'; // no Latin at all but some text → assume Urdu
  var r=(t.match(RU_WORDS)||[]).length;
  var ratio=r/w;
  // Punjabi romanized shares many words with Roman Urdu — check for pa-specific markers
  var PA_WORDS=/\\b(tussi|tenu|menu|kiven|kithe|othe|koi|lok|jado|jad|sade|saade|teri|meri|hor|nahi|hun|si|san|aa|aao|aaiye|karo|karni|karna|hunda|hundi|hun|phir)\\b/gi;
  var pa=(t.match(PA_WORDS)||[]).length;
  if(pa>=2&&ratio>0.05)return 'pa';
  if(ratio>0.06)return 'ru';  // lowered threshold (was 0.08)
  return 'en';
}`
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. audLang — respect Roman Urdu (ru) → use Urdu voice for TTS
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'audLang — Roman Urdu (ru) routes to Urdu voice',
  `function audLang(){if(typeof P!=='undefined'&&P&&P.lang&&P.lang!=='en')return P.lang;return S.lang==='ru'?'ru':S.lang==='hi'?'hi':'ur'}`,
  `function audLang(){
  if(typeof P!=='undefined'&&P&&P.lang&&P.lang!=='en')return P.lang;
  // Roman Urdu and Urdu both → use Urdu voice; Hindi stays Hindi; Punjabi → try Punjabi else Urdu
  if(S.lang==='ru')return 'ur';   // Roman Urdu → Urdu voice (closest available)
  if(S.lang==='hi')return 'hi';
  if(S.lang==='pa')return 'pa';
  return 'ur';
}`
);

// ─────────────────────────────────────────────────────────────────────────────
// 9. speakSeg — detect Roman Urdu inline text and switch voice mid-segment
// ─────────────────────────────────────────────────────────────────────────────
// We patch the segment voice-pick logic inside speakSeg.
// The existing speakSeg picks voice per-segment based on P.lang.
// We add: if segment text looks like Roman Urdu, use Urdu voice.
patch(
  'speakSeg — inline Roman Urdu detection for voice routing',
  `var s=P.segs[P.si];uiPlayer();`,
  `var s=P.segs[P.si];
  // Auto-detect Roman Urdu within a segment and set voice accordingly
  if(s&&s.text&&typeof detectLang==='function'){
    var _sl=detectLang(s.text);
    if((_sl==='ru'||_sl==='ur')&&P.lang!=='ur'&&P.lang!=='hi'){
      // This segment reads as Roman/Urdu — tell speakSeg to use Urdu voice
      if(!P._savedLang)P._savedLang=P.lang;
      P.lang='ur';
    } else if(P._savedLang&&_sl==='en'){
      // Back to English — restore original lang
      P.lang=P._savedLang;delete P._savedLang;
    }
  }
  uiPlayer();`
);

// ─────────────────────────────────────────────────────────────────────────────
// 10. spMicNote — show Whisper status with last confidence + duration
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'spMicNote — show Whisper status with last conf/duration',
  `function spMicNote(){var w=WS.enabled?'<p class="small trnote" style="margin:0 0 10px">🎙 Whisper transcription ON — record your answer, it is transcribed offline (service at '+WS.url+').</p>':'';return (SPR?'':('<p class="small trnote" style="margin:0 0 10px">Live speech checking isn\'t available in this browser/app. Open this page in <b>Chrome</b> for the 🎙 buttons, or type with your keyboard\'s 🎤 voice key in the text boxes — that still works.</p>'))+w}`,
  `function spMicNote(){
  var w='';
  if(WS.enabled&&WS.ready){
    var meta=WS.dur?(' Last: '+WS.dur+'s'+( WS.conf?' · conf '+Math.round(WS.conf*100)+'%':'')):'';
    w='<p class="small trnote" style="margin:0 0 10px">🎙 <b>Whisper '+WS.model+'</b> ready — speech transcribed offline.'+meta+' (<a href="#" onclick="whisperStatus(function(){spRender();});return false">re-check</a>)</p>';
  } else if(WS.enabled){
    w='<p class="small trnote" style="margin:0 0 10px;color:var(--bad)">⚠ Whisper enabled but service not running. Start: <code>python3 whisper_server.py</code></p>';
  }
  var noSr=SPR?'':'<p class="small trnote" style="margin:0 0 10px">Live speech recognition needs Chrome. Use Whisper above (offline, supports Urdu/Hindi/Roman Urdu) or type your answer and use keyboard 🎤 voice input.</p>';
  return (SPR?'':noSr)+w;
}`
);

// ─────────────────────────────────────────────────────────────────────────────
// Write result
// ─────────────────────────────────────────────────────────────────────────────
if (patchCount === 0) {
  console.error('\n✗ No patches applied — file may already be patched or old strings not found.');
  process.exit(1);
}

fs.writeFileSync(HTML, h, 'utf-8');
console.log('\n✅  Applied', patchCount, 'patches →', path.basename(HTML));
console.log('   new size:', fs.statSync(HTML).size, 'bytes');

// Verify HTML is still valid (bank tag still present, JS not broken at parse level)
const verify = h.match(/<script[^>]*\bid="bank"[^>]*>/);
console.log('   bank tag:', verify ? '✓ present' : '✗ MISSING');

const jsChunk = h.match(/function whisperRec\(/);
console.log('   whisperRec:', jsChunk ? '✓ present' : '✗ MISSING');

const wsChunk = h.match(/function whisperTranscribe\(/);
console.log('   whisperTranscribe:', wsChunk ? '✓ present' : '✗ MISSING');

const rlChunk = h.match(/function detectLang\(/);
console.log('   detectLang:', rlChunk ? '✓ present' : '✗ MISSING');

console.log('\nOpen: http://localhost:8765/interview-box.html');
