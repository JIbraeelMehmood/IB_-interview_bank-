# Failure-First Backend Interview: What Happens When Things Fail (PHP / Laravel)

Questions English mein hain (interview mein yehi poochhe jayenge), answers Roman Urdu dev-style mein. Yeh woh sawal hain jo syntax nahi, **soch** check karte hain: "kya hoga agar yeh fail ho jaye?" Inhein yaad nahi kiya ja sakta, sirf unhi ko aate hain jinhon ne kuch build karte waqt sochha ho. Isliye har answer mein apni asli project ka example (HOLOIN waghera) jorna sab se bara farq daalta hai.

## Har failure answer ka 4-step pattern

**State, Detect, Recover, Prevent.**

1. **State:** fail hone ke baad system kis haalat mein reh jata hai? (paise kat gaye lekin order nahi bana, ya SMS gaya lekin DB update nahi hua)
2. **Detect:** kaise pata chalega, user ke batane se pehle? (alert, metric, reconciliation report)
3. **Recover:** ab theek kaise karenge? (retry, compensating action, replay, manual fix)
4. **Prevent:** dobara na ho iske liye kya lagayenge? (idempotency, unique constraint, timeout, test)

**Interviewer in cheezon ko dekhta hai:** kya aap partial failure samajhte hain, kya aap khud "idempotent?" ka sawal uthate hain, transaction ki hadd kahan hai (jo rollback nahi ho sakta, jaise bheja hua SMS), detection ka plan kya hai ("logs dekh lunga" kamzor jawab hai), aur recovery ka safe tareeqa kya hai.

**Agar aap ne aisa incident nahi dekha:** seedha kahein "mujhe production mein yeh nahi hua, lekin main yeh check karunga" aur reasoning dikhayen. Jhoota war story banane se behtar hai.

# Signature question

**F1. "Take a flow you built, like checkout or a signup email. Walk me through every step where it can fail halfway, and what state the system is left in each time."**

Yeh ek sawal bahut kuch check karta hai. Misaal: ticket checkout ke steps aur har step par failure:

| Step | Kya fail ho sakta hai | System kis state mein reh jata hai | Pata kaise chale | Recover aur prevent |
| --- | --- | --- | --- | --- |
| 1. Order `pending` banao aur seat hold karo | App crash order banane ke baad | Pending order aur seat hold, koi charge nahi | `pending` orders ki umar ki report | Scheduled job expired holds release kare |
| 2. Payment provider ko call | **Timeout: result maloom nahi** (paise kate ya nahi?) | Unknown state | Timeout metric aur alert | Blind retry nahi: idempotency key ke saath ya reconciliation se provider se asal status poochho |
| 3. Payment ho gayi, callback ya webhook gum | Network ya hamara server down | Provider ke yahan paid, hamare yahan pending | `pending` lekin provider mein `paid` ka mismatch report | Provider webhook retries plus reconciliation job |
| 4. Webhook 3 baar aaya | Duplicate delivery | Double confirm ya double SMS ka khatra | Duplicate event counters | Event ID par unique constraint, state transition idempotent |
| 5. Confirmation SMS ya email job | Provider down ya job crash | Order paid lekin user ko khabar nahi | Failed jobs aur queue age par alert | Backoff ke saath retries, `sent_at` flag, "resend" option |
| 6. Ticket PDF banana | Memory ya timeout | Ticket missing | Failed job alert | Retry, user ko "processing" dikhao, on-demand regenerate |
| 7. DB commit charge ke baad fail | DB error ya crash | **Paise kat gaye, local record nahi** | Reconciliation: provider ke paid orders jo hamare paas nahi | Charge se **pehle** local `pending` order likho (intent), taake hamesha record rahe |

**Kamzor answer:** "Try-catch laga dunga." **Mazboot answer:** har step par state, detection aur recovery batana, aur ye manna ke kuch cheezein (bheja hua SMS, kata hua paisa) rollback nahi hoti, isliye unke liye compensating action ya reconciliation chahiye.

**Follow-ups:** "Same webhook ek hi waqt mein do baar aaye to?" aur "Redis 30 second ke liye gayab ho to?" (F12 aur F21 dekhein).

# Section 1: Queue jobs aur retries

**F2. What happens if this queue job runs twice?** Answer: Pehle manta hoon ke yeh normal hai: queues "at-least-once" deliver karti hain, "exactly-once" nahi. Job do baar chal sakti hai jab: job `retry_after` se lambi chali aur wapas queue mein aa gayi, worker kaam ke beech mein crash ya OOM hua, deploy mein worker restart hua, ya kisi ne do baar dispatch kiya. Isliye job **idempotent** honi chahiye: start mein check (`if ($ticket->sms_sent_at) return;`), kaam, phir flag set. Pakka ilaaj database ka unique constraint ya state check hai, sirf code ka "if" kaafi nahi (race). Laravel mein `ShouldBeUnique` (dispatch duplicate rokta hai) aur `WithoutOverlapping` (ek hi key par ek waqt mein ek job) madad karte hain, lekin ye idempotency ka badal nahi.

**F3. A job exceeds its timeout but keeps running. Why do you see duplicates?** Answer: Queue config ka `retry_after` agar job ke `timeout` se chhota ya barabar ho, to queue samajhti hai job gum ho gayi aur use dobara de deti hai, jab ke pehla worker abhi chal raha hai: do workers ek hi job. Rule: `retry_after` hamesha job `timeout` se bara ho (aur worker ka `--timeout` job ke `timeout` se thoda bara). Aur timeout par job ko cleanly fail hona chahiye, adhi cheez chhor kar nahi, isliye kaam chhote hisson mein.

**F4. The worker crashes (OOM or deploy) in the middle of a job. What state is the system in?** Answer: Job ka jitna kaam ho chuka wo ho chuka (DB write, API call), baqi nahi, aur job wapas queue mein aayegi (retry\_after ke baad) aur dobara chalegi. Isliye har step ko "dobara chalane par safe" banana hai. DB kaam transaction mein (ya sab ya kuch nahi), aur external side effects (SMS, payment) ke liye idempotency key ya sent flag. Prevention: `--max-jobs`, `--memory` se workers ko khud restart, deploy par `queue:restart` (chalti job ko khatam hone dena), aur memory leak monitor.

**F5. A job fails every time (poison job). How do you stop it from clogging the queue?** Answer: Hamesha retry nahi: `$tries` aur `$maxExceptions` set, backoff (`[10, 60, 300]`) taake server par dabao na barhe, phir `failed_jobs` table mein. `failed(Throwable $e)` method mein alert ya compensating action. Failed jobs ki tadaad par alert, aur `queue:retry` tab jab bug theek ho chuka ho. Alag queues critical aur non-critical ke liye, taake ek kharab job important kaam na roke.

**F6. How do you make a "send SMS" job safe to retry?** Answer: Teen tareeqe mil kar: (1) database mein `sms_sent_at` ya per-message unique key (`ticket_id + type`) aur job ke shuru mein check, (2) provider ko idempotency key ya message reference dena agar wo support kare, (3) timeout par "result maloom nahi" ko alag handle (dobara bhejna double SMS bana sakta hai: business decide kare ke double SMS acceptable hai ya nahi). Sent flag ko SMS bhejne ke baad set karte hain, lekin crash flag aur SMS ke beech ho to ek duplicate ka imkan rehta hai: yeh "at-least-once" ki qeemat hai, isliye kuch messages (OTP) ke liye duplicates theek, kuch (paise) ke liye nahi.

**F7. A job is dispatched inside a transaction and runs before the commit. What happens?** Answer: Worker job uthata hai jab transaction abhi commit nahi hui, to `findOrFail` fail ya purana data. Fix: `->afterCommit()` ya queue config mein `after_commit => true`, taake job commit ke baad hi dispatch ho. Ulta masla bhi hai: commit ho gaya lekin dispatch fail (Redis down), to event kho gaya. Iske liye **outbox pattern**: event ko usi transaction mein ek `outbox` table mein likho, phir alag relay job usay queue mein bheje, taake DB aur queue ka "dual write" na toote.

**F8. After an outage, there are 2 lakh jobs in the backlog. What do you do?** Answer: Pehle dekhta hoon kya zaroori hai: purani jobs ab bhi kaam ki hain? (OTP ya "seat hold expiry" 2 ghante baad bekaar hai.) Time-sensitive jobs ke liye `retryUntil` ya expiry check taake purani jobs bina kaam kiye discard hon. Workers barhata hoon (lekin DB aur provider ke rate limits ka dhyan, warna backlog khatam karte karte DB gira dun), critical queues ko priority (`--queue=critical,default`), aur chhote batches mein dekhta hoon ke error rate na barhe. Baad mein: queue age (sab se purani job ki umar) par alert, taake backlog bante hi pata chale.

**F9. Jobs for the same ticket must run in order, but queues do not guarantee order. How do you handle it?** Answer: Pehle poochta hoon kya order sach mein zaroori hai. Agar haan: (1) ek ticket ki jobs ko chain (`Bus::chain`) mein rakho, (2) `WithoutOverlapping` ek key (`ticket:{id}`) par, (3) har event ko sequence number ya version do aur consumer purani ya out-of-order event ko ignore ya re-fetch kare, (4) ya state machine jo sirf valid transitions allow kare. Behtar design: aisi jobs banao jo order par depend na karein (current state read karke kaam karein).

**F10. How do you safely retry failed jobs after fixing a bug?** Answer: Pehle failed jobs ko dekhta hoon (kitni, kis wajah se), fix deploy, phir chhote batch par `queue:retry` ke saath nigrani. Jobs idempotent hon to retry safe. Agar adhi hui jobs ka state ghalat hai to pehle data repair script. Retry se pehle dekhta hoon ke jobs ab bhi relevant hain, aur rate limit ka khayal.

**F11. What is the difference between `tries`, `maxExceptions`, `backoff` and `retryUntil`?** Answer: `tries` job ki kul koshishein. `maxExceptions` itni exceptions ke baad fail (jab `tries` zyada hon lekin job manually `release()` bhi hoti ho). `backoff` retries ke beech ka waqfa (exponential, taake provider ya DB ko saans mile). `retryUntil` time-based hadd (is waqt ke baad retry nahi). Maslan payment reconciliation job ke liye `retryUntil` 24 ghante, OTP job ke liye `tries = 1` ya bohat chhota time window.

# Section 2: Idempotency, duplicates aur webhooks

**F12. The payment provider sends the same webhook three times. What happens in your system?** Answer: Pehle manta hoon duplicates normal hain (provider retry karta hai agar hamara jawab late ya fail ho). Design: webhook ki `event_id` ko `webhook_events` table mein **unique constraint** ke saath insert karo. Pehli baar insert hua to process, duplicate insert par unique violation pakad kar sirf `200 OK` wapas (dobara process nahi). Processing khud idempotent: "order ko `paid` karo" sirf tab jab abhi `pending` ho (state transition). Signature verify pehle, kaam queue mein, jawab jaldi (2xx).

**F13. Webhooks arrive out of order (for example refund before paid). How do you handle it?** Answer: Order par bharosa nahi karte. Har event mein provider ka timestamp ya sequence ho to us se compare; warna state machine sirf valid transitions allow kare aur out-of-order event ko park kare (retry baad mein) ya provider API se current status fetch kar ke us par amal. Source of truth provider ka current status hota hai, event sirf ishara.

**F14. The webhook arrives before your database transaction has committed. What happens?** Answer: Webhook handler order ko dhoondta hai lekin abhi commit nahi hua, to "order not found". Fix: order pehle commit hoga aur phir payment call (intent pehle likho), aur agar phir bhi "not found" aaye to 404 ke bajaye retryable jawab (5xx) ya job ko thodi der baad dobara chalao taake provider retry kare. Isi liye payment call kabhi uncommitted transaction ke andar nahi.

**F15. The payment succeeded at the provider but your callback never came. What do you do?** Answer: Order `pending` rehta hai. Do chizein: provider ke webhook retries, aur hamari **reconciliation job**: har kuch minute mein purane `pending` orders ke liye provider API se status poochho (order reference ya idempotency key se) aur `paid` ho to confirm, `failed` ho to release. Alert: "provider mein paid lekin hamare yahan 15 minute se pending". Yeh job hamesha chalni chahiye, kyunke webhooks par poora bharosa nahi.

**F16. A user double-clicks "Pay", or the mobile app retries the POST. What happens?** Answer: Client side button disable madad karta hai lekin server par bharosa nahi. Server: client se **idempotency key** (ek payment attempt ki ek key), jo server (`idempotency_keys` table, unique) mein result ke saath store ho; dohrai request wohi result lautaye aur dobara charge na ho. Aur database-level protection: `(order_id)` par unique payment ya order ki state check taake ek order ek hi baar paid ho.

**F17. How do you design an idempotency key?** Answer: Client har logical operation ke liye ek UUID banata hai aur retries mein wohi bhejta hai. Server key, user aur request ka hash store karta hai. Pehli request: kaam aur result save. Dohrai request wohi key: saved result return. Wohi key lekin alag payload: `409 Conflict` (ghalat istemal). Key ki TTL (jaise 24 ghante), aur save aur kaam ek transaction ya lock ke andar taake do ek saath requests dono nikal na jayein (unique constraint par ek jeete).

**F18. Webhook signature verification fails sometimes. What do you check?** Answer: Pehle unverified request ko process nahi karta (4xx, log). Phir wajah: signature **raw body** par hota hai (JSON parse ho kar dobara encode ho jaye to farq), server ka clock (timestamp tolerance), ghalat secret ya rotation, proxy ya middleware jo body badal de, aur environment (test secret vs live). Mismatch ki tadaad par alert (attack ya misconfiguration dono ka ishara).

**F19. Your endpoint is slow and the provider times out and retries. What do you do?** Answer: Webhook handler ko patla rakho: signature verify, event save (unique), job dispatch, `200` foran. Bhaari kaam queue mein. Warna provider timeout par retry karega aur load aur duplicates barhenge (retry storm).

**F20. How do you prove that no duplicate payment exists?** Answer: Do darje: (1) database constraints (payment reference par unique, order ek hi paid), (2) reconciliation report: hamari payments vs provider ki settlement file, mismatch ya duplicates list. Sirf code par bharosa nahi: constraint aur rozana reconciliation, aur alert agar mismatch aaye.

# Section 3: Redis aur cache failures

**F21. What if Redis is down for 30 seconds?** Answer: Pehle dekhta hoon Redis kis kaam mein hai: cache, session, queue, locks, rate limiting. Har ka asar alag: **Cache** down: reads database par girti hain (load barhta hai, error nahi agar fallback ho). **Sessions** Redis mein ho to users logout ya errors. **Queue** dispatch fail (events kho sakte hain: outbox pattern ya dispatch error par retry). **Locks** kaam nahi karenge (DB constraint ka final guard). **Rate limiting** fail-open ya fail-closed ka faisla. Design: cache ke liye fallback (naye Laravel versions mein failover cache aur queue drivers hain, apna version check karein), timeouts chhote taake requests latak na jayein, aur critical flows Redis par single point of failure na hon. Detection: Redis connection errors par alert, aur failover ka test.

**F22. Sessions are stored in Redis and Redis restarts. What do users experience?** Answer: Agar Redis mein persistence nahi to saari sessions kho jati hain: sab users logout, aur form ke beech wale users ka data (CSRF token) fail. Option: sessions ko database ya cookie mein, ya Redis mein AOF persistence aur replica. Aur login ke baad jaldi dobara login ka sehat-mand tajurba (data na khoye, saaf message).

**F23. A popular cache key expires and 1,000 requests hit the database at once. What is it called and how do you prevent it?** Answer: **Cache stampede (thundering herd).** Prevention: rebuild par `Cache::lock` taake ek request rebuild kare aur baqi purani value ya intezar karein, expiry mein random jitter taake bohat keys ek saath expire na hon, stale-while-revalidate (naye Laravel versions mein `Cache::flexible`), aur bohat hot keys ko background job se pehle hi refresh karna.

**F24. Redis memory fills up and starts evicting keys. Which keys are in danger?** Answer: Eviction policy par depend karta hai. `allkeys-lru` mein kuch bhi (queue ke jobs aur locks bhi!) nikal sakta hai, jo khatarnak hai. Isliye cache aur queues ke liye **alag Redis instance**: cache ke liye LRU eviction, queues aur locks ke liye `noeviction` (full ho to write error, jo silent loss se behtar hai). Memory aur eviction counters par alerts.

**F25. A Redis lock expires while the job is still working. What happens?** Answer: Doosra worker same lock le leta hai aur do jobs ek saath chal padti hain. Lock ko ek **hint** samjho, guarantee nahi: asal hifazat database ka unique constraint ya `lockForUpdate` hai. Mitigation: lock ki expiry kaam ke waqt se bara, lambe kaam ko chhote hisson mein, aur lock ko kaam ke dauran extend karna.

**F26. The cache serves stale data after an update. How do you find and fix it?** Answer: Pehle dekhta hoon update par key clear hui ya nahi (kisi ek code path par bhool), TTL kitni hai, aur kai servers ke local caches. Fix: jahan data likha jata hai wahin se invalidate (model observer ya event), versioned keys (`user:12:v3`), aur critical data (seats) par bohat chhoti TTL ya cache hi nahi, final check database se.

**F27. After Redis restarts, the cache is empty and the database is overwhelmed. What do you do?** Answer: **Cold cache** masla. Cache warm karna (critical keys pehle load), rebuild par lock (F23), rate limiting aur load shedding jab tak cache bhare, aur restart ko traffic kam waqt mein. Detection: restart ke baad database load aur latency alerts.

**F28. Redis fails over and some queued jobs are lost. How do you design for that?** Answer: Redis replication asynchronous hai, to failover mein aakhri writes kho sakti hain. Design: jobs idempotent, important events ke liye outbox (DB mein record, relay job queue mein daale), reconciliation jobs jo "jo hona chahiye tha lekin nahi hua" dhoondein (jaise paid order jis ka SMS nahi gaya), aur queues ke liye AOF persistence.

# Section 4: Database failures

**F29. A deadlock happens in production. What do you do?** Answer: MySQL ek transaction ko kill kar deta hai (error 1213) aur doosri chal jati hai. Laravel mein `DB::transaction(function () { ... }, 3)` deadlock par khud retry karta hai. Prevention: transactions chhoti, rows ko hamesha ek hi order mein lock karna, sahi indexes (kam rows lock hon), aur deadlock ki frequency par nazar. `SHOW ENGINE INNODB STATUS` se latest deadlock aur involved queries dekhta hoon.

**F30. A long-running worker starts failing with "MySQL server has gone away". Why?** Answer: Aam wajahein: connection idle rehne se server ke `wait_timeout` par band ho gayi, packet `max_allowed_packet` se bara, ya server restart hua. Laravel kuch lost-connection errors par ek baar reconnect kar leta hai, lekin lambe kaam (bahar ki API ka lamba intezar) ke dauran DB connection pakre rakhna masla banata hai. Fix: jobs chhoti, external call ke dauran transaction ya connection khuli nahi, zaroorat par `DB::reconnect()`, aur `wait_timeout` aur `max_allowed_packet` check.

**F31. A user saves a record and immediately sees old data. What is going on?** Answer: Shayad read replica lag: write primary par hui, read replica se hui jo abhi peeche hai. Laravel ke read/write config mein `'sticky' => true` (usi request mein write ke baad reads primary par). Agle requests ke liye critical reads primary par, ya write ke response mein hi naya data wapas dena. Replica lag par monitoring aur alert.

**F32. At peak time you get "Too many connections". How do you handle it?** Answer: Har FPM worker aur har queue worker ek connection pakadta hai: (FPM `max_children` x servers) plus queue workers `max_connections` se bara ho jata hai. Fix: sizing theek (connections ka hisaab), requests chhoti rakhna aur external calls ke dauran connection na pakadna, connection pooler (ProxySQL), `max_connections` sirf ek had tak barhana (RAM), aur connection usage percentage par alert.

**F33. A migration fails halfway on a huge production table. What state are you in?** Answer: MySQL mein DDL (ALTER, CREATE INDEX) implicit commit karta hai, to rollback nahi ho sakta: adhi tabdeeli reh sakti hai. Prevention: chhoti single-purpose migrations, production-size copy par pehle test, `php artisan migrate --pretend` se SQL dekhna, bade tables par online schema change tool (gh-ost), expand-then-contract (naya column nullable pehle, code badlo, purana baad mein), backup aur manual fix ka plan. Aur app code dono schema states par chalna chahiye.

**F34. A transaction does three writes and the third fails. What happens, and what about the email you already sent?** Answer: Teeno DB writes rollback ho jati hain (sab ya kuch nahi). Lekin transaction ke **andar** bheji hui email ya API call rollback nahi hoti, isliye side effects commit ke **baad** (`afterCommit`) ya outbox se. Agar kaam kai systems mein hai (DB plus provider), to saga: har step ka compensating action (refund, seat release).

**F35. Two requests try to create the same record at the same moment. What happens?** Answer: `if (!exists) create` mein race hai: dono "nahi hai" dekhte hain aur dono insert karte hain. Fix: database ka **unique constraint**, aur code mein duplicate-key exception pakad kar "pehle se hai" maan kar record fetch (`upsert` ya `firstOrCreate` ke saath constraint). Exception ka naam Laravel version par depend karta hai (naye versions mein `UniqueConstraintViolationException`).

**F36. The database server's disk is full. What do you do?** Answer: MySQL writes rok deta hai. Foran: jagah khali karna **safely**: purani binary logs (replication state dekh kar), slow aur general logs rotate, bade temp files. Data files kabhi delete nahi. Wajah dhoondna (data growth, binlogs, runaway table). Prevention: 70 aur 80 percent par alerts, growth rate ki nigrani, retention aur partition drop, aur binary log expiry.

**F37. A long report or an open transaction makes everything queue up. How do you find and fix it?** Answer: Lambi transaction ya report locks ya metadata lock pakre rakhti hai, aur doosri queries (khaas kar DDL) uske peeche latak jati hain. Dhoondna: `SHOW FULL PROCESSLIST` aur `information_schema.innodb_trx` (kaun si transaction kitni der se khuli). Foran: us session ko `KILL` (asar samajh kar). Prevention: heavy reports read replica par, transactions chhoti, query timeouts (`MAX_EXECUTION_TIME`), `lock_wait_timeout`, aur lambi transactions par alert.

**F38. Someone ran an UPDATE without a WHERE clause in production. What do you do?** Answer: Pehle damage rokta hoon (zaroorat ho to writes rok dein), phir point-in-time recovery se alag copy par restore kar ke sirf mutasir rows wapas laata hoon (poora production overwrite nahi). Prevention: production access mehdood, manual queries ka review ya peer check, `--safe-updates`, audit log, aur backup ka tested restore.

# Section 5: External APIs, timeouts aur partial failures

**F39. The payment or SMS provider becomes very slow. What happens to your web servers?** Answer: Har request jo us provider ko call kar rahi hai ek FPM worker pakad ke baithi rehti hai. Saare workers phans jayen to poori site slow ya down ho jati hai, un pages ke liye bhi jo provider se related nahi. Fix: chhote timeouts (`Http::timeout(5)->connectTimeout(2)`), jahan mumkin ho call queue mein (user ko "processing"), circuit breaker, aur alag queue ya pool taake ek provider poori site na girae (bulkhead).

**F40. The provider recovers and all your retries hit it at once. What is that and how do you prevent it?** Answer: **Retry storm.** Prevention: exponential backoff **plus jitter** (random delay), retries ki tadaad aur total waqt par hadd, queue concurrency aur rate limit (`RateLimited` job middleware), aur circuit breaker jo recovery par thoda thoda traffic bhejta hai (half-open).

**F41. What is a circuit breaker, and how would you build one in Laravel?** Answer: Teen states: **closed** (normal), **open** (lagataar failures ke baad kuch der call hi nahi, foran fail ya fallback), **half-open** (thoda traffic bhej kar check). Laravel mein jobs ke liye `ThrottlesExceptions` middleware (baar baar exception par job ko kuch der ke liye rok deta hai). HTTP calls ke liye apna chhota breaker: cache mein failure counter aur "open until" time, aur call se pehle check. Faida: provider ko recover hone ka moqa, aur hamare workers phansate nahi.

**F42. A payment call times out. Did the charge happen?** Answer: Pata nahi, aur yehi sab se khatarnak state hai. Timeout ka matlab "naakam" nahi, "result maloom nahi". Isliye blind retry nahi (double charge ka khatra). Order ko `unknown` ya `pending_verification` mein rakho, provider se idempotency key ya order reference se asal status poochho, aur reconciliation job se tay karo. Payment calls hamesha idempotency key ke saath.

**F43. The SMS gateway is down for an hour. What happens to the messages?** Answer: Queue mein rukti hain aur backoff ke saath retry. Lekin har message ki zaroorat alag: OTP ki expiry 5 minute hai, ek ghante baad bhejna bekaar, to `retryUntil` ya expiry check. Backup provider (adapter pattern se doosra gateway) par failover, OTP ko priority queue, aur alert jab failure rate barhe. Important messages (ticket confirmation) kho nahi jaane chahiyein: queue persistent aur reconciliation.

**F44. A bulk import of 1 lakh rows fails at row 60,000. What now?** Answer: Aisa design jo **resumable** ho: file ko staging table mein, batches mein process (har batch ke liye chhoti transaction), har row ka status (`done`, `failed`, `reason`), upsert natural key par (dobara chalane se duplicate nahi), checkpoint (kahan tak ho chuka), aur downloadable error report. Ek giant transaction nahi (lock aur memory). Laravel mein `Bus::batch()` jisme `allowFailures()` ho.

**F45. A third-party API changes its response format without notice. How do you cope?** Answer: Adapter layer jo response ko apne DTO mein badalta hai aur **shape validate** karta hai; validation fail ho to saaf error aur alert (silently ghalat data nahi). Contract tests ya recorded samples, vendor ko written report, aur graceful degradation (fallback ya "service temporarily unavailable") jab tak fix na ho.

# Section 6: Deploy, release aur scheduler failures

**F46. A deploy goes bad. How fast can you roll back?** Answer: Immutable releases (har release alag folder) aur `current` symlink: wapas switch seconds ka kaam. Lekin rollback tabhi chalta hai jab DB migrations **backward-compatible** hon (expand-then-contract). Feature flags (nayi cheez band kar do bina deploy), canary (pehle chhote hisse par), aur rollback ka criteria pehle se tay (jaise error rate itna ho to wapas). Rollback ki baqaida practice.

**F47. You rolled the code back, but the migration already dropped a column. What now?** Answer: Phans gaye. Isi liye destructive change (column drop) kabhi usi release mein nahi jis mein code badla: do step. Pehle code ko column istemal karna band karwao aur deploy, kuch din baad column drop. Rollback plan ke baghair destructive migration nahi.

**F48. After a deploy, queue workers are still running old code. Is there anything else to worry about?** Answer: Haan, workers long-running hain, to `queue:restart` (ya Horizon terminate) har deploy par. Aur ek aur baat: queue mein pehle se pade jobs **serialized** hote hain purani class ke saath. Agar nayi release mein job class ka structure badla (property ka naam, constructor), to purani jobs unserialize ya process par fail ho jati hain. Isliye job classes backward-compatible rakhein (naye fields optional), ya deploy se pehle queue drain karein.

**F49. After the deploy the app behaves oddly: missing env values or stale config. What happened?** Answer: `php artisan config:cache` ke baad `env()` sirf config files ke andar kaam karta hai; code mein jahan jahan `env()` seedha use hua wahan `null` aata hai. Aur purana cached config ya route cache naye code ke saath mismatch. Fix: `env()` sirf config files mein, deploy script mein ek hi tarteeb (`config:cache`, `route:cache`, `view:cache`, `event:cache`), aur deploy ke baad smoke test aur health check.

**F50. The scheduler runs the same task on two servers, or a task overlaps itself. How do you prevent it?** Answer: Kai servers par har ek par cron hota hai, to `->onOneServer()` (is ke liye shared cache jo locks support kare, jaise Redis ya database). Overlap ke liye `->withoutOverlapping(10)`: 10 minute ki expiry dein, warna crash ke baad lock bohat der atka reh sakta hai. Behtar: scheduler ek dedicated server par aur task idempotent.

**F51. A scheduled job silently stopped running three days ago. How would you know, and how do you prevent it?** Answer: Silently band hone ka pata nahi chalta kyunke koi error aata hi nahi. Isliye **dead man's switch**: har kamyab run par ek monitor ko ping (`->pingOnSuccess($url)`), aur monitor alert de agar ping na aaye (healthchecks.io jaisi service ya `spatie/laravel-schedule-monitor`). Saath mein: deploy ya server rebuild ke baad cron entry maujood honi chahiye (check), aur last-run time ka dashboard.

**F52. During a rolling deploy, some servers run the new version and some run the old. What breaks?** Answer: Load balancer ke peeche kuch der dono versions saath chalte hain. Todne wali cheezein: DB schema jo sirf naye code ke liye ho, API response ka format badalna, cache keys ya session format ka badalna, aur assets ke naam. Isliye har release dono versions ke saath chalne layak (backward-compatible DB aur API, versioned cache keys, hashed assets), aur ek ek server drain kar ke deploy.

# Section 7: Detection aur observability

**F53. How do you find out something broke before users tell you?** Answer: Kai layers ek saath: (1) **error tracking** (Sentry) aur new-error alerts, (2) **metrics:** error rate, latency p95, queue age, failed jobs, DB connections, (3) **synthetic checks:** bahar se login, search aur booking ka test har minute, (4) **business metrics:** orders per minute ka achanak girna, GPS pings ka band hona, (5) **reconciliation reports:** jo hona chahiye tha lekin nahi hua (paid order bina SMS), (6) **dead man's switch** scheduler ke liye. Sirf logs dekhna detection nahi hai.

**F54. What do you alert on?** Answer: **Symptoms** par jo users feel karein (error rate, latency, failed bookings, queue age), sirf causes par nahi (CPU 80 percent). Har alert ka owner aur runbook, aur sirf wohi page kare jis par abhi insaan ko action lena ho. Baqi dashboard ya email.

**F55. How do you avoid alert fatigue?** Answer: Sahi thresholds aur durations (ek spike par nahi), related alerts ko group, severity ke hisaab se routing, har hafte noisy alerts ka review (theek karo ya hata do), aur SLO-based alerting (error budget jal raha ho to). Agar sab alert karein to koi kisi ko nahi sunta.

**F56. How do you trace one failed request across the web request, the queue job and the external API call?** Answer: **Correlation (request) ID:** middleware mein ek ID banao (ya `X-Request-ID` header lo), log context mein dalo (`Log::withContext`), jobs ko pass karo (job ki property, ya naye Laravel versions mein `Context` facade jo jobs tak chalta hai), bahar ki API ke header mein bhejo, aur Sentry tags mein. Phir ek ID se poori kahani nikalti hai.

**F57. What do you log, and what must you never log?** Answer: Log: request ID, user ID, entity IDs, timing, error class, external call ka status code aur duration, structured JSON mein. **Kabhi nahi:** passwords, tokens, card numbers, poora CNIC ya phone (mask karo), sensitive payloads. Log levels sahi, retention policy, aur logs tak access mehdood.

**F58. How do you detect that GPS data stopped arriving?** Answer: **Absence ka alert**: error nahi aata kyunke kuch hota hi nahi. Do level: global ingest rate (pings per minute expected se bohat kam), aur per-device `last_seen` (kitne devices X minute se khamosh). Dashboard par "stale" label aur operators ko alert.

**F59. What should a health check endpoint check? What is the difference between liveness and readiness?** Answer: **Liveness:** process zinda hai (sasta check). **Readiness:** request serve kar sakta hai (DB aur zaroori Redis reachable). Load balancer readiness fail par server ko rotation se nikalta hai. Nuance: optional dependency (jaise SMS provider) ko readiness mein mat daalo, warna provider ke down hone se saare servers rotation se nikal jayenge aur poori site gir jayegi (cascading failure). Health check halka ho, bhaari queries nahi.

**F60. After an incident, what does a good postmortem contain?** Answer: Blameless format: timeline, impact (kitne users, kitni der), root cause ("5 whys"), detection (kaise pata chala aur kitni der mein), kya achha raha, aur **action items** jin ka owner aur date ho (naya test, naya alert, runbook, safeguard). Maqsad logon ko blame karna nahi, system ko behtar banana.

# Section 8: Data integrity aur recovery

**F61. Someone deleted important data by mistake. How do you get it back?** Answer: Teen darje: (1) **soft deletes** (`deleted_at`) jahan business ko restore chahiye, to ek click mein wapas, (2) **audit log** jo batata hai kis ne kya delete kiya aur purani values, (3) **point-in-time recovery** (backup plus binary logs) se alag copy par restore kar ke sirf wo rows wapas laana. Poora production overwrite nahi. Prevention: access mehdood, delete ke liye confirmation aur role, aur tested restore.

**F62. How do you find inconsistent data, for example a paid order with no ticket?** Answer: **Reconciliation queries** jo schedule par chalti hain aur result alert ya report banate hain (`paid` order jis ka ticket nahi, pending bohat purana, provider mein paid lekin yahan nahi). Yeh bug aur nakam jobs ko user ke complain se pehle pakadte hain. Har query ka owner aur "mil jaye to kya karna hai" runbook.

**F63. How do you replay failed events or jobs safely?** Answer: Replay tabhi safe hai jab consumers idempotent hon. Pehle failure ki wajah theek, phir chhote batch par replay, rate limit ke saath, aur har replay ka log. Purani events ko dobara chalane se pehle dekhna ke wo ab bhi relevant hain (jaise expired OTP ko dobara nahi). Outbox table mein `sent_at` null wali rows se replay aasan hota hai.

**F64. You have backups. How do you know they actually work?** Answer: Jis backup ka restore kabhi test nahi hua wo backup nahi. Schedule par restore drill: alag server par restore, row counts aur checksums check, aur restore mein kitna waqt laga (RTO) note karna. Backup job ke fail hone par alert, aur off-site copy.

**F65. You discover data was being corrupted for three days. What do you do?** Answer: (1) **Phailna roko:** buggy code band ya rollback, (2) **Scope maloom karo:** kab shuru hua, kaun se records (audit log, binary logs, `updated_at`), (3) **Fix-forward ya restore:** sahi values backup ya audit se, repair script jo idempotent ho aur pehle copy par test, (4) **Backfill aur verify:** reconciliation se tasdeeq, (5) **Communication:** mutasir users aur management ko saaf batana, (6) **Prevention:** validation aur constraint, test, aur is tarah ke change ka alert.

**F66. Our database and the payment provider disagree. Which one is the source of truth?** Answer: Paison ke liye provider (ya bank) ka record asal hai, hamara DB uska aks. Isliye reconciliation provider ki settlement file ya API se hamari records ko milati hai aur farq par alert deti hai. Har data ka ek "source of truth" tay hona chahiye, aur baqi copies sync ya reconcile hon.

# Section 9: Pressure mein system

**F67. Traffic suddenly becomes 10 times higher. What breaks first?** Answer: Aam tor par pehle FPM workers (sab busy), phir database (connections, slow queries), phir external providers ki limits. Isi tarteeb se dekhta hoon: workers ka `max_children` aur listen queue (502 ya 504), DB connections aur CPU, queue ki age. Fix: cache, slow kaam queue mein, rate limiting aur waiting room, workers aur servers barhana (LB ke peeche), aur non-critical features band (load shedding). Pehle measure, andaza nahi.

**F68. One slow endpoint slows the entire site. Why, and how do you stop it?** Answer: Slow requests FPM workers ko pakad kar rakhti hain, aur shared pool khatam ho jata hai, to doosre endpoints bhi wait karte hain. Fix: us endpoint ko fast ya queue-based banana, timeouts, alag FPM pool ya server heavy endpoints ke liye (bulkhead), aur per-endpoint latency alerts taake pata chale kaun sa endpoint masla hai.

**F69. A queue worker's memory keeps growing until it is killed. What do you do?** Answer: Long-running process mein leaks jama hote hain (bade collections, static arrays, listeners). Foran: `--max-jobs`, `--max-time`, `--memory` se worker khud restart, Supervisor se wapas. Asal fix: leak dhoondna (memory ka profile, kaun si job), `chunkById`/`lazyById`, `unset`, aur singleton mein state na rakhna. Memory trend par alert.

**F70. A buggy client or attacker hammers your API. What happens, and should rate limiting fail open or closed?** Answer: Rate limiter (`throttle`, Redis ke saath) per user, IP aur API key. Redis ya limiter khud fail ho to faisla: **fail-open** (requests chalne do, availability bachti hai lekin hifazat gayi) ya **fail-closed** (requests roko, hifazat lekin outage). Login aur OTP jaise sensitive endpoints par fail-closed ya local fallback limit, aam read endpoints par fail-open. Aur 429 ke saath `Retry-After` header taake client theek se ruke.

**F71. What is load shedding, and when would you do it?** Answer: System dabao mein ho to kuch requests jaan boojh kar rad karna (503) taake baqi theek chalein: non-critical features band, bhaari reports roko, anonymous traffic ko limit. Behtar hai kuch users ko saaf "abhi busy" milay, bajaye ke sab ko timeouts milen aur system gir jaye. Critical flows (payment) ko priority.

**F72. Logs and temp files suddenly fill the disk. How do you stop it?** Answer: Pehle jagah banana (purani logs rotate ya compress), phir wajah: ek error loop jo har request par log likh raha hai, debug level production par on, ya uploads ki temp files. Fix: `logrotate` ya daily log channel ke saath retention, production mein sahi log level, rate-limited error logging, temp cleanup job, aur disk usage ka alert.

# Section 10: Aur flows: "har step par fail ho to?"

F1 ki tarah in flows ko bhi practice karein. Har flow par: steps, failure, state, detect, recover.

**F73. Signup with email verification: what can fail and what state are you left in?** Answer: Steps: user banao, verification email job, user link click karta hai. (1) User ban gaya lekin email job fail: user unverified aur khabar nahi: retries, failed job alert, "resend" button (rate-limited). (2) Link do baar click: verification idempotent (`email_verified_at` pehle se set to success dikhao). (3) Link expire: naya link bhejne ka raasta. (4) Email bounce ya spam: bounce webhook se mark karna. (5) Do tabs se ek email par signup ka race: `email` par unique constraint aur duplicate error ko saaf message. Detection: unverified users ki umar ki report aur email failure rate.

**F74. GPS ingestion (device, API, queue, worker, DB and Redis): what can fail?** Answer: (1) Duplicate pings: device id plus timestamp unique. (2) Out-of-order: live record sirf naye timestamp par update. (3) Burst: queue smooth karti hai, queue age par alert. (4) Worker down: queue barhti hai, jobs kho nahi jati (persistent queue), alert. (5) DB slow: batch inserts, partitioned history. (6) Redis latest-record down: dashboard DB se latest read ya stale label. (7) Device khamosh: `last_seen` aur stale label. (8) Bad data (impossible speed, 0,0 coordinates): validate aur flag, raw rakho. Detection: ingest rate, queue age, devices without data.

**F75. File upload (inspection photos): what can fail?** Answer: Steps: upload, validate, storage mein rakho, DB row, thumbnail job. (1) File save lekin DB row nahi: orphan file, cleanup job jo DB mein na milne wali purani files hataye. (2) DB row lekin file nahi: broken link, isliye row ko `status = uploading` se shuru karo aur file ke baad `ready`. (3) Thumbnail fail: retry, aur original dikhao. (4) Bari file ya timeout: size limit, chunked upload, direct-to-storage presigned URL. (5) Malicious file: type aur size validation, execute nahi. Detection: failed thumbnail jobs, orphan files ki report.

**F76. Offline attendance sync from a mobile app: what can fail?** Answer: App offline punch store karti hai aur baad mein sync. (1) Dohra sync: har punch ki client-generated UUID (idempotency key) aur server par unique. (2) Late sync: device ka waqt aur server ka receive time dono store, rules ke hisaab se accept. (3) Clock tampering: server time se compare, bohat bara farq flag. (4) Conflict (do devices, ek hi banda): conflict rules aur supervisor review. (5) Sync adha fail: batch mein har punch ka alag status taake dobara bhejne par sirf baqi jayein. Detection: sync failures, stations jinke punches nahi aa rahe.

# Appendix: Laravel code patterns

**1. Idempotent, retry-safe job**

```php
class SendTicketSms implements ShouldQueue {
    use Queueable;

    public int $tries = 5;
    public array $backoff = [10, 60, 300];
    public int $timeout = 30;            // config/queue.php ka retry_after isse bara (jaise 90)

    public function __construct(public int $ticketId) {}

    public function middleware(): array {
        return [new WithoutOverlapping("sms:{$this->ticketId}")];
    }

    public function handle(SmsGateway $sms): void {
        $ticket = Ticket::findOrFail($this->ticketId);
        if ($ticket->sms_sent_at) { return; }                         // dobara chale to kuch nahi
        $sms->send($ticket->phone, 'Your ticket is confirmed', "ticket-{$ticket->id}-confirm");
        $ticket->forceFill(['sms_sent_at' => now()])->save();
    }

    public function failed(Throwable $e): void { /* alert ya manual resend ke liye mark */ }
}

SendTicketSms::dispatch($ticket->id)->afterCommit();
```

**2. Webhook handler: duplicate-safe aur jaldi jawab**

```php
public function __invoke(Request $request) {
    abort_unless($this->validSignature($request->getContent(), $request->header('X-Signature')), 401);

    $eventId = $request->input('id');
    try {
        WebhookEvent::create(['event_id' => $eventId, 'payload' => $request->getContent()]);   // unique(event_id)
    } catch (UniqueConstraintViolationException $e) {
        return response('ok', 200);                      // duplicate: pehle aa chuka
    }

    ProcessPaymentWebhook::dispatch($eventId);           // bhaari kaam queue mein
    return response('ok', 200);
}
```

**3. Idempotent state transition (race-safe)**

```php
$updated = Order::where('id', $orderId)
    ->where('status', 'pending')                         // sirf pending ko paid karo
    ->update(['status' => 'paid', 'paid_at' => now()]);

if ($updated === 0) { return; }                          // pehle hi process ho chuka
// ab sirf pehli baar yahan pohanch kar baqi kaam (SMS dispatch waghera)
```

**4. Bahar ki API: timeouts, selective retry, idempotency key**

```php
$response = Http::timeout(5)->connectTimeout(2)
    ->retry(3, 200, fn ($e) => $e instanceof ConnectionException)   // sirf connection errors par, 4xx par nahi
    ->withHeaders(['Idempotency-Key' => $key])
    ->post($url, $payload);
```

**5. Outbox pattern (DB aur queue ka dual write na toote)**

```php
DB::transaction(function () use ($order) {
    $order->update(['status' => 'paid']);
    Outbox::create(['type' => 'order.paid', 'payload' => ['order_id' => $order->id]]);   // usi transaction mein
});
// har minute ek job: sent_at null rows ko queue mein bhejo aur sent_at set karo (consumers idempotent)
```

**6. Reconciliation aur dead man's switch**

```php
Schedule::command('orders:reconcile')->everyFiveMinutes()
    ->withoutOverlapping(10)->onOneServer()
    ->pingOnSuccess(config('monitoring.reconcile_ok_url'))
    ->pingOnFailure(config('monitoring.reconcile_fail_url'));   // ping na aaye to monitor alert deta hai
```

```sql
-- pending bohat purane: provider se status poochho, phir confirm ya release
SELECT id FROM orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL 15 MINUTE;

-- paid lekin ticket nahi
SELECT o.id FROM orders o LEFT JOIN tickets t ON t.order_id = o.id
WHERE o.status = 'paid' AND t.id IS NULL;
```

**7. Readiness check aur cache outage ko miss samajhna**

```php
Route::get('/ready', function () {
    DB::select('select 1');
    Redis::connection()->ping();      // sirf zaroori dependencies, optional (SMS) nahi
    return response('ok');
});

try { $value = Cache::get($key); }
catch (Throwable $e) { report($e); $value = null; }   // sirf non-critical cache par: outage ko miss maano
```

# Practice kaise karein

1. **Ek asli flow chunein** (HOLOIN ka koi flow ya booking jaisa) aur F1 jaisi table banayen: step, failure, state, detect, recover. Har step ke liye ek concrete misaal.
2. **Teen follow-ups ke jawab tayyar rakhein:** "same event do baar aaye to?", "Redis 30 second ke liye jaye to?", "pata kaise chalega?"
3. **Har jawab 4-step pattern mein bolein** (State, Detect, Recover, Prevent), aur ek number ya example jodein.
4. **Jhoota incident na banayein.** Agar tajurba nahi to "mujhe production mein nahi hua, main yeh check karunga" aur reasoning dikhayen.
5. **Apni asli kahani:** ek jagah jahan aap ne idempotency, retry ya alert lagayi ho, uska before aur after likh lein.

# Rapid-fire (ek line mein)

- **At-least-once vs exactly-once?** Queues aam tor par at-least-once deti hain, isliye consumers idempotent.
- **Idempotent?** Dobara chalane se wohi result.
- **Outbox?** Event ko DB transaction mein likho, alag job queue mein bheje.
- **Saga?** Kai systems ke kaam ki chain jis mein har step ka compensating action ho.
- **Reconciliation?** Do records (hamara aur provider ka) ko milana aur farq pakadna.
- **Circuit breaker?** Lagataar failure par kuch der call band, fail fast.
- **Jitter?** Retry delay mein random hissa taake sab ek saath na takrayen.
- **Dead man's switch?** Kaam hone par ping, ping na aaye to alert.
- **Liveness vs readiness?** Process zinda hai vs request serve kar sakta hai.
- **Blast radius?** Ek failure kitne hisse ko asar karta hai; kam rakhna maqsad.
- **Backpressure?** System na sambhal sake to input ko slow ya buffer karna.
- **Dead-letter queue?** Baar baar fail hone wali jobs ki alag jagah jahan unhein dekha ja sake.
- **Poison message?** Aisi job jo hamesha fail ho aur queue ko roke.
- **Cache stampede?** Hot key expire par hazaron requests ka ek saath database par girna.

# Part 2: Technology-wise failure questions (Nginx, PHP-FPM, Laravel, MySQL, Redis, MongoDB, Docker aur baqi)

Upar ke F1 se F76 flows aur patterns par the. Yeh hissa **har technology ke apne failure modes** par hai, jo senior interviews mein follow-up ban kar aate hain. Numbering F77 se aage. Har answer mein pehle symptom ya state, phir pata kaise chale, phir fix aur prevention. Aakhir mein symptom se first-checks ki table aur commands ki cheat sheet hai.

## A. Nginx, PHP-FPM aur Linux

**F77. Users see 502 Bad Gateway. What do you check, in order?** Answer: 502 ka matlab Nginx ko upstream (FPM) se valid jawab nahi mila. Order: (1) FPM chal raha hai? (`systemctl status php8.x-fpm`, container up?), (2) Nginx ka `fastcgi_pass` sahi socket ya port par ja raha hai aur permissions theek hain (socket ka owner), (3) FPM log mein crash ya `exited on signal 9` (OOM kill), (4) listen backlog full to nahi (workers sab busy), (5) kya abhi deploy hua (config ya PHP version badla). Pehle Nginx `error.log` dekhta hoon, wahan wajah likhi hoti hai (`connect() failed`, `upstream prematurely closed`). Prevention: FPM ka health monitoring aur 502 rate par alert.

**F78. Users see 504 Gateway Timeout. Where does the time go?** Answer: 504 ka matlab upstream ne waqt par jawab nahi diya (`fastcgi_read_timeout`, default 60 second). Request kahin atki: slow query, bahar ki API ka intezar, ya workers ki kami (request listen queue mein wait). Dhoondna: FPM slowlog (stack trace dikhata hai request kahan atki), slow query log, APM ya Telescope. Fix wajah ka, timeout barhana nahi (wo sirf masla chhupata hai aur workers aur der pakre rehte hain). Nuance: timeouts ka silsila (LB, Nginx, FPM, app) inner chhote aur outer bare rakho, taake app khud saaf error de, LB beech mein na kaate.

**F79. The FPM log says "server reached pm.max\_children setting". What is happening?** Answer: Saare workers busy hain aur nayi requests intezar kar rahi hain (listen queue), phir 502 ya 504. Pehle dekhta hoon workers ko kaun pakad raha hai (slow requests, slow external API), kyunke sirf `max_children` barhane se RAM khatam ho kar OOM kill ho sakta hai. Throughput taqreeban workers / response time hai, to response time kam karna zyada asardaar hai. Alerts: active workers aur listen queue.

**F80. Why can a PHP script run for minutes even when `max_execution_time` is 30 seconds?** Answer: Linux par `max_execution_time` sirf script ke apne execution time ko ginta hai, DB query, `sleep`, stream ya network ka intezar uski ginti mein nahi aata. To atki hui request worker ko der tak pakad sakti hai. Wall-clock par kaatne ke liye FPM ka `request_terminate_timeout`, aur bahar ki calls par apne timeouts (HTTP aur DB).

**F81. After a symlink deploy the site still serves old code. Why?** Answer: OPcache aur realpath cache. Production mein aksar `opcache.validate_timestamps=0` hota hai (file check band, speed ke liye), to PHP compiled purana code memory mein hi rakhta hai. Symlink badalne ke baad FPM ko **reload** karna parta hai (CLI se `opcache_reset` FPM ki cache ko nahi chhoota). Deploy script mein symlink switch ke baad `php-fpm reload` aur workers restart, aur release ke baad version endpoint se verify.

**F82. Large file uploads fail with 413 or silently. What do you check?** Answer: Teen limits ek saath: Nginx ka `client_max_body_size` (default sirf 1 MB, to 413), PHP ka `upload_max_filesize` aur `post_max_size`, aur timeouts. Laravel validation (`max:`) ka size bhi. Teeno mein sab se chhoti limit jeet'ti hai. Bade files ke liye chunked upload ya direct-to-storage presigned URL, taake FPM workers dair tak na bandhein.

**F83. One request dies with "Allowed memory size exhausted". Do you just raise `memory_limit`?** Answer: Nahi, pehle wajah: poori table ya bara collection memory mein, bara file ya image process, ya array jo barhta ja raha. Fix: `chunkById`/`lazyById`, streaming, queue job (jahan memory limit alag ho sakti hai), pagination. Limit sirf tab barhao jab kaam jaayaz tor par zyada memory chahta ho. Kyunke `memory_limit` x `max_children` ko RAM mein samaana hai.

**F84. The Linux OOM killer kills php-fpm or MySQL. What do you do?** Answer: Kernel RAM khatam hone par bari process maar deta hai (`dmesg | grep -i kill`, FPM log mein `signal 9`). MySQL maar diya jaye to poori site down. Fix: `max_children` ko RAM ke hisaab se kam, memory leaks dhoondna, MySQL aur PHP alag servers par, swap ka sahi istemal, aur memory alerts. MySQL ke `oom_score_adj` se use bachana bhi ek tareeqa hai, lekin asal fix RAM ka hisaab hai.

**F85. Nginx logs "too many open files". What is wrong?** Answer: File descriptor ki limit. Har connection ek descriptor leta hai. Fix: `worker_rlimit_nofile` aur `worker_connections` barhana, systemd unit mein `LimitNOFILE`, aur OS `ulimit -n`. Saath mein dekhna ke connections leak to nahi ho rahe (upstream keepalive, band na hone wale connections).

**F86. The disk shows free space but writes fail. Why?** Answer: **Inodes khatam** (bohat saari chhoti files: sessions ki files, cache files, temp files). `df -i` se check. Fix: unhein saaf karna, aur sessions aur cache file driver ke bajaye Redis ya database mein. Alert inode usage par bhi, sirf disk space par nahi.

**F87. The server clock drifts by five minutes. What breaks?** Answer: TLS certificates ki validity, JWT ya token ke `exp` aur `nbf`, webhook signatures ki timestamp tolerance, Laravel signed URLs ki expiry, scheduled tasks aur logs ki tarteeb. Fix: NTP ya chrony chalu aur monitor (clock offset par alert), aur sab servers ek hi source se sync.

**F88. DNS resolution fails intermittently for the payment provider or the database host. What happens?** Answer: Requests random fail ya slow (har baar resolve ka timeout). Asar DB connections aur provider calls dono par. Fix: chhote DNS timeouts, local DNS caching resolver, DB ke liye IP ya internal stable name, retry with backoff, aur failure par alert. Cutover se pehle DNS TTL kam.

**F89. After log rotation, Nginx or Laravel stops writing logs. Why?** Answer: Process purani file ka handle pakre rakhta hai jo rename ho gayi. Nginx ko rotation ke baad reopen signal (`nginx -s reopen` ya logrotate ka postrotate), Laravel mein `daily` channel (date ke hisaab se khud nayi file, retention days). Prevention: log files ka alert ("koi naya log nahi aaya") aur rotation ka test.

**F90. CPU is at 100 percent but traffic is normal. How do you find the cause?** Answer: `top` ya `htop` se kaun si process (FPM, MySQL, queue worker, ya koi cron). Agar MySQL: `SHOW PROCESSLIST` aur slow query log (missing index, bara report). Agar PHP: FPM slowlog, profiler (Xdebug ya Blackfire ya Pulse), runaway loop. Cache stampede, bot traffic, ya ek stuck queue job bhi wajah ho sakti hai. Pehle "kaun si process", phir "kaun sa code".

## B. Laravel application ke failure modes

**F91. You rotate `APP_KEY`. What breaks?** Answer: Purani sessions aur encrypted cookies invalid (sab users logout), aur `encrypted` casts ya `Crypt` se likhe hue data `DecryptException` se **parha nahi ja sakta**. Naye Laravel versions `APP_PREVIOUS_KEYS` se purani keys par decrypt ki ijazat dete hain (apna version check karein). Isliye key rotation ka plan: purani key rakho jab tak data re-encrypt na ho jaye, aur key ka backup alag safe jagah. Key ko kabhi "bas badal do" nahi.

**F92. A queued job references a record that was deleted before the job ran. What happens?** Answer: `SerializesModels` job chalte waqt model ID se dobara fetch karta hai, record na mile to `ModelNotFoundException` aur job fail (aur retries bekar). Agar record ka hatna normal hai to job class mein `public $deleteWhenMissingModels = true;` (job chup chaap drop). Warna failure handling mein saaf message. Prevention: delete ke waqt related pending jobs ka khayal (state check job ke shuru mein).

**F93. Two admins edit the same record and one silently overwrites the other. How do you prevent it?** Answer: **Lost update.** Optimistic locking: form mein `version` ya `updated_at`, update mein WHERE mein wohi check:

```php
$updated = Inspection::where('id', $id)->where('version', $request->version)
    ->update(['notes' => $request->notes, 'version' => DB::raw('version + 1')]);
if ($updated === 0) { abort(409, 'Record kisi aur ne badal diya, dobara load karein'); }
```

Agar conflicts bohat aam hon ya kaam chhota ho to pessimistic `lockForUpdate()` transaction mein. Counters ke liye `increment()` (atomic).

**F94. Users randomly get "419 Page Expired". What are the causes?** Answer: CSRF token session se match nahi hota: session expire hui (form bohat der khula raha), session cookie set nahi ho rahi (HTTPS ke peeche `secure` cookie, ghalat domain, `SameSite`), session driver (Redis) ka masla, ya multiple tabs mein logout. LB ke peeche `X-Forwarded-Proto` trusted na ho to Laravel ko HTTP lagta hai aur secure cookie nahi bhejta. Fix: session lifetime, trusted proxies, cookie settings, aur forms ke liye user-friendly refresh ("session khatam, dobara try") bajaye error page ke.

**F95. After putting the app behind a load balancer you get redirect loops, or all users are rate-limited together. Why?** Answer: Laravel LB ko client samajh raha hai: `REMOTE_ADDR` LB ka IP hai, aur `X-Forwarded-Proto` trusted nahi to HTTPS detect nahi hota (redirect loop). Rate limiting IP par hai to saare users ek IP (LB) ban jate hain aur sab ek saath block. Fix: trusted proxies set (Laravel 11+ mein `$middleware->trustProxies(at: ['10.0.0.0/24'])`, purane versions mein `TrustProxies` middleware), taake asal client IP aur scheme mile.

**F96. You run `php artisan down` for maintenance. What happens to queued jobs, scheduled tasks and in-flight requests?** Answer: Naye web requests ko 503 milta hai (secret ya bypass se admin andar aa sakta hai). Queue workers maintenance mode mein jobs process nahi karte jab tak app wapas `up` na ho (Laravel docs ke mutabiq), to jobs jama hoti hain, aur `up` ke baad backlog. Scheduler ke tasks bhi maintenance mode mein nahi chalte (jab tak `evenInMaintenanceMode()` na ho). In-flight requests chal kar khatam hoti hain. Plan: maintenance se pehle backlog dekhna, user ko saaf message aur wapas aane ka waqt, aur zero-downtime deploy jahan mumkin.

**F97. S3 or your file storage is down while users upload files. What happens?** Answer: Uploads fail ya request latak jati hai (timeout ke baghair FPM worker phans jata hai). Fix: storage client par chhote timeouts, upload ko saaf error ya "baad mein koshish" ke saath, direct-to-storage presigned upload (hamare servers beech mein nahi), ya local temp rakh kar queue job se storage mein bhejna aur status `uploading` se `ready`. Alert: storage errors ki rate.

**F98. The email provider is down. How do you avoid losing mails or blocking users?** Answer: Email hamesha queue se (`Mail::queue`, ya `ShouldQueue` notification), retries backoff ke saath, failed jobs ka alert. Laravel mein `failover` mailer (pehla fail ho to doosra provider). Zaroori mails (OTP, ticket) ko priority queue aur expiry, aur "resend" ka raasta. SPF, DKIM aur bounce handling bhi deliverability ka hissa.

**F99. A synchronous event listener throws an exception. What happens to the request and to the other listeners?** Answer: Sync listener ki exception request ko fail kar deti hai (user ko 500) aur uske baad ke listeners chalte hi nahi. Lekin shayad main kaam (jaise order save) ho chuka ho: adhi state. Fix: slow ya risky listeners ko `ShouldQueue` (alag job, alag retries), critical kaam ko explicit service mein (event par chhoda nahi), aur listener ke andar errors ko catch ya report jahan failure se request nahi girni chahiye.

**F100. Your observer-based audit log has gaps. Why?** Answer: Observers sirf model events par chalte hain. Gaps ki wajahein: query builder ya `Model::where()->update()` jaise **mass updates** (events nahi), raw SQL ya `DB::table()`, seeders ya imports jo events band rakhte hain (`withoutEvents`), doosre applications ya scripts jo seedha DB mein likhein, aur `saveQuietly()`. Fix: updates ko model level par, ya audit explicit likhna, aur jahan database-level guarantee chahiye wahan trigger. Aur audit ka reconciliation (counts ka mukabla).

**F101. A scheduled report command runs out of memory at 2 a.m. and nobody notices until morning. How do you fix and detect it?** Answer: Fix: report ko `chunkById`/`lazyById` ya DB-side aggregation se, streaming output, aur heavy kaam queue job mein. Detection: command ke fail hone par `pingOnFailure` ya `onFailure` notification, aur dead man's switch (kamyab run par ping, na aaye to alert). Silent failure sab se mehnga hoti hai.

**F102. Reports differ by five hours, and rows around midnight go missing. What is the cause?** Answer: Time zone ka mix: DB UTC mein, app ya report Pakistan time mein (UTC+5), aur `DATE(created_at)` UTC din ke hisaab se group karta hai. Fix: ek policy (UTC mein store, display mein `Asia/Karachi`), reports ke liye din ki boundaries Pakistan time ki UTC mein convert kar ke range query (`>= start AND < end`), aur tests jo raat 12 ke aas paas ke rows par chalein.

**F103. Your rate limiter counts tenants or users incorrectly. What can go wrong?** Answer: Key ka ghalat intikhab: sirf IP par (LB ke peeche sab ek, ya NAT ke peeche ek office ke sab log), ya sirf user ID par (login se pehle attacker free). Fix: sahi key (user ID jahan login ho, warna IP plus route), trusted proxies theek, alag limits login aur OTP ke liye, aur Redis down hone par fail-open ya fail-closed ka faisla (F70). 429 ke saath `Retry-After`.

**F104. A job must act on the latest data, not what existed at dispatch time. How do you make sure?** Answer: Job ko poora data nahi, **ID** do aur `handle()` mein fresh data parho (`SerializesModels` model ko ID se dobara fetch karta hai, lekin job mein pass kiye hue arrays ya DTOs dispatch ke waqt ki snapshot hain). Kaam shuru karte waqt state check bhi (`if ($order->status !== 'pending') return;`), taake dispatch aur run ke beech badli hui haalat ko handle kare.

## C. MySQL ke failure modes

**F105. A read replica stops replicating. What do you do?** Answer: `SHOW REPLICA STATUS\G` (purane versions mein `SHOW SLAVE STATUS`) mein `Replica_SQL_Running` aur last error dekhta hoon (duplicate key, missing row, ya lag `Seconds_Behind_Source`). Error ko aankh band kar ke skip nahi karta, kyunke data drift ho jata hai (replica aur primary ka data alag). Pehle wajah, phir theek karna ya replica ko backup se dobara bana lena. Is dauran us replica se reads band (lag ya stale data). Prevention: replication lag aur thread status par alert, aur replica par koi direct write nahi (read-only).

**F106. An `AUTO_INCREMENT` id reaches its maximum. What happens?** Answer: Signed `INT` ki hadd 2,147,483,647 hai. Phir inserts fail (duplicate ya out-of-range error) aur table likhne ke qabil nahi rehti. Misaal: 17 million pings roz ho to taqreeban 124 din mein yeh hadd aa jati hai. Isliye event aur history tables ke liye `BIGINT` (Laravel ka `$table->id()` already `BIGINT UNSIGNED` hai, `increments()` `INT` hai). Bari table ka `INT` se `BIGINT` badalna khud ek bari migration hai, to pehle se sahi type. Monitoring: id ka max ke qareeb pohnchna.

**F107. What happens if MySQL strict mode is off?** Answer: Ghalat data **chup chaap** save ho jata hai: lambi string kaat di jati hai, ghalat date `0000-00-00` ban jati hai, number ghalat round. Pata tab chalta hai jab reports ghalat aayein. Laravel ka `'strict' => true` (MySQL connection) strict `sql_mode` lagata hai (`STRICT_TRANS_TABLES`, `ONLY_FULL_GROUP_BY` waghera) to error aata hai, jo chup chaap ghalat data se behtar hai. Purane system mein strict on karna ek migration ka kaam hai (pehle maujooda data clean).

**F108. A bulk insert fails with "Got a packet bigger than max\_allowed\_packet". Fix?** Answer: Ek query ka size server ki `max_allowed_packet` se bara ho gaya. Fix: insert ko chhote batches mein (1,000 se 5,000 rows), na ke sirf limit barhana. Limit server aur client dono par check. Aur bari binary data (files) database mein rakhne ke bajaye object storage mein.

**F109. An `ALTER TABLE` makes the whole site hang. Why?** Answer: `ALTER` ko table par **metadata lock** chahiye. Agar koi purani lambi transaction ya query table par khuli ho, ALTER us ka intezar karta hai, aur uske peeche aane wali **saari nayi queries bhi** ALTER ke peeche queue ho jati hain: poori table jam. Prevention: ALTER se pehle `information_schema.innodb_trx` mein lambi transactions dekho, `lock_wait_timeout` chhota rakho (ALTER jaldi haar jaye aur site na jame), online DDL (`ALGORITHM=INPLACE, LOCK=NONE` jahan supported) ya gh-ost, aur kam traffic waqt.

**F110. After a MySQL restart, queries are slow for 20 minutes. Why?** Answer: **Cold buffer pool**: memory cache khali hai, to har read disk se. MySQL 8 mein buffer pool ka dump aur load default on hota hai (`innodb_buffer_pool_dump_at_shutdown`, `load_at_startup`) jo isay kam karta hai, lekin bari DB mein phir bhi waqt lagta hai. Plan: restart traffic kam waqt mein, app ki taraf se cache aur rate limiting jab tak warm na ho, aur planned failover mein replica ka pool pehle se warm.

**F111. The nightly backup makes the site slow or locks tables. What is wrong?** Answer: `mysqldump` default mein tables lock kar sakta hai ya bhari I/O karta hai. InnoDB ke liye `--single-transaction` (consistent snapshot bina locks ke), backup ko replica se lena, ya physical backup tools (Percona XtraBackup). Backup ka waqt kam traffic mein, aur uska restore time naapna (RTO).

**F112. Urdu text shows as `???` or inserts fail with "Incorrect string value". Why?** Answer: Table ya connection ka charset `utf8` (purana, sirf 3 bytes) ya `latin1` hai. Fix: database, table aur connection teeno `utf8mb4` (Laravel config mein `'charset' => 'utf8mb4'` aur collation). Maujooda data ko convert karne se pehle backup aur test, aur index key length ka khayal (utf8mb4 mein indexes bare hote hain).

**F113. `ON DELETE CASCADE` deleted far more than you expected. How do you prevent that?** Answer: Parent delete par saare bachche (aur unke bachche) chain mein delete ho gaye, audit ya history bhi. Aur bohat saari rows lock bhi hui. Prevention: audit ya financial data par `RESTRICT` ya `SET NULL`, soft deletes, delete ke liye business-level check, aur bare delete batches mein.

**F114. After a MySQL failover, the app throws "The MySQL server is running with the --read-only option". What happened?** Answer: App abhi purane primary (ya promoted nahi hui replica) ko write bhej raha hai jo read-only hai. Causes: DNS ya connection config purana, connection pool purani connections pakre hue, ya failover ka routing nahi badla. Fix: app ko stable endpoint (VIP, proxy jaise ProxySQL ya DNS) se jorna, failover ke baad workers aur FPM ko restart ya reconnect, aur failover drill jis mein app ka behavior test ho.

**F115. A query that was fast yesterday is slow today with no code change. Why?** Answer: Data barh gaya ya statistics purani hain, to optimizer ne dusra plan chuna (index ke bajaye scan, ya ghalat join order). Check: `EXPLAIN` aaj ka plan vs pehle ka, `ANALYZE TABLE` se statistics refresh, missing ya ghalat composite index, aur query ka selectivity. Index hints aakhri raasta hai. Prevention: slow query alerts aur plan regression ka dhyan bade data growth ke baad.

**F116. Sorts or group-bys suddenly spill to disk and become slow. What do you check?** Answer: `EXPLAIN` mein `Using temporary` ya `Using filesort` aur status counters `Created_tmp_disk_tables`. Wajah: result set bara, index sort ya group ko serve nahi karta, ya `tmp_table_size`/`sort_buffer_size` chhote. Fix: sahi composite index, query se kam columns aur rows, summary table, aur phir (aakhir mein) buffers. Pehle query theek, memory settings baad mein.

## D. Redis aur queue infrastructure

**F117. Redis returns "OOM command not allowed when used memory > 'maxmemory'". What happens to your app?** Answer: Eviction policy `noeviction` ho to writes reject hoti hain: cache set fail, sessions ka likhna fail, **queue dispatch fail**. Reads chalte hain. Fix foran: memory khali (bade keys, purani keys, TTL), phir wajah (TTL ke baghair keys, unbounded lists, bara payload). Prevention: memory 70 percent par alert, har key ka TTL, cache aur queue ke alag instances, aur queue dispatch failure ka handling (outbox).

**F118. Someone ran `KEYS *` (or deleted a huge key) in production and Redis froze. Why?** Answer: Redis ka command execution single-threaded hai: ek bhaari command sab ko block kar deta hai. `KEYS *` poori keyspace scan karta hai. Rules: `SCAN` (chhote cursor batches), bare keys ke liye `UNLINK` (background free) `DEL` ke bajaye, bare lists ya sets ko todna (`--bigkeys` se dhoondna), aur `SLOWLOG GET` se slow commands. Production mein khatarnak commands ko rename ya ACL se band.

**F119. Redis refuses connections (maxclients). How did that happen?** Answer: Har FPM worker aur queue worker Redis connections kholte hain; kai servers x workers x multiple connections (cache, session, queue alag) `maxclients` paar kar jate hain. Ya connections leak (band nahi hoti). Fix: connections ka hisaab, `maxclients` aur OS limits, persistent connections jahan munasib, workers ka sahi size, aur `INFO clients` par alert.

**F120. A network partition makes Sentinel promote a replica while the old master still accepts writes. What can go wrong?** Answer: **Split-brain:** do masters; partition khatam hone par ek ki writes kho jati hain. Mitigation: `min-replicas-to-write` aur `min-replicas-max-lag` (master tab hi write le jab kuch replicas connected hon), clients Sentinel se master poochen, aur design aisa jo Redis ke lost writes se na toote (queues idempotent, reconciliation, DB source of truth). Redis ko paison ke liye source of truth kabhi nahi.

**F121. Horizon (or the queue workers) stopped and nobody noticed. How do you prevent it?** Answer: Silent failure. Prevention: Supervisor ya systemd `horizon` ko zinda rakhe (auto restart), `php artisan horizon:status` ka monitoring, Horizon ke `waits` thresholds (queue ka intezar lamba ho to notification), queue age aur backlog par alert, aur ek dead man's switch (ek chhoti recurring job jo ping bheje). Deploy ke baad `horizon:terminate` aur Supervisor se wapas.

**F122. Redis restarts without persistence. What do you lose?** Answer: Cache: koi masla nahi (khali ho kar dobara bharta hai, magar cold cache F27). **Sessions:** sab users logout. **Queued aur delayed jobs: kho jati hain** (sab se bara nuqsan). **Locks aur rate limiter counters:** reset. Isliye jo cheezein asal data hain (jobs, sessions) unke liye persistence (AOF), alag instance, ya woh DB mein, aur recovery ke liye reconciliation jobs jo "jo hona chahiye tha" wapas laayein.

**F123. Jobs stay stuck in "reserved" after a worker was killed. What happens, and when do they come back?** Answer: Worker ke maarne par job reserved set mein reh jati hai aur `retry_after` seconds ke baad queue mein wapas aati hai (isi liye F3 ka rule). Is dauran koi kuch nahi karta: delay. Agar `retry_after` bohat bara ho to delay lamba, chhota ho to duplicates. Isliye jobs ka timeout aur `retry_after` job ki asal duration ke hisaab se, aur reserved jobs ki age par monitoring.

## E. MongoDB ke failure modes

**F124. The MongoDB primary fails. What do writes experience?** Answer: Replica set mein election hota hai (aam tor par kuch seconds), us dauran primary nahi hota aur writes fail ya intezar karte hain (`NotWritablePrimary`). Drivers retryable writes se ek baar khud dobara koshish karte hain. App ko in errors ko saaf handle karna chahiye (retry with backoff, user ko "abhi busy"). Failover ka test aur election times ka monitor.

**F125. Can you lose acknowledged writes during a MongoDB failover?** Answer: Haan, agar write concern `w: 1` ho: primary ne ack de diya lekin replicas tak nahi pohancha, aur failover ke baad wo write **rollback** ho jati hai. Important data ke liye `w: "majority"` (aur zaroorat par journal). Qeemat: thoda zyada latency. Paise ya bookings jaisa data majority write concern ke saath ya MySQL mein.

**F126. Concurrent upserts create duplicate documents. Why?** Answer: `updateOne(..., {upsert: true})` do concurrent requests mein dono "nahi mila" dekh kar dono insert kar sakte hain jab filter field par **unique index** na ho. Fix: unique index (`train_id`) aur duplicate-key error (E11000) par retry. Unique index ke baghair upsert par bharosa nahi.

**F127. A document hits MongoDB's 16 MB limit. How did that happen, and what do you do?** Answer: Ek document mein unbounded array embed ki gayi (jaise train ke document mein saare pings). Document barhta jata hai (aur update slow), aakhir limit par error. Fix: alag collection (har ping ek document) ya **bucket pattern** (har ghante ka ek document), aur embed sirf wo jo bounded ho aur saath parha jata ho. Document size par monitoring.

**F128. A TTL index does not delete documents exactly on time. Why?** Answer: TTL ka background monitor har taqreeban 60 second mein chalta hai, to delete thori der se hota hai, aur bhari deletes ke waqt load aata hai. Isliye TTL ko exact expiry ke liye mat istemal karo (query mein khud expiry check). Retention cleanup ke liye theek hai, business logic ke liye nahi.

**F129. A MongoDB query suddenly gets slow under load. What do you check?** Answer: `explain('executionStats')`: `COLLSCAN` ka matlab index nahi, aur `totalDocsExamined` vs `nReturned` ka bara farq. Naya query pattern ya index missing ya data barhne se. Fix: sahi compound index (ESR rule: Equality, Sort, Range ka order), projection se kam fields, aur slow query profiler. Index build bhi load laata hai, to kam traffic mein.

**F130. Documents with missing or old fields crash the app. How do you cope?** Answer: Schema-less ka matlab schema nahi, **schema app mein** hai. Mausam ke saath purane documents mein naye fields nahi hote. Fix: `$jsonSchema` validation (nayi writes ke liye), app mein DTO ya defaults jo missing fields sambhalein, versioned documents (`schema_version`) aur background migration. Kabhi "field zaroor hoga" maan kar nahi.

**F131. Reading from a MongoDB secondary returns stale data. Is that a bug?** Answer: Nahi, ye replica lag hai, MySQL replica jaisa. `readPreference: secondary` par secondary peeche ho sakti hai. Critical reads (abhi likha hua data) primary se, analytics ya reports secondary se. Aur `readConcern` aur `writeConcern` ko samajh kar chuno. Lag par monitoring.

## F. Docker aur containers

**F132. A container keeps restarting (crash loop). How do you debug it?** Answer: `docker ps -a` (status aur restart count), `docker logs --tail 100 <name>` (aakhri error), exit code dekho: **1** app error, **137** SIGKILL (aksar OOM), **143** SIGTERM (band kiya gaya), **139** segfault. `docker inspect` mein `State.OOMKilled`. Phir missing env vars, wrong DB host, permissions, port conflict. Restart policy crash loop mein asal error chhupa deta hai, isliye logs foran dekhna.

**F133. A container exits with code 137. What does it mean?** Answer: Process ko SIGKILL mila, aksar kernel ke OOM killer se jab container ki memory limit ya host ki RAM khatam hui (`docker inspect --format '{{.State.OOMKilled}}' <name>`). Fix: memory ka profile (leak ya bara collection), container ki limit sahi, `pm.max_children` x worker memory limit se kam, queue workers `--memory`. Sirf limit barhana nahi.

**F134. The app container starts before the database is ready and crashes. How do you handle it?** Answer: `depends_on` sirf start ka order deta hai, "ready" ka nahi. Fix: DB service par `healthcheck` aur `depends_on: condition: service_healthy`, aur app ki taraf se connection retry with backoff (production mein DB kisi bhi waqt restart ho sakti hai, to sirf start par nahi balke hamesha).

**F135. Data disappears after recreating a container. Why?** Answer: Data container ki writable layer mein tha jo container hatne par ja'ti hai. DB aur uploads ke liye **named volumes** (ya bind mounts), aur volume ke backups. Bind mounts mein file ownership ka masla (`www-data` ka uid) aur permissions. Production DB ko aksar managed ya alag server par.

**F136. The disk fills up because of Docker images and logs. What do you do?** Answer: `docker system df` se dekho kya jagah le raha hai. Purane images aur stopped containers `docker system prune` (soch kar, running cheezein na chhue), aur container logs ki hadd (`json-file` driver mein `max-size` aur `max-file`). Prevention: image cleanup CI ya cron mein, aur disk alert.

**F137. You deploy using the `latest` image tag and production breaks. Why?** Answer: `latest` kisi bhi din naya version ho sakta hai (base image ya PHP ka upgrade), to wohi Dockerfile kal aur aaj alag cheez bana'ta hai. Fix: version tags ya image digest pin (`php:8.3-fpm`), apni images ko build number ya git SHA ka tag, aur upgrades ek planned change ki tarah test kar ke.

**F138. A queue-worker container is stopped during a deploy and a job is cut in half. How do you prevent that?** Answer: Container stop par SIGTERM milta hai. `queue:work` SIGTERM par chalti job khatam kar ke band hota hai (PCNTL extension ke saath), lekin Docker `stop_grace_period` (default 10 second) se pehle SIGKILL kar deta hai agar job lambi ho. Fix: grace period job ki max duration se bara, jobs idempotent (F2), aur job `timeout` chhota. Rolling deploy mein purane workers ko drain.

**F139. Secrets end up baked into an image or printed in logs. What do you do?** Answer: Image history mein secret hamesha ke liye (layers). Fix: secrets image mein nahi, runtime par env ya secret mounts, `.dockerignore` mein `.env` aur `.git`, multi-stage builds. Agar leak ho gaya to **foran rotate** (sirf image hatana kaafi nahi), aur logs mein secrets mask. CI mein secret scanning.

## G. Load balancer aur network failures

**F140. Behind the load balancer you see intermittent 502s that you cannot reproduce. What is a classic cause?** Answer: **Keepalive timeout mismatch.** LB ya Nginx upstream ka connection reuse karta hai, lekin backend ne apni keepalive timeout par wo connection pehle band kar diya, aur LB usi band connection par request bhej deta hai: random 502. Fix: backend ka keepalive timeout LB ke idle timeout se **bara**, Nginx upstream mein `keepalive` ke saath sahi timeouts, aur LB ke retry (`proxy_next_upstream`) sirf idempotent requests ke liye.

**F141. A request takes 45 seconds and the user sees a cut-off or a vague error. Where can timeouts disagree?** Answer: Silsila: client, LB (jaise 60s), Nginx (`proxy_read_timeout`, `fastcgi_read_timeout`), FPM (`request_terminate_timeout`), phir app (HTTP aur DB timeouts). Agar bahar wala chhota hua to beech mein request kat jati hai aur app ko pata nahi chalta (kaam adha). Rule: **andar wale timeouts chhote, bahar wale bare**, taake app khud saaf error de aur cleanup kare. Lambe kaam ko queue mein, aur user ko 202 plus status endpoint.

**F142. Load balancer health checks flap, so servers keep leaving and rejoining. What is wrong?** Answer: Health check bohat sakht (ek slow response par nikal do), ya bhaari (DB queries), ya server genuinely overloaded (nikalne se baqi par load barhta hai aur wo bhi nikalte hain: cascading). Fix: `fall` aur `rise` thresholds (3 fails par nikalo, 2 pass par wapas), halka readiness check, aur capacity ka khayal (ek server girne par baqi sambhal saken). Flapping par alert.

**F143. With sticky sessions, one server dies. What do users experience?** Answer: Us server par sessions rakhne wale sab users logout ya session kho dete hain. Isliye sticky sessions par bharosa nahi: sessions Redis ya database mein, taake koi bhi server koi bhi request sambhal le. Sticky sirf optimization ho, zaroorat nahi.

**F144. Your site works in browsers but the mobile app or an API client fails with TLS errors. Why?** Answer: Aksar **intermediate certificate chain adhi** lagi hai. Browsers khud missing intermediate dhoond lete hain, lekin mobile apps aur API clients nahi. Test: `openssl s_client -connect host:443 -showcerts`, ya SSL checker. Fix: server par full chain certificate. Aur certificate expiry par monitoring aur auto-renew (Q208 main guide mein).

**F145. One slow node drags the average latency of the whole service. How do you handle it?** Answer: Round robin slow node ko bhi barabar traffic deta hai. `least_conn` ya latency-aware balancing, outlier detection (jo node slow ho use temporarily nikalo), aur wajah dhoondna (us node ki disk, noisy neighbor, ya ghalat config). Dashboards mein per-node latency, sirf average nahi (percentiles).

## H. Security failures

**F146. You find `APP_DEBUG=true` in production, or the `.env` file was publicly reachable. What do you do?** Answer: Pehle band karo: debug off, web root se `.env` ka access band (Nginx rule, document root sirf `public`). Phir maan kar chalo ke **secrets leak ho gaye**: sab rotate (DB password, API keys, mail, `APP_KEY` yani sessions invalid, F91 ka khayal), access logs mein dekhna kisne `.env` ya debug page dekha, aur users ko batana jahan zaroori. Prevention: deploy checklist, CI mein check, aur production mein hamesha `APP_DEBUG=false`.

**F147. The Telescope or Horizon dashboard is publicly accessible in production. Why is that serious?** Answer: Telescope requests, queries, exceptions aur bahut sa sensitive data dikhata hai; Horizon jobs ka payload. Laravel mein ye dashboards ek **gate** ke peeche hain (`viewTelescope`, `viewHorizon`) aur agar gate ghalat ya khula chhoda to koi bhi dekh sakta hai. Fix: gate mein sirf authorized emails ya roles, production mein Telescope band ya mehdood, aur sensitive data ko mask (`hideRequestParameters`). Check ke liye ek test jo bina login us URL par 403 mange.

**F148. You see a spike of failed logins from many IPs (credential stuffing). What do you do?** Answer: Detection: failed-login rate ka alert. Response: rate limiting per account aur per IP (`RateLimiter`), temporary lockout, CAPTCHA ya MFA, aur compromised passwords ki check. Sab ko ek saath block karne se bachna (LB ke peeche IP trusted proxies se asli ho). Mutasir accounts ko password reset aur notification. Login ke error messages ek jaise ("email ya password ghalat"), taake accounts ki fehrist na nikle.

**F149. A user changed an ID in the URL and saw another person's record (IDOR). What now?** Answer: Foran fix: har jagah ownership ya policy check (`$this->authorize()`), aur sahi query scope (division ya user ke scope mein). Phir scope maloom karna: access logs se dekhna kis ne kitna dekha, mutasir logon ko batana (agar personal data), aur is tarah ke endpoints par automated test (user A ka token user B ki ID par 403). Prevention: global scopes aur policies by default, aur code review checklist.

**F150. A Sanctum or API token leaked. How do you respond?** Answer: Us token ko foran revoke (`$token->delete()`), us user ke saare tokens revoke karna agar zaroorat ho, aur access logs se dekhna us token se kya hua. Tokens hashed store hon, expiry chhoti, scopes (abilities) mehdood, aur "saare devices se logout" ka option. Aur leak ka source (logs mein token, URL mein token, public repo) band karna.

**F151. A security advisory is published for a package you use. What is your process?** Answer: `composer audit` se confirm kitna asar (kaun sa version, kya hum us feature ko use karte hain), patch version par update chhote step mein, tests chalana, staging par check, phir release. Agar patch nahi to workaround ya feature band. CI mein `composer audit` roz, taake pata pehle chale. Update ek planned release ki tarah, panic mein `composer update` nahi.

## I. CI, dependencies aur testing ke failure modes

**F152. Someone runs `composer update` on the production server and the app breaks. How do you prevent this?** Answer: Production par sirf `composer install --no-dev --optimize-autoloader` jo `composer.lock` ke exact versions lagata hai. `composer.lock` commit hota hai, aur dependency updates CI mein, test ho kar, ek alag pull request mein. Build ek artifact ya image ban kar deploy ho, server par install nahi (taake production par network ya package registry ka masla na ho).

**F153. The code works locally but fails in production because of a PHP version or missing extension. How do you stop that?** Answer: Environments ek jaise: wohi Docker image ya DDEV config, `composer.json` mein `require.php` aur `ext-*` requirements (composer install hi fail kar de), CI mein production wale PHP version par tests (aur zaroorat par matrix), aur deploy ke baad smoke test. "Mere machine par chalta hai" ka ilaaj ek jaisa environment hai.

**F154. Tests pass on SQLite but production on MySQL behaves differently. Why, and what do you do?** Answer: SQLite aur MySQL mein farq hai: case sensitivity, JSON functions, strict mode, foreign key behavior, date functions, locking. Isliye CI mein **wohi database engine** (MySQL service container), aur critical queries (reports, locking) ke tests MySQL par. SQLite sirf tez unit tests ke liye, jahan DB behavior ahem nahi.

**F155. All tests pass with mocks, but the real payment or SMS provider fails in production. Why?** Answer: Mocks wohi dikhate hain jo hum ne socha tha, provider ka asal format ya behavior nahi. Fix: contract tests ya recorded real responses (fixtures), sandbox environment ke saath chhote integration ya smoke tests, adapter par response validation, aur production mein error rate alerts. Mock tests logic ke liye, integration ka bharosa sandbox se.

**F156. The main branch is broken and nobody can deploy. What is your process?** Answer: Pehle **revert** (jis commit ne toda use wapas), phir fix aaram se. Prevention: branch protection (CI pass hone par hi merge), required reviews, small pull requests, aur main hamesha deployable. Agar CI flaky ho to use theek karna, ignore nahi (Q226 main guide mein).

**F157. A missing environment variable is only discovered at runtime when a user hits that code path. How do you catch it earlier?** Answer: Boot par validation: zaroori env keys ki list aur app start ya deploy ke time check (ek chhota artisan command ya service provider), `config` mein sahi defaults, `.env.example` ko hamesha update, aur deploy ke baad smoke test jo critical flows chalaye. Secrets ke liye secrets manager ya CI se inject.

**F158. A package you depend on is abandoned. What do you do?** Answer: Risk ka andaza (kitna andar tak use hota hai, security records), alternative ya fork ya khud likhna (agar chhota), us ke aas paas adapter taake badalna aasan ho, aur tab tak version pin aur `composer audit` par nazar. Naye package chunne se pehle: aakhri release, open issues, maintainers, Laravel aur PHP versions ka support.

## J. Mobile aur API client ke failure modes

**F159. After an API change, old mobile app versions crash. How do you manage that?** Answer: Users purani app versions par mahino rehte hain. Isliye API versioning (`/api/v1`), purane versions ko notice period tak support, additive changes (naye optional fields), minimum supported version ka check aur "update required" ka saaf jawab (jaise 426 ya custom code), aur contract tests. Breaking change ek hi baar mein nahi.

**F160. The client times out before the server finishes, then retries. What happens?** Answer: Server abhi kaam kar raha hai aur client dobara request bhej deta hai: duplicate kaam. Fix: server operations idempotent (idempotency key), lambe kaam ko async pattern (`202 Accepted` aur `GET /status/{id}`), client timeout aur server kaam ka waqt align, aur retry sirf idempotent calls par.

**F161. A large upload from a mobile phone is interrupted on a poor network. What is the better design?** Answer: Chunked ya resumable upload (jaise tus protocol ya multipart upload), har chunk ka checksum, server par progress ka record taake client wahin se jari rakhe, aur direct-to-storage presigned URLs. Adhi uploads ka cleanup job. Isse FPM workers bhi lambe uploads se bachte hain.

**F162. A user scrolls a list while new data keeps arriving, and sees duplicates or skipped items. Why?** Answer: Offset pagination: naye rows aane se page ki hudood khisakti hain. Fix: **cursor (keyset) pagination** (`WHERE id < last_id ORDER BY id DESC`; Laravel mein `cursorPaginate()`), jo data badalne par bhi stable rehti hai. Aur client duplicates ko ID se hata de.

# Symptom se pehle ke checks (cheat table)

| Symptom | Pehle kya check karein |
| --- | --- |
| 502 Bad Gateway | FPM chal raha hai? socket path aur permissions, FPM log (crash, signal 9), listen backlog, abhi deploy hua? |
| 504 Gateway Timeout | slowlog, slow query, bahar ki API, `max_children` warning, timeouts ka silsila |
| 500 Server Error | `storage/logs/laravel.log` aur Sentry, `storage` permissions, missing env, stale `config:cache`, DB aur Redis up? |
| 419 Page Expired | session lifetime, cookie settings aur trusted proxies, multiple tabs, session driver |
| 429 Too Many Requests | rate limiter ki key, LB ke peeche sab ka ek IP, retry loop wala client |
| 413 Request Entity Too Large | `client_max_body_size`, `upload_max_filesize`, `post_max_size` |
| "Too many connections" | `max_connections` vs FPM aur queue workers, lambi requests, connection leak |
| "MySQL server has gone away" | `wait_timeout`, `max_allowed_packet`, server restart, lambe idle worker |
| Queue process nahi ho rahi | worker aur Horizon chal rahe hain? maintenance mode, Redis up, failed jobs, `retry_after` |
| High CPU | `top`, `SHOW PROCESSLIST`, slow query log, runaway loop, bot traffic, cache stampede |
| High memory | FPM `max_children`, leak, bade collections, OOM killer (`dmesg`) |
| Disk full | logs, binlogs, uploads, Docker images, `df -h` aur `df -i` |
| Random logouts | session driver (Redis) down, `APP_KEY` badli, sticky sessions, cookie domain |
| Emails nahi ja rahi | queue, SMTP credentials, failover mailer, SPF, DKIM, bounces |
| Scheduler nahi chal raha | cron entry, `php artisan schedule:list`, atka hua overlap lock, `onOneServer` ka cache |
| Purana code chal raha hai | OPcache aur FPM reload, queue workers restart, CDN ya browser cache |

# Commands cheat sheet

```bash
# Nginx / PHP-FPM / Linux
nginx -t && systemctl reload nginx          # config check phir reload
systemctl status php8.3-fpm ; journalctl -u php8.3-fpm --since "30 min ago"
tail -f /var/log/nginx/error.log
ss -tulpn                                   # kaun sa port kaun sunn raha hai
df -h ; df -i ; free -m ; top
dmesg | grep -i -E "killed process|out of memory"

# Laravel
tail -f storage/logs/laravel.log
php artisan about ; php artisan schedule:list
php artisan queue:failed ; php artisan queue:retry all ; php artisan horizon:status
php artisan config:clear ; php artisan optimize:clear

# MySQL
SHOW FULL PROCESSLIST;
SHOW ENGINE INNODB STATUS\G
SHOW REPLICA STATUS\G
SELECT * FROM information_schema.innodb_trx\G   -- lambi transactions

# Redis
redis-cli INFO memory ; redis-cli INFO clients
redis-cli SLOWLOG GET 10 ; redis-cli --bigkeys

# Docker
docker ps -a ; docker logs --tail 100 <name> ; docker stats
docker inspect --format '{{.State.OOMKilled}} {{.State.ExitCode}}' <name>
docker system df

# Network / TLS
curl -v https://host ; openssl s_client -connect host:443 -showcerts
```

# In sawalon ko level ke hisaab se kaise parhein

| Level | Pehle yeh |
| --- | --- |
| 3 saal (mid) | F2, F3, F5, F7, F12, F16, F21, F23, F29, F31, F34, F35, F77, F78, F91, F92, F93, F94, F132, F152 |
| 4 saal (aap ka target) | upar ke sab plus F1, F8, F13, F15, F28, F33, F39, F40, F42, F46, F48, F51, F53, F54, F56, F59, F67, F68, F79, F81, F95, F96, F106, F109, F117, F122, F140, F141 |
| Senior (5+) | F20, F25, F41, F52, F62, F65, F66, F70, F71, F100, F105, F114, F120, F125, F127, F143, F147, F149 aur apni asli kahaniyan |

**Aakhri mashwara:** in sawalon ko yaad nahi, **samjha** jata hai. Har technology ke liye (Nginx, FPM, MySQL, Redis, queues, Docker) khud se poochein: "yeh kab fail hota hai, mujhe kaise pata chalega, aur main kya karunga?" Ek jawab ko apni asli project ke example (HOLOIN) se jodein, aur interview mein pehle state, phir detect, phir recover, phir prevent bolein.
