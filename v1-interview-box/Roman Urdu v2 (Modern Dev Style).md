# Interview Prep: Roman Urdu v2 (Modern Developer Style)

Yeh PITB / Pakistan Railways ITOPS guide ka dobara likha hua Roman Urdu version hai, us style mein jis mein Pakistani developers asal mein baat karte hain: Urdu ka dhancha aur English tech words. Question numbers English guide ke barabar hain (Q1 se Q249). "Aapki story" wale answers apni asli kahani se match karein, aur program ki details (phase status, stations) interview se pehle verify kar lein.

## Is version mein style kaisa hai

- **Tech words English mein hi:** production, staging, deploy, rollback, bottleneck, root cause, trade-off, edge case, scale, latency, retry, timeout, fallback, cache, queue, worker, index, query, transaction, lock, migration, endpoint, token, audit log. Inka Urdu tarjuma nahi kiya, kyunke interview mein aap yehi bolenge.
- **Verbs ka pattern:** English word + karna, lagana, chalana. Jaise "deploy karta hoon", "index laga deta hoon", "worker chala deta hoon".
- **Chhote, bole jaane wale jumle:** "Main sab se pehle check karta hoon...", "Simple si baat hai...", "Trade-off yeh hai...".
- **Structure:** pehle masla, phir wajah, phir fix, phir apni example. Yeh pattern lagbhag har answer par chalta hai.
- Practice ke liye Roman Urdu mein samjhein, lekin final answer interview mein English mein bolne ki practice karein.

## 0. Yeh role asal mein kya test kar raha hai

1. **Delivery owner:** targets aur deadlines poore karna, 3 saal ke program mein, bahut se stakeholders ke saath.
2. **Quality owner:** aisa system jise hazaron staff aur lakhon passengers use karte hain, usay bugs se door rakhna.
3. **Operations mindset:** title mein IT Operations hai, to uptime, monitoring, support aur incidents par sawal aayenge, sirf coding par nahi.
4. **Government context:** audit trail, sensitive data (CNIC, police records), role-based access, long-term maintenance, aur vendors ya departments par dependency.

**Opening line:** "Maine high-volume, multi-tenant platforms banaye hain jin mein queues, caching aur live dashboards thay. Reliability, security aur delivery tracking ka wohi discipline is program ko chahiye."

## A. Role, delivery aur HR questions

**Q1. Aap Pakistan Railways ki digital transformation par kyun kaam karna chahte hain?** Answer: Yeh bahut bara public system hai jis ka real impact hai: ticketing, tracking, safety, transparency. Mujhe lambe programs pasand hain jahan sirf quick demo nahi, quality matter karti hai. Aur team lead ke taur par main delivery lead kar chuka hoon.

**Q2. Yeh 3 saal ka contract hai. Hum kaise maanein ke aap tikenge aur motivated rahenge?** Answer: 3 saal ka program mujhe cheezein properly build karne aur production mein chalte dekhne ka moqa deta hai. Mujhe system ko poore cycle mein own karna pasand hai: build, release, support, improve.

**Q3. Developer role mein "IT Operations" ka matlab kya hai?** Answer: Aisa code likhna jise run karna aasan ho: proper logs, health checks, alerts, safe deployments, runbooks aur fast incident response. Jab tak support team feature ko operate na kar sake, tab tak feature done nahi hai.

**Q4. Aap kaise ensure karenge ke development targets poore hon?** Answer: Main program ko modules mein todta hoon, har module ka owner, milestones aur clear "done" criteria. Progress weekly track karta hoon, demos jaldi dikhata hoon, aur risk jis din nazar aaye usi din raise karta hoon. Waqt kam ho to scope cut karta hoon, quality nahi. *Cross-question: Agar target unrealistic ho?* Answer: Main numbers dikhata hoon (tasks, effort, risks) aur options deta hoon: scope kam karein, log barhayen, ya date aage karein. Jo deliver nahi kar sakta, uska wada nahi karta.

**Q5. Aap software ko bug-free kaise rakhte hain?** Answer: Koi software 100 percent bug-free nahi hota, isliye main process banata hoon: code review, critical paths par automated tests, CI checks, staging, safe release, aur release ke baad monitoring. Goal yeh hai ke serious bugs users tak na pohnchein, aur chhote bugs jaldi fix hon.

**Q6. Senior officer testing complete hone se pehle release ka pressure daalein to kya karenge?** Answer: Main risk simple words mein batata hoon: kya toot sakta hai, kis par asar padega. Phir safe option deta hoon: tested core abhi release karein, baqi hold par. Decision aur risk dono email ya document mein likh deta hoon.

**Q7. Kya aap ne government ya large organizations ke saath kaam kiya hai?** Answer: Directly government ke saath nahi. Mera kaam large multi-tenant platforms par raha hai jahan reliability, access control aur audit critical thay. Domain rules main business team ke saath baith kar jaldi seekh leta hoon.

**Q8. Koi project batayen jo aap ne end to end lead kiya (aapki story).** Answer: HOLOIN. Multi-tenant IoT platform: high-volume device data, queues, Docker aur AI service layer. Maine modules plan kiye, code review kiya, slow queries fix ki (10 se 20 minute ki queries indexes, DB-side processing aur latest-value caching se usable hui), aur production issues handle kiye.

**Q9. Alag alag skill levels wali team ko kaise manage karte hain?** Answer: Juniors ko chhote, clear tasks examples ke saath deta hoon, shuru ke tasks par pair karta hoon, aur feedback specific aur polite rakhta hoon. Seniors ko ek module ki ownership deta hoon. Shared checklist rakhta hoon taake sab ki quality ek jaisi ho.

**Q10. PITB teams aur Railways officers (jo technical nahi) ke saath kaise kaam karte hain?** Answer: Simple language, written requirements, change log, aur har sprint chhote demos. Trade-offs ko time, cost aur risk mein explain karta hoon, technical jargon mein nahi.

**Q11. Development lagbhag khatam ho aur requirement change ho jaye to?** Answer: Change likhta hoon, uska impact estimate karta hoon, aur owner se kehta hoon ke choose karein: time barhayen, kuch aur hataein, ya next release mein rakhein. Silently absorb nahi karta.

**Q12. Production mein apni ghalti aur us ke baad kya change hua (aapki story).** Answer: Real example lein: kya toota, kitni jaldi pata chala, sab se pehle kya kiya (damage roka), root cause kya tha, aur kaunsi prevention lagayi (test, check, review rule).

## B. PHP fundamentals

**Q13. Production mein PHP request kaise chalti hai?** Answer: Nginx request PHP-FPM ko pass karta hai, ek worker script run karta hai, response wapas jata hai aur request ki memory clear ho jati hai. State process ke bahar rehni chahiye: sessions Redis mein, data database mein. *Cross-question: Scale ke liye yeh kyun achha hai?* Answer: Har request independent hai, to main workers ya servers aasani se barha sakta hoon. Bas sessions, cache aur uploads shared hone chahiye (Redis, object storage).

**Q14. OPcache kya hai, aur production PHP mein aur kya tune karte hain?** Answer: OPcache compiled scripts memory mein rakhta hai, to har request par dobara compile nahi hota. Saath mein PHP-FPM workers memory ke hisaab se tune karta hoon, timeouts set karta hoon, display\_errors off, aur optimized Composer autoloader.

**Q15. Aap PHP 8.x ke kaun se features use karte hain?** Answer: Typed properties, enums, match, readonly properties, constructor promotion, named arguments, nullsafe operator, attributes. Code clear hota hai aur mistakes jaldi pakri jati hain.

**Q16. Bahut bari file ya export bina memory khatam kiye kaise process karte hain?** Answer: Stream karta hoon: generators ya Laravel cursor/lazy/chunk, output saath saath likhta hoon, aur kaam queued job mein chalata hoon, web request mein nahi.

**Q17. PHP/Laravel mein errors aur logging kaise handle karte hain?** Answer: Expected failures ke liye exceptions, baqi ke liye global handler, structured logs jis mein request ID aur user ID ho, aur users ko raw errors kabhi nahi dikhata.

**Q18. Dependency injection kya hai, aur lambe program mein kyun important hai?** Answer: Class jo cheez chahiye wo bahar se leti hai, khud create nahi karti. Is se code testable hota hai (fake inject kar do), aur payment, SMS ya GPS provider business logic touch kiye baghair swap ho sakta hai.

**Q19. Interface vs abstract class vs trait?** Answer: Interface ek contract hai. Abstract class shared base hai jis mein kuch code ho. Trait reusable code hai jo classes mein mix hota hai. Main `NotificationChannel` ya `PaymentGateway` jaisi cheezon ke liye interface use karta hoon.

**Q20. PSR standards kya hain, aur bari team ko kyun chahiye?** Answer: PSR-4 autoloading, PSR-12 code style, PSR-3 logging. Isse bahut developers aur vendors ke beech code consistent rehta hai. Style main CI mein Pint se automatically enforce karta hoon.

## C. Laravel

**Q21. Laravel request lifecycle samjhayen.** Answer: `public/index.php` app boot karta hai, middleware chalti hai, router route dhoondta hai, controller chalta hai, aur response middleware se wapas jata hai. Service providers pehle services register aur boot karte hain.

**Q22. 3 saal ke program ke liye bari Laravel app ki structure kaisi rakhenge?** Answer: Modular structure: Ticketing, Tracking, Inspection, Attendance, Reporting jaise modules, har ek ke apne routes, services, policies aur tests. Business logic service ya action classes mein, controllers mein nahi.

**Q23. N+1 problem kya hai, aur kaise pakadte hain?** Answer: List ke liye ek query aur har row ke relation ke liye ek aur query. Fix: eager loading `with()`, `withCount()`, aur sirf zaroori columns select karna. Debugbar, Telescope ya query logs se pakadta hoon, aur query count barhne par test fail bhi karwa sakta hoon.

**Q24. Queues: background jobs ko safe kaise banate hain?** Answer: Backoff ke saath retries, timeouts, failed-jobs table, aur **idempotent** jobs, taake job do baar chalne se SMS do baar ya charge do baar na ho. Monitoring ke liye Redis ke saath Horizon. *Cross-question: Deploy ke baad workers purana code chala rahe hain, kyun?* Answer: Workers long-running hote hain, memory mein purana code rehta hai. Har deploy par `queue:restart` (ya Horizon restart) chalana hai.

**Q25. Is program mein scheduler kaise use karenge?** Answer: Expired seat holds release karna, daily summary tables banana, stale GPS devices mark karna, overdue inspections ke reminders, aur payment providers ke saath reconciliation. Har task do baar chale to bhi safe ho, aur apna result log kare.

**Q26. Bari organization mein authentication aur authorization.** Answer: Authentication Sanctum ya OAuth se, admins ke liye MFA. Authorization Policies aur roles/permissions se, division, station ya office ke scope mein. Record ownership hamesha check karni hai taake IDOR na ho.

**Q27. Multi-tenancy ya multi-division data scoping (aapki story).** Answer: HOLOIN mein maine middleware mein tenant resolve kiya aur global scopes lagaye taake har tenant sirf apna data dekhe, phir test kiya ke scope bypass nahi ho sakta. Yahan wohi idea divisions aur stations par apply hoga.

**Q28. Validation aur API design.** Answer: Validation ke liye Form Requests, JSON shape ke liye API Resources, har list par pagination, aur versioned routes (`/api/v1`) taake Rabta jaisi mobile apps API change par break na hon.

**Q29. File uploads (inspection photos, documents) kaise handle karte hain?** Answer: Real file type aur size validate, file ka naam change, object storage mein store, expiring private links se serve, aur thumbnails queue jobs mein.

**Q30. Laravel mein audit logging kaise karte hain?** Answer: Model observers ya auditing package se who, what, when, aur old/new values append-only table mein save karta hoon, aur us table ka access restricted rakhta hoon.

## D. MySQL, indexes aur performance

**Q31. Slow query kaise dhoondte aur fix karte hain?** Answer: Slow query log ya `EXPLAIN`. Dekhta hoon kaun sa index use hua, kitni rows scan hui, filesort ya temporary table to nahi. Fix: sahi (aksar composite) index, kam columns, indexed column par function nahi, aur per-row kaam kam.

**Q32. "Station aur date range se tickets" ke liye indexes design karein.** Answer: Composite index `(station_id, travel_date)`: equality column pehle, range column aakhir mein. Leading-column rule ki wajah se sirf date par filter is index ko use nahi karega.

**Q33. Aakhri seat do log ek saath book na kar saken, kaise?** Answer: Transaction ke andar row lock (`lockForUpdate`) ya conditional update (`UPDATE ... WHERE available > 0`) aur affected rows check, saath mein (train, date, seat) par unique constraint. Final decision database ka hota hai, application code ka nahi.

**Q34. Hazaron locomotives ke GPS pings kaise store karenge?** Answer: Raw pings ko narrow, append-only, time-partitioned table (ya time-series store) mein, device aur time par index, aur har train ka alag "latest position" record. Purana raw data retention policy ke hisaab se archive hota hai. *Cross-question: Alag latest-position record kyun?* Answer: Dashboard ko kabhi history scan nahi karni chahiye. Latest record har train ki sirf ek row hai, to hamesha fast. (Aapka HOLOIN latest-packet approach.)

**Q35. 10 crore rows wali table par pagination kaise karein?** Answer: Keyset pagination: `WHERE id > last_id ORDER BY id LIMIT 50`. Bade OFFSET slow hote hain kyunke MySQL ko skip ki hui rows bhi walk karni parti hain.

**Q36. Bari live table ko safely kaise alter karte hain?** Answer: Online schema change tool (gh-ost, pt-online-schema-change), ya pehle nullable column add, phir batches mein backfill, phir constraints. Production-size data par test, aur backup plus rollback plan ready.

**Q37. Transactions, isolation levels aur deadlocks.** Answer: Transaction kai writes ko ek unit bana deti hai: sab success ya sab fail. MySQL ka default REPEATABLE READ hai. Deadlock tab hota hai jab do transactions ek doosre ke locks ka wait karti hain. Isliye transactions short rakho, locks ek hi order mein lo, aur deadlock par retry.

**Q38. Government database ka backup aur recovery.** Answer: Daily full backup plus point-in-time recovery ke liye binary logs, off-server copies, aur schedule par **tested restores**. Jis backup ka restore kabhi test nahi hua, wo backup nahi hai. RPO aur RTO business ke saath tay karta hoon.

**Q39. Read replicas: kab use karein, aur kya dhyan rakhein?** Answer: Heavy reports ke liye, taake live booking fast rahe. Replication lag monitor karni hai: lag wali replica se "abhi book hua" data read nahi karna.

## E. BI, reporting aur data

**Q40. Is program mein kaun si reports expected hain?** Answer: Station aur din ke hisaab se ticket sales aur revenue, passenger counts, train delays aur punctuality, har trip ka fuel use, attendance, inspection findings aur overdue fixes, helpline call volume, complaint resolution time.

**Q41. Live system ko slow kiye baghair reports kaise banate hain?** Answer: Simple se shuru karta hoon: scheduled jobs se update hone wali summary tables. Phir read replica. Phir ETL se fill hone wala alag reporting database. Jo sab se simple option need poori kare, wohi chunta hoon.

**Q42. ETL samjhayen aur use reliable kaise banate hain.** Answer: Extract, Transform, Load. Jobs ko repeatable banata hoon (do baar chalane se result wohi), row counts log karta hoon, late data handle karta hoon, aur failure par alert lagata hoon.

**Q43. Ticket sales ke liye fact aur dimension tables.** Answer: Fact table mein har ticket ki ek row (amount, time, station id, train id). Dimensions: station, train, date, passenger type. Reports fact table ko chand dimensions se join karti hain.

**Q44. 3 saal ki revenue report 90 second leti hai. Fix karein.** Answer: Pehle `EXPLAIN`, phir `(station_id, date)` par index, PHP mein calculations band, daily summary table (har station har din ki ek row), aur result cache. Karoron rows hazaron mein badal jati hain.

**Q45. Do dashboards ke totals different hain. Kaise investigate karenge?** Answer: Filters, time zones (UTC vs Pakistan time), cancelled aur refunded records, aur source table compare karta hoon. Raw data se reconcile karta hoon aur har metric ki ek hi definition fix karta hoon.

**Q46. Aap ne kaun se BI tools use kiye hain?** Answer: Honest answer: "Maine data side banayi hai: aggregation, summaries, exports, APIs. BI tool meri main job nahi rahi, lekin Metabase ya Power BI clean reporting database par chalte hain, to main wo layer ready kar sakta hoon aur tool jaldi seekh loonga."

**Q47. Decision makers ke liye report data par trust kaise build karte hain?** Answer: Har metric ki ek definition, raw data se reconciliation checks, input par data validation, aur har dashboard par "last updated" time.

## F. Design patterns aur principles

**Q48. Laravel mein aap kaun se patterns use karte hain, aur kyun?** Answer: Business logic ke liye Service/Action classes, Repository sirf complex ya reused queries ke liye, swap hone wale providers (SMS, payment, GPS vendor) ke liye Strategy, model events ke liye Observer, objects aur test data ke liye Factory, aur middleware-style steps ke liye Pipeline.

**Q49. Is program se Strategy pattern ki example.** Answer: `NotificationChannel` interface jis mein `send()` ho. Classes: `SmsChannel`, `EmailChannel`, `PushChannel`. WhatsApp add karna ho to bas ek nayi class, purana code touch nahi hota.

**Q50. Inspection ya booking ke liye State pattern.** Answer: Booking states se guzarti hai: pending, held, paid, confirmed, cancelled. Inspection: raised, assigned, fixed, verified, closed. Har state sirf kuch next states allow karti hai, to invalid jump possible hi nahi.

**Q51. Bahar ke systems ke liye Adapter pattern.** Answer: Har external system (payment provider, SMS gateway, GPS vendor, NADRA) ko apni interface ke peeche wrap karta hoon. Vendor format change kare to sirf adapter badalta hai.

**Q52. SOLID ek ek line mein.** Answer: Ek class ka ek kaam. Naya feature code add karke aaye, purana edit karke nahi. Child class wahan chale jahan parent chalta hai. Chhoti, focused interfaces. Concrete classes par nahi, interfaces par depend karo.

**Q53. Kya Repository pattern hamesha zaroori hai?** Answer: Nahi. Simple cases mein Eloquent khud repository ki tarah kaam karta hai. Main Repository tab add karta hoon jab queries complex ya reused hon, ya data source swap hone ka chance ho. Bina zaroorat extra layers over-engineering hain.

**Q54. CQRS ya event-driven design kab use karenge?** Answer: Jab reads aur writes ki needs bahut alag hon, jaise live booking writes aur heavy reporting reads. Complexity barhti hai, to sirf tab jab need clear ho. Event handlers idempotent hon aur tracing ke liye correlation IDs lagayen.

## G. Is program ke liye System design

Bolne ka flow: users aur traffic clarify karo, main flows likho, data model, components, bottlenecks, security aur failure, monitoring aur growth.

**Q55. Tamam locomotives ke liye real-time train tracking design karein.** Answer: GPS devices ingestion API ko pings bhejte hain. API validate karke queue mein daal deti hai. Workers raw history save karte hain aur Redis mein latest-position record update karte hain. Control-room dashboard latest record read karta hai, aur live updates WebSockets ya polling se aate hain. Data purana ho jaye to threshold ke baad "stale" label lagta hai. *Cross-question: Hazaron pings per second aayein to pehle kya tootega?* Answer: Database writes. Main batch inserts karta hoon, queue se spikes smooth karta hoon, aur history ko time se partition karta hoon. *Cross-question: Devices duplicate ya out-of-order pings bhejte hain.* Answer: Device id plus timestamp ko unique key banata hoon, live view mein latest se purani ping ignore karta hoon, lekin history mein sab rakhta hoon.

**Q56. Online ticket booking flow design karein.** Answer: Search (cached), transaction mein takreeban 10 minute ki seat hold, payment, confirmation, aur ticket PDF aur SMS queue jobs mein. Scheduled job expired holds release karti hai. Peak (Eid rush) mein waiting room booking path ko protect karta hai. *Cross-question: Payment ho gayi lekin callback nahi aaya.* Answer: Booking ko pending rakhta hoon, reconciliation job provider se real status poochti hai, phir confirm ya release. Callbacks signature-checked aur idempotent hone chahiye.

**Q57. Real-time fuel monitoring system design karein.** Answer: Sensor readings usi ingestion queue se guzarti hain. Raw readings cheaply store, per-trip aur daily summaries, aur suspicious drop par alert (bina stop ke girawat, ya sensor fault). Reports aur dashboards summaries read karte hain.

**Q58. Control room dashboard (headquarters aur divisions) design karein.** Answer: Latest-position store se trains ka live map aur table (position, speed, delay, fuel), division filters, stale ya off-route trains ka alerts panel, aur role-based views: har division apna hissa dekhe, headquarters sab.

**Q59. Bahut stations ke staff ke liye attendance management system design karein.** Answer: Device ya app se time aur location ke saath check-in, offline capture aur baad mein sync, shift aur leave rules, manual correction sirf reason aur approval ke saath, full audit trail, aur office-wise reports. Supervisors sirf apna staff dekhte hain.

**Q60. e-inspection system design karein.** Answer: Mobile forms checklists ke saath, time aur location wali photos, offline mode, workflow (raised, assigned, fixed, verified, closed), deadlines aur escalation, aur repeat ya overdue issues ke dashboards. Evidence tamper-resistant hona chahiye.

**Q61. Police station record aur complaint system (PSRMS/CMS) design karein.** Answer: Role aur station ke hisaab se strict access, sensitive data par field-level encryption, har view aur edit ka audit, retention rules, production ke bahar real data nahi, aur integrity controls taake records silently modify na ho sakein.

**Q62. Helpline 117 ka support tooling design karein.** Answer: Agents ke liye ticketing view: passenger history, categories aur status, booking aur train status ke links, escalation ke saath SLAs, aur volume aur resolution time ki reports. Staff sirf wohi dekhe jo uske kaam ke liye zaroori ho.

**Q63. Smart stations: passenger info displays aur Wi-Fi.** Answer: Central schedule service light API ya WebSockets se displays ko updates push karti hai. Displays last good data cache rakhte hain aur link toote to offline notice dikhate hain. Wi-Fi sign-in aur usage data minimal aur privacy-aware rakhta hoon.

**Q64. Rabta app ko backend se kaise integrate karenge?** Answer: Versioned REST APIs, token authentication, rate limits, pagination, train status ke liye caching, aur backward compatibility taake purane app versions chalte rahein. Updates ke liye notification service.

**Q65. Stations par weak connectivity mein chalne wala backbone kaise design karenge?** Answer: Assume karta hoon ke link toot sakta hai: local caching, backoff ke saath retry, jahan possible ho edge par queues, clear offline states, aur connection wapas aane par conflict rules ke saath sync.

**Q66. Yahan monolith ya microservices?** Answer: Pehle modular monolith: clear modules, ek deployable app, kyunke team ke liye test aur run karna aasan hai. Tracking ingestion ya notifications jaise modules ko tab alag karta hoon jab un ki scale ya team ki need alag ho.

**Q67. National system ke liye high availability aur disaster recovery.** Answer: Load balancer ke peeche ek se zyada app servers, tested failover ke saath database replication, tested restores ke saath backups, health checks, monitoring, aur business ke saath tay RTO aur RPO wala documented disaster plan.

## H. Web fundamentals aur integration

**Q68. Passenger Rabta app kholta hai aur train search karta hai to kya hota hai?** Answer: App HTTPS request bhejti hai, DNS aur TLS hote hain, load balancer web server ko route karta hai, PHP-FPM Laravel chalata hai, API pehle cache phir database check karti hai, JSON wapas aata hai, aur app render kar deti hai.

**Q69. HTTP methods, idempotency aur status codes.** Answer: GET read, POST create, PUT replace, PATCH partial update, DELETE remove. GET, PUT, DELETE idempotent hain. Codes: 200, 201, 400, 401 (login nahi), 403 (permission nahi), 404, 409, 422, 429, 500, 503.

**Q70. Live train status ke liye REST vs WebSockets vs polling.** Answer: General lookups ke liye caching ke saath REST, live control-room views ke liye WebSockets, aur weak networks ke liye simple short polling fallback.

**Q71. Bahar ke systems (payment, SMS, NADRA, banks) se integrate kaise karte hain?** Answer: Versioned APIs, timeouts, backoff ke saath retries, idempotency keys, signature-checked webhooks, adapter layer, aur har exchange ka log. Main maan kar chalta hoon ke doosri taraf ka system slow ya down ho sakta hai.

**Q72. CORS, cookies, sessions aur tokens.** Answer: CORS browser ka rule hai, authentication nahi. Session server par data rakhta hai aur cookie mein sirf session ID hoti hai. Tokens mobile apps aur APIs ke liye suit karte hain; short expiry plus refresh tokens use karta hoon.

**Q73. Time zones aur languages (English/Urdu).** Answer: Storage UTC mein, display Asia/Karachi mein, Laravel localization, Urdu ke liye right-to-left layout, aur har jagah `utf8mb4`.

## I. QA, testing aur CI/CD (is JD ka dil)

**Q74. Is program ke liye aap ki QA strategy kya hai?** Answer: Test pyramid: business rules ke liye bahut saare unit tests, kuch feature tests (routes, database, queues), aur key journeys (search, book, pay, cancel; inspect, fix, verify) ke liye thode end-to-end tests. Saath mein bade releases se pehle manual testing aur Railways staff ke saath UAT round. *Honest note:* "Main critical flows test karta hoon aur code review karta hoon, aur automated PHPUnit/Pest coverage strong kar raha hoon. Is program mein paise, booking aur permission logic ke liye tests mandatory rakhunga."

**Q75. Waqt kam ho to pehle kya test karte hain?** Answer: Payments, seat availability, refunds, permissions aur data exports, kyunke yahan failure ki cost sab se zyada hoti hai.

**Q76. Payment, SMS ya GPS systems call karne wala code kaise test karte hain?** Answer: Fakes aur mocks (`Http::fake()`, `Queue::fake()`, `Mail::fake()`), aur chand real integration checks ke liye sandbox environment. Tests kabhi real paise ya real passengers ko touch nahi karte.

**Q77. Aap ki CI pipeline kya kya chalati hai?** Answer: Dependencies install, Pint (style), PHPStan/Larastan (static analysis), automated tests, aur `composer audit`. Code tab hi merge hota hai jab sab pass ho.

**Q78. Safe release aur rollback bayan karein.** Answer: Build ek baar, staging par deploy, smoke test, quiet window mein production deploy, migrations safely, errors aur metrics watch, aur rollback ready. Database changes expand-then-contract pattern se.

**Q79. Government stakeholders ke saath UAT kaise karte hain?** Answer: Simple language mein test scenarios ready, real users ke saath staging par masked data par run, issues record, fix aur retest, aur go-live se pehle written sign-off.

**Q80. Management ko quality ki tracking aur reporting kaise dete hain?** Answer: Severity ke hisaab se bug counts, escaped defects (production mein mile), test pass rate, critical modules par coverage, mean time to fix, release failure rate. Metrics improvement ke liye hain, logon ko blame karne ke liye nahi.

**Q81. Severity vs priority.** Answer: Severity impact hai (booking na ho paye to critical). Priority yeh hai ke kitni jaldi fix karna hai. Home page ka typo low severity hai, lekin launch se pehle high priority ho sakta hai.

**Q82. Achha code review kaisa hota hai?** Answer: Requirement poori ho, code readable ho, secure ho, tests hon, N+1 ya heavy queries na hon, error handling ho, migrations safe hon. Small pull requests, specific aur polite comments, aur checklist.

## J. Docker, environments aur operations

**Q83. Multi-vendor program ke liye Docker kya problem solve karta hai?** Answer: Sab ek jaisa environment chalate hain, to "mere machine par to chal raha hai" wali problem khatam. Naye developers aur vendor teams jaldi start karte hain, aur staging production jaisa hota hai.

**Q84. Containers mein typical Laravel stack.** Answer: Nginx, PHP-FPM, MySQL, Redis, queue worker ya Horizon, scheduler, aur local mein Mailpit. Docker Compose inhein service name se connect karta hai.

**Q85. Container baar baar restart ho raha hai. Debug kaise karenge?** Answer: `docker ps -a`, `docker logs`, exit code dekhta hoon. Phir missing environment variables, wrong database host, permissions, port conflict, aur yeh ke database ready tha ya nahi.

**Q86. Docker vs Kubernetes, honestly.** Answer: Docker aur Compose meri hands-on strength hain. Kubernetes concept level par jaanta hoon (scaling, self-healing, rolling updates), aur program ko jaise need ho seekh loonga.

**Q87. Dev, staging aur production kaise alag rakhte hain?** Answer: Versions same, secrets aur databases alag, production ke bahar masked data, aur dev mein real personal data nahi. Config environment variables ya vault se aati hai.

**Q88. Kaun si monitoring aur alerts lagate hain?** Answer: Application errors, response time, queue length, failed jobs, database load aur slow queries, disk space, aur "data aana band ho gaya" alerts (jaise GPS pings nahi aa rahe). Alert un cheezon par jo users feel karein, sirf CPU par nahi.

**Q89. Runbook kya hai?** Answer: Known problem (queue stuck, database full, GPS feed down) ke liye short step-by-step guide, taake koi bhi on-call banda action le sake. Har real incident ke baad ek runbook likhta hoon.

**Q90. On-call aur incident response kaise handle karte hain?** Answer: Acknowledge, impact assess, damage roko (rollback, feature off), status communicate, root cause fix, aur short report: kya hua, kyun hua, kya change kiya.

## K. Security

**Q91. OWASP Top 10: main risks aur fixes.** Answer: Broken access control (policies, ownership checks), injection (bindings), XSS (output escape, CSP), CSRF (tokens), weak authentication (MFA, lockouts), data exposure (TLS, encryption), outdated components (`composer audit`), misconfiguration (debug off), aur weak logging.

**Q92. CNIC, phone numbers aur travel history ki protection kaise karte hain?** Answer: Sirf wohi data lena jo zaroori ho, transit mein TLS, sensitive fields rest par encrypt, logs aur non-production mein mask, role ke hisaab se access, kis ne dekha ya export kiya uska record, aur retention rules.

**Q93. Bari organization mein insider misuse kaise rokte hain?** Answer: Least privilege, role aur region scoping, views aur exports ka audit log, unusual bulk access par alerts, aur regular access reviews. Jo staff chala jaye uska access foran band.

**Q94. Mobile apps aur doosre departments ki APIs secure kaise karte hain?** Answer: Token authentication, har resource par authorization, validation, rate limiting, sirf HTTPS, signed webhooks, aur URLs mein secrets nahi.

**Q95. Secrets management.** Answer: Environment variables ya secrets manager, Git mein kabhi nahi, har environment ki alag keys, staff change ya leak par rotate. Secret commit ho jaye to foran rotate karta hoon.

**Q96. Data breach ka shak ho to kya karenge?** Answer: Contain: keys revoke, access block. Logs preserve karta hoon, scope maloom karta hoon, hole fix karta hoon, security team aur management ko procedure ke hisaab se inform karta hoon, aur lessons learned likhta hoon. Evidence kabhi delete nahi karta.

**Q97. Inspection photos jaise uploads secure kaise karte hain?** Answer: Real file type aur size check, file rename, web root ke bahar store, zaroorat ho to scan, uploads kabhi execute nahi, aur expiring private links se serve.

## L. Performance aur scaling

**Q98. Page slow hai. Kahan se start karenge?** Answer: Pehle measure: network, server time, database, external API ya front end. Browser tools, Debugbar/Telescope, slow query log use karta hoon. Sab se bara bottleneck fix karta hoon, phir dobara measure.

**Q99. Eid ticket booking jaise peak days ki preparation kaise karte hain?** Answer: Real flows par k6 ya JMeter se load test, web servers horizontally scale, read-heavy pages cache, slow kaam queue mein, database connection limits, waiting room, aur booking se pehle non-critical features off.

**Q100. Cache invalidation ke problems.** Answer: Stale data, aur bahut saari requests ka ek saath cache rebuild karna. Main short expiry, change par key clear, versioned keys aur locks use karta hoon. Seat availability ka cache bahut short rakhta hoon aur payment par final database check karta hoon.

**Q101. Database scaling ke steps order mein.** Answer: Pehle queries aur indexes fix, phir cache, phir read replicas, phir purana data archive ya partition, aur sab se aakhir mein sharding. Infrastructure barhane se pehle optimize karo.

## M. Cross-check scenarios (bol kar practice karein)

1. **Control room mein train 30 minute se ek hi jagah dikh rahi hai.** Pehle check karta hoon ke pings band hain (device, network, ingestion queue, worker) ya sirf dashboard stale hai. Stale data ko label karta hoon aur operators ko alert deta hoon.
2. **Attendance mein ek station ka poora staff ek din absent dikh raha hai.** Blame karne se pehle network outage aur delayed sync, time zone ki mistake, ya deployment issue dekhta hoon. Fix, reprocess, aur alert add.
3. **API change ke baad Rabta app crash ho gayi.** Purane app versions support nahi thay. Rollback, API versioning, aur contract tests.
4. **Ek hi SMS ticket teen baar chala gaya.** Job timeout ke baad retry hui. Job ko sent flag ya unique key se idempotent banata hoon.
5. **Booking rush mein payment provider down hai.** Clear message dikhata hoon, seats hold par rakhta hoon, confirmations queue karta hoon, backoff ke saath retry, aur baad mein reconcile.
6. **Fuel report mein impossible consumption aa rahi hai.** Sensor data quality, unit conversion, duplicate readings aur time zones check. Suspicious data ko silently average mein nahi milata, flag karta hoon.
7. **Migration ne live database slow kar diya.** Foran throttle ya stop, online change tool par shift, batches mein run, aur migration review rule.
8. **Vendor ki API bina bataye format change kar deti hai.** Adapter layer, response validation, failure par alerts, aur agreed versioned contracts. (Aapki HOLOIN Python service ki story.)
9. **Senior officer do din mein naya feature maang raha hai.** Dikhata hoon ke kya safely ho sakta hai, kya risky hai, aur scope written mein tay karta hoon.
10. **Junior ne secret Git mein push kar diya.** Rotate, repo se remove, access logs check, aur CI mein secret scanning.
11. **Database disk lagbhag full hai.** Bari tables (shayad GPS history) dhoondta hoon, retention policy se archive, binary logs aur backups check, phir alerts.
12. **Production mein defect pohncha aur manager poochta hai QA se kaise miss hua.** Calm aur factual rehta hoon: cause, fix, prevention (naya test, checklist item, CI check). Process fix karta hoon, kisi insaan ko blame nahi karta.

## N. Team lead aur delivery

**Q102. Bare program mein work ka estimate kaise karte hain?** Answer: Chhote tasks, har ek ki range, testing aur review ka time, pichle similar kaam se comparison, aur unknowns ke liye buffer. Facts badlein to estimate update karta hoon.

**Q103. Sprints kaise run karte hain?** Answer: Acceptance criteria ke saath planning, blockers par short daily check-ins, demo, aur retrospective jis mein ek ya do real improvements tay hon.

**Q104. Aap ki Definition of Done.** Answer: Reviewed, tests pass, koi naya critical warning nahi, jahan zaroori documented, staging par deploy aur acceptance criteria se checked, aur owner ki approval.

**Q105. Doosre departments ya vendors par dependencies kaise manage karte hain?** Answer: Owner aur date ke saath risk list, blockers jaldi escalate, doosri taraf ready hone tak mocks, aur agreements written mein.

**Q106. Badalte staff wale 3 saal ke program ke liye documentation kaise rakhte hain?** Answer: README aur setup guide, API docs (OpenAPI/Postman), chhote decision records, aur runbooks. Documentation code ke paas rehti hai aur usi pull request mein update hoti hai.

**Q107. Module Railways IT staff ko handover kaise karte hain?** Answer: Training sessions, runbook, monitoring dashboards, known issues ki list, aur ek support period jis mein main sawalon ke jawab deta hoon. Module tab done hai jab unki team use chala sake.

## O. Rapid-fire

- **Idempotent?** Dobara karne se result wohi rahe.
- **Stateless app?** Requests ke beech server par user ki state nahi rehti.
- **401 vs 403?** Login nahi hai vs permission nahi hai.
- **Race condition?** Result timing par depend kare; locks ya atomic updates se fix.
- **Soft delete?** Remove karne ke bajaye deleted mark karna, restore aur audit ke liye.
- **Webhook?** Koi aur system kuch hone par aap ke URL ko call karta hai.
- **Reverse proxy?** App ke aage ka server jo requests forward karta hai aur cache aur TLS handle kar sakta hai.
- **RTO vs RPO?** Recover hone ka time vs data jo lose karna afford kar sakte hain.
- **SLA vs SLO?** Customer se promise vs internal target.
- **Blue/green?** Do environments; traffic purane se naye par switch.
- **Canary release?** Pehle chhote hisse ke users ko naya version.
- **Technical debt?** Jaldi ke faislay jo baad mein changes slow kar dein.
- **Heartbeat?** Device ka regular "main zinda hoon" signal; missing heartbeat par alert.
- **Backpressure?** System na sambhal sake to input ko slow ya buffer karna, crash nahi.
- **Dead-letter queue?** Wo queue jahan baar baar fail hone wale jobs jate hain taake unhein inspect kiya ja sake.

## P. Aap ko un se kaun se sawal poochne chahiyein

1. Har module kis phase mein hai, aur mujh se kin modules ki ownership expected hai?
2. Technology stack aur hosting kya hai (apna data center, cloud, PITB)?
3. PITB aur Railways IT teams kaise organized hain, aur launch ke baad operations kis ke paas hain?
4. Aaj kaun sa testing aur CI process maujood hai?
5. Stations aur field mein connectivity ki kya limits hain?
6. Uptime aur peak-load ki kya expectations hain, jaise Eid ke booking days mein?
7. Pehle chhe mahine mein success kaisi dikhegi?

## Q. Honest gaps ke answers (yaad kar lein)

- **Government ya Railways ka experience:** "Directly nahi. Mera experience bade multi-tenant aur high-volume platforms ka hai. Reliability, security, audit trails aur delivery tracking yahan bhi wesey hi matter karte hain, aur main domain rules business team se jaldi seekh leta hoon."
- **Automated testing:** "Main critical flows test aur code review karta hoon, aur automated coverage barha raha hoon. Yahan booking, payment aur permission logic ke liye tests mandatory rakhunga aur CI mein chalaunga."
- **BI tools:** "Maine data side banayi hai. Program jo BI tool use kare, wo seekh loonga."
- **Kubernetes:** "Practically Docker aur Compose, Kubernetes concept level par, aur need ho to seekh loonga."
- **Program details:** "Maine public announcements padhi hain. Main jaanna chahunga ke aaj har module kahan khara hai."

## R. Mock interview ka order (30 minute)

1. Q1, Q4, Q5 (delivery aur quality).
2. Q34, Q55 (data model aur real-time tracking).
3. Q56 aur uske cross-questions (booking aur payments).
4. Q74 se Q78 (QA aur CI/CD).
5. Q92, Q93 (security).
6. Section M se do scenarios random chunein.
7. Section P se aap ke teen sawal.

Har answer do minute mein, bol kar dein.

# Part 2: Database, Big Data, Data Security, Scopes, Scenarios, Tricky aur Concept questions

Numbering Q107 se aage chalti hai.

## S. MySQL deep dive (database questions)

**Q108. InnoDB mein clustered index kya hai, aur kyun matter karta hai?** Answer: InnoDB mein table khud primary-key order mein store hoti hai. Har secondary index mein primary key ki value bhi hoti hai. To bara primary key har index ko bara aur slow bana deta hai.

**Q109. Kya random UUID achha primary key hai?** Answer: Aam tor par nahi. Random values B-tree mein idhar udhar insert hoti hain, to page splits aur slow writes hote hain, aur har secondary index bhi bara ho jata hai. Main BIGINT auto-increment prefer karta hoon, ya public ID chahiye to ordered ID (ULID ya UUIDv7).

**Q110. EXPLAIN kaise padhte hain?** Answer: `type` dekhta hoon (best se worst: const, eq\_ref, ref, range, index, ALL), `key` (kaun sa index use hua), `rows` (estimated scan) aur `Extra`. Bari table par `ALL` ka matlab full scan. `Using filesort` aur `Using temporary` warning signs hain.

**Q111. Kya `is_active` (yes/no) jaise column par index lagana chahiye?** Answer: Akele aam tor par nahi. Low cardinality ka matlab index aadhi table se match karta hai, to MySQL aksar ignore kar deta hai. Composite index ka hissa ho to useful hai, jaise `(station_id, is_active)`.

**Q112. WHERE ka index hone ke bawajood ORDER BY slow kyun ho sakta hai?** Answer: Index ko filter aur sort dono handle karne chahiye. `(station_id, created_at)` jaisa composite index `WHERE station_id = ? ORDER BY created_at` ko serve karta hai. Pehle column par range condition baad ke columns ka sort order tor deti hai.

**Q113. Bari InnoDB table par `COUNT(*)` slow kyun hota hai?** Answer: MVCC ki wajah se InnoDB row count store nahi karta, usay rows count karni parti hain. Bari tables ke liye counter ya summary table rakhta hoon, display ke liye approximate count, ya sirf filtered indexed range count karta hoon.

**Q114. MySQL tables ko kaise join karta hai, aur joins fast kaise banate hain?** Answer: Nested-loop joins, aur naye MySQL 8 versions mein hash joins. Dono taraf join columns par index, same data type par join, pehle filter, aur sirf zaroori columns select.

**Q115. Window functions kya hain? Example dein.** Answer: Yeh related rows par calculation karte hain bina GROUP BY ki tarah rows collapse kiye. Example, har train ka latest ping: `SELECT * FROM (SELECT p.*, ROW_NUMBER() OVER (PARTITION BY train_id ORDER BY pinged_at DESC) rn FROM pings p) x WHERE rn = 1`. Baqi: RANK, DENSE\_RANK, SUM OVER se running totals.

**Q116. CTE aur recursive CTE kya hain?** Answer: CTE ek named sub-query hai (`WITH ... AS`) jo lambi queries ko readable banati hai. Recursive CTE hierarchies par chalta hai, jaise Headquarters, Division, Station, Staff.

**Q117. Views vs stored procedures vs triggers: aap ki opinion?** Answer: Views read-only shortcuts aur reports ke liye theek hain. Stored procedures business logic ko code review aur version control se door chhupa dete hain, to main avoid karta hoon. Triggers hidden side effects dete hain, to sirf narrow kaam jaise audit rows ke liye rakhta hoon aur document karta hoon.

**Q118. Table partitioning kya hai, kab use karenge?** Answer: Ek bari table ko parts mein todna, aksar date range se. Date par filter karne wali queries sirf zaroori partitions touch karti hain (pruning), aur purana data partition drop karke fast hata sakte hain. MySQL mein partition column har unique key ka hissa hona chahiye. GPS aur log history ke liye use karunga. *Cross-question: Partitioning vs sharding?* Answer: Partitioning ek server ke andar table todti hai. Sharding data ko servers mein phailata hai aur complexity bahut barhati hai, to sab se last mein.

**Q119. Gap locks aur next-key locks kya hain?** Answer: REPEATABLE READ mein InnoDB sirf rows nahi, index ranges bhi lock karta hai taake phantom rows na aayein. Is se range mein inserts block ho sakte hain aur ajeeb waits ya deadlocks aa sakte hain. Short transactions aur sahi indexes is problem ko kam karte hain.

**Q120. MVCC kya hai?** Answer: Multi-Version Concurrency Control. Readers data ka consistent snapshot dekhte hain aur writers ko block nahi karte, kyunke purane row versions rakhe jate hain. Isi liye long-running transactions nuksandeh hain: wo purane versions ko zinda rakhti hain.

**Q121. `FOR UPDATE SKIP LOCKED` kis kaam aata hai?** Answer: Worker next unlocked row le leta hai aur doosre workers ki locked rows skip kar deta hai. Simple job-queue tables ya bahut workers mein tasks baantne ke liye useful hai, bina ek doosre ko block kiye.

**Q122. Deadlock ko investigate kaise karte hain?** Answer: `SHOW ENGINE INNODB STATUS` latest deadlock aur involved queries dikhata hai. Fix: rows ko ek hi order mein lock karo, transactions short, sahi index, aur deadlock par transaction retry.

**Q123. MySQL replication aur uske risks samjhayen.** Answer: Primary binary log likhta hai aur replicas usay replay karti hain. Default mein asynchronous hai, to replicas peeche reh sakti hain, aur failover mein last chand transactions lose ho sakti hain. Main lag monitor karta hoon, critical fresh data replica se read nahi karta, aur failover test karta hoon.

**Q124. PHP har request par nayi connection kholta hai. MySQL ko kaise bachate hain?** Answer: Sahi `max_connections`, requests short, persistent connections careful tareeqe se, ya aage ProxySQL jaisa pooler. Peak load mein connection spikes par nazar.

**Q125. InnoDB buffer pool kya hai?** Answer: Data aur index pages ki memory cache. Dedicated database server par aam tor par RAM ka bara hissa (aksar 60 se 70 percent). Achha hit rate sab se bari free performance win hai.

**Q126. Paison ke liye FLOAT ke bajaye DECIMAL kyun?** Answer: FLOAT approximate hota hai, to totals mein chhote chhote farq aa jate hain. DECIMAL exact hota hai. Ya main paise integer paisa mein store karta hoon.

**Q127. DATETIME vs TIMESTAMP?** Answer: TIMESTAMP UTC mein store hota hai, session time zone se convert hota hai, aur saal 2038 par khatam. DATETIME ki range bari hai aur automatic conversion nahi. Main hamesha UTC store karta hoon aur application mein convert karta hoon.

**Q128. Kya JSON columns use karne chahiyein?** Answer: Flexible, kam filter hone wale extras ke liye (device settings, form answers). Aise data ke liye nahi jis par aksar filter, join ya report ho. Filter karna ho to indexed generated column lagata hoon.

**Q129. Bari scale par foreign keys: haan ya nahi?** Answer: Core transactional data ke liye haan, yeh integrity protect karte hain. Bahut bari append-only tables (pings, logs) mein write speed ke liye aksar nahi, aur rules application aur ingestion checks mein lagata hoon.

**Q130. Soft deletes aur unique columns: kya galat hota hai?** Answer: Deleted row ab bhi unique value hold karti hai, to user dobara register nahi kar sakta. Fix: aisi unique key jis mein deleted marker shamil ho, ya purana record restore karne ka decision.

**Q131. Normal forms simple words mein.** Answer: 1NF: ek column mein ek value, repeating groups nahi. 2NF: har column poori key par depend kare. 3NF: koi column kisi aur non-key column par depend na kare. Main 3NF par rukta hoon, phir read speed ke liye jaan boojh kar denormalize karta hoon.

**Q132. Woh SQL tasks jo aap ko paper par likhne aane chahiyein.**

- Second ya N-th highest value: `SELECT DISTINCT salary FROM t ORDER BY salary DESC LIMIT 1 OFFSET N-1` ya `DENSE_RANK()`.
- Duplicates dhoondna: `SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1`.
- Duplicates delete, sab se chhota id rakhna: self join `DELETE a FROM users a JOIN users b ON a.email = b.email AND a.id > b.id`.
- Har group ki latest row (Q115 dekhein) aur `ROW_NUMBER()` se har group ke top 3.
- Jin customers (ya trains) ki koi matching rows nahi: `LEFT JOIN ... WHERE b.id IS NULL`.
- Running total: `SUM(amount) OVER (ORDER BY date)`.

## T. Big data aur data at scale

**Q133. Big data kya hai, aur kya hamare program ka data "big" hai?** Answer: Big data ka matlab hai volume, velocity aur variety jo ek normal database ya tool aaraam se handle na kar sake. Bahut si trains ke GPS pings, sensor readings aur saalon ki ticket history bari aur fast ho sakti hai. Main hype ke liye "big data" nahi bolunga: pehle measure karunga, phir sab se simple tool choose karunga jo kaam kar de.

**Q134. Storage aur load ka estimate kaise lagate hain?** Answer: Made-up numbers ka example: 2,000 devices har 10 second mein ping karein to 200 pings per second, takreeban 1.7 crore rows roz. Row takreeban 100 bytes ki ho to roz 1.7 GB, saal mein takreeban 630 GB raw, indexes se pehle. Is se pata chalta hai ke partitioning, retention aur summaries pehle din se chahiye. (Real numbers milen to wohi lagayen.)

**Q135. Hot, warm aur cold data kya hain?** Answer: Hot: recent data jo constantly use hota hai (last few days), fast storage par. Warm: pichle kuch mahine, kabhi kabhi query. Cold: law ya audit ke liye purana data, compress karke cheap object storage mein. Retention policy data ko inke beech move karti hai.

**Q136. Downsampling ya roll-up kya hai?** Answer: Raw readings thode time ke liye rakho, phir chhoti summaries store karo: per minute, per hour, per day. Pichle saal ke dashboards daily summaries read karte hain, arbon raw rows nahi.

**Q137. Batch vs stream processing?** Answer: Batch data ko schedule par groups mein process karta hai (raat ki reports). Stream har event ko aate hi process karta hai (live alerts, live map). Operational alerts ke liye streaming, heavy reports ke liye batch.

**Q138. Kaun sa queue ya messaging tool, aur kaise choose karte hain?** Answer: Simple, fast jobs ke liye Redis queues ya Redis Streams. Reliable routing aur acknowledgements ke liye RabbitMQ. Bahut high-volume event streams jinhein kai consumers replay karein, un ke liye Kafka. Honest note: meri hands-on strength Redis queues hain; Kafka concept level par jaanta hoon aur volume ki need se pehle add nahi karunga.

**Q139. Data lake vs data warehouse vs data mart?** Answer: Lake: kai formats mein raw data, cheap storage. Warehouse: cleaned, structured data jo analysis ke liye ho. Mart: ek team ke liye chhota warehouse slice (jaise finance ya operations).

**Q140. Columnar ya OLAP store kya hai, aur kab chahiye?** Answer: Data column ke hisaab se store hota hai, to arbon rows par chand columns read karne wali analytical queries bahut fast hoti hain (ClickHouse ek example hai). Sirf tab consider karunga jab MySQL ki summary tables reports ko fast na rakh saken.

**Q141. GPS pings ke liye MySQL, MongoDB ya time-series database?** Answer: Moderate volume par date partitions wala MySQL achha chalta hai aur ek hi technology rehti hai. MongoDB flexible event documents aur aasan horizontal scaling ke liye. Time-series database built-in retention aur roll-ups deta hai. Main wo choose karunga jo team achhe se operate kar sake, aur latest-position record har soorat mein alag rakhunga.

**Q142. Shard key kya hai, aur hot shard kya hai?** Answer: Shard key decide karti hai ke row kis server par jaye. Bad key (jaise aaj ki date) saare naye writes ek shard par bhej deti hai, jo hot shard ban jata hai. Achhi key load barabar baantti hai, jaise device ID ka hash.

**Q143. CAP theorem aur eventual consistency samjhayen.** Answer: Network split ho to distributed system ko consistency (sab ko wohi data dikhe) aur availability (hamesha jawab de) mein se ek choose karni parti hai. Eventual consistency ka matlab copies thode time ke liye alag ho sakti hain, phir mil jati hain. Live map eventually consistent ho sakta hai; seat booking nahi.

**Q144. Late, duplicate aur out-of-order data kaise handle karte hain?** Answer: Har event ko unique key do (device ID plus timestamp), insert-ignore ya upsert se duplicates harmless, device time aur received time dono store, aur live view tab hi update karo jab event stored value se naya ho.

**Q145. Sensor aur GPS data ki quality kaise achhi rakhte hain?** Answer: Ranges validate (speed, coordinates, fuel level), impossible jumps flag, missing data ko guess nahi karta balki missing mark, raw data ko touch nahi, aur har device ki data-quality percentage report taake kharab devices fix hon.

## U. Data security aur privacy

**Q146. Encryption in transit, at rest aur field-level: samjhayen.** Answer: In transit: sab parts ke beech TLS, database tak bhi. At rest: disk ya database encryption chori hui disks aur backups se bachati hai. Field-level: app khud bahut sensitive fields (CNIC, phone) encrypt karti hai, jaise Laravel ke `encrypted` cast se, to database admin bhi unhein aasani se nahi padh sakta.

**Q147. Hashing vs encryption vs encoding?** Answer: Hashing one-way hai (passwords, bcrypt ya Argon2 se). Encryption key ke saath two-way hai (CNIC). Encoding (Base64) sirf format change hai, koi security nahi deta.

**Q148. Encrypted field mein search kaise karte hain?** Answer: Normalize ki hui value ka alag keyed hash (blind index) store karta hoon aur exact match us par search karta hoon. Encrypted data par partial search mushkil hai, to usay limit karta hoon ya sirf non-sensitive fields mein search karta hoon.

**Q149. Masking, tokenization, pseudonymization, anonymization?** Answer: Masking value ka hissa chhupata hai (`***-***-1234`). Tokenization value ko random token se replace karta hai jo secure vault mein rehta hai. Pseudonymization identity ko ID se badalti hai lekin extra data se reverse ho sakti hai. Anonymization insaan se link hamesha ke liye khatam kar deti hai. Test aur analytics mein masked ya pseudonymized data use karta hoon.

**Q150. Database users kaise set karte hain?** Answer: Least privilege. App user sirf apni tables read aur write kar sakta hai, drop ya alter nahi. Schema changes ke liye alag migration user. BI ke liye read-only reporting user. Shared accounts nahi, aur remote root access nahi.

**Q151. Kya Eloquent ke saath SQL injection ho sakta hai?** Answer: Haan, raw methods mein aur un dynamic hisson mein jo bind nahi ho sakte, jaise user input se aaye column names ya `ORDER BY` direction. Main allowed columns aur directions ki whitelist rakhta hoon, user ka text seedha query mein nahi daalta.

**Q152. Mass assignment ka risk kya hai?** Answer: User extra fields bhejta hai (jaise `is_admin`) aur `Model::create($request->all())` unhein save kar deta hai. `$fillable`, sirf validated data (`$request->validated()`), aur raw request data kabhi pass nahi karna.

**Q153. Audit log ko tamper-evident kaise banate hain?** Answer: Append-only table, app user ko update ya delete ke rights nahi, aur chaho to har row ko pichli row ke hash se jodo taake changes detect hon. Copies alag system mein bhej do.

**Q154. Personal data kahan se bina kisi ko pata chale leak hota hai?** Answer: Logs, error reports, analytics tools, email mein exports, backups, test databases aur screenshots. Main logs mein mask karta hoon, exports par restriction, backups encrypt, aur production data dev mein kabhi copy nahi karta.

**Q155. Secure data export kaise design karte hain?** Answer: Sirf authorized roles ke liye, user ke apne scope tak, row aur time limits, expiring download links, kis ne kya export kiya uska record, aur sensitive columns default mein hata ya mask.

**Q156. Doosre department ya vendor ke saath data safely kaise share karte hain?** Answer: Sirf wohi jo zaroori ho, apni credentials aur limited scope wali API se, database dump se nahi. Har access log, purpose aur retention written mein tay, aur jahan identity zaroori nahi wahan masked data.

**Q157. Database server ko harden kaise karte hain?** Answer: Internet par exposed nahi (sirf private network), TLS on, strong unique passwords, anonymous ya remote root nahi, regular patching, unused features off, tested backups, aur unusual queries aur logins par monitoring.

**Q158. Ransomware aur accidental delete se kaise bachte hain?** Answer: Regular backups jo main network se door aur immutable hon (ek period tak change ya delete na ho sakein), tested restores, least-privilege access, aur user data ke liye recovery window wale soft deletes.

**Q159. Data protection laws aur policy par aap kya kehte hain?** Answer: Honest answer: "Main principles follow karta hoon: sirf zaroori data lena, kyun le rahe hain batana, protect karna, sirf zaroori muddat tak rakhna, aur sirf unhein access dena jinhein need hai. Main program ki apni policy aur wo legal rules follow karunga jo department confirm kare." Kisi specific law ka reference tab tak na dein jab tak yaqeen na ho.

## V. Laravel scopes aur Eloquent questions

**Q160. Local scope kya hai?** Answer: Model par reusable query piece, jaise `scopeActive` jo `Ticket::active()->get()` ki tarah chalta hai. Filters ek jagah rehte hain aur code readable hota hai. Naye Laravel versions mein `scope` prefix ke bajaye method par scope attribute bhi lag sakta hai, to team ka version check karein.

**Q161. Global scope kya hai, aur kab use karte hain?** Answer: Aisi scope jo model ki har query par automatically lagti hai, jaise soft deletes, ya tenant ya division filter. Yeh powerful hai kyunke koi bhool nahi sakta, aur yehi iska danger bhi hai.

**Q162. Global scopes ke dangers kya hain?** Answer: Inhein `withoutGlobalScopes()` se bypass kiya ja sakta hai, `DB::table()` ya raw SQL par apply nahi hoti, joins aur relationship queries mein surprise de sakti hain, queue jobs aur console commands mein (jahan logged-in user nahi) alag behave karti hain, aur logic reader se chhupa deti hain. Main aise tests likhta hoon jo prove karein ke user doosri division ka data read nahi kar sakta.

**Q163. Division scoping ka example dikhayen.** Answer: `DivisionScope` normal staff ke liye `where('division_id', auth()->user()->division_id)` lagata hai, aur headquarters roles ise skip kar dete hain. Jobs mein main `auth()` par rely nahi karta, division explicitly pass karta hoon.

**Q164. Scopes vs repository vs query object?** Answer: Chhote reusable filters ke liye scopes. Complex, multi-step ya cross-model queries aur reporting ke liye query objects ya repositories. Jo layers chahiye nahi, wo add nahi karta.

**Q165. `whereHas` vs join: kaun sa fast hai?** Answer: `whereHas` subquery use karta hai aur clear hai, lekin bari tables par achhe indexes ke saath join ya `whereExists` fast ho sakta hai. Main EXPLAIN se measure karke choose karta hoon.

**Q166. Loop ke andar update karne par `chunk()` rows kyun skip ya repeat kar sakta hai?** Answer: Agar chunking ke dauran filter ya ordering wala column change ho jaye to offset boundaries shift ho jati hain. Updates ke liye `chunkById()` (ya `lazyById()`) use karein kyunke yeh primary key se pages banata hai.

**Q167. Kya `firstOrCreate` ya `updateOrCreate` concurrency mein safe hain?** Answer: Khud nahi. Do requests dono kuch nahi paa kar dono insert kar sakti hain. Unique constraint lagayen, duplicate-key error handle karein, ya `upsert` use karein. Uniqueness database ko enforce karni chahiye.

**Q168. Transaction ke andar job dispatch hui aur record nahi mila. Kyun?** Answer: Worker transaction commit hone se pehle start ho gaya. Commit ke baad dispatch karein (`afterCommit`, ya `after_commit` queue setting) taake job chalne tak data maujood ho.

**Q169. Bulk update par mera observer kyun nahi chala?** Answer: Query builder se mass updates aur deletes model events skip kar dete hain kyunke koi model instance load nahi hota. Jahan events zaroori hon wahan model-level updates use karein, ya audit step explicitly likhein.

**Q170. Lazy-loading aur doosri Eloquent mistakes jaldi kaise pakadte hain?** Answer: Non-production mein `Model::preventLazyLoading()` aur strict mode, jo lazy loading, missing attributes aur silently discard hui fills par error deta hai. Is se N+1 problems tests mein visible failures ban jati hain.

**Q171. Karoron rows fast kaise insert karte hain?** Answer: Chand hazar ke batches mein bulk `insert()` ya `upsert()`, har batch ke liye ek transaction, kam indexes, aur queued job se. Loop mein `create()` slow hai kyunke events aur har row ki ek query hoti hai.

**Q172. Counter ko safely kaise barhate hain?** Answer: `increment()` atomic `UPDATE ... SET count = count + 1` chalata hai. Read karke PHP mein add karke save karna concurrency mein lost updates deta hai.

## W. Scenario-based questions (database aur data)

1. **Dashboard query pichle saal fast thi, ab slow hai.** Data barh gaya. EXPLAIN, missing ya changed index, naya heavy filter aur table size dekhta hoon. Behtar index, summary table, ya purani rows archive.
2. **Report mein ek train ki 5 saal ki GPS history chahiye.** Poori table scan nahi. Index aur partition pruning se (train\_id, time range) par query, chunks mein queued job se export, aur link email.
3. **Database CPU roz subah 9 baje 100 percent ho jata hai.** Slow query log aur process list se cause dhoondta hoon: scheduled report, ek saath expire hone wala cache, ya login-time queries. Jobs ko time mein alag karta hoon, cache locks lagata hoon, reports replica par shift.
4. **Do admins ek hi record edit karte hain aur ek ka change lose ho jata hai.** Optimistic locking (version ya updated\_at check) aur clear conflict message.
5. **Replica 10 minute peeche hai.** Primary par long transactions ya heavy write job dhoondta hoon, throttle, us replica se fresh data read karna band, aur lag alerts.
6. **Retention period ke baad personal data delete karna hai.** Scheduled, logged purge batches mein, bina personal data ke deletion ka audit proof, aur pehle staging par test.
7. **Developer debug ke liye production database dump maangta hai.** Raw dump se inkar. Masked copy ya fake data par reproduction deta hoon, aur request log karta hoon.
8. **30 crore rows wali table mein naya column chahiye.** Online schema change tool, ya nullable column aur batches mein backfill, rollback plan aur quiet window ke saath.
9. **Kisi ne production mein WHERE ke baghair UPDATE chala diya.** Zaroorat ho to writes roko, backup ya point-in-time recovery se copy par restore, affected rows repair, phir safeguards: production access limited, manual queries ka review, aur safe-updates setting.
10. **Passenger ke naam se search slow hai.** `LIKE '%name%'` index use nahi kar sakta. Prefix search, full-text index, ya need ho to OpenSearch jaisa search engine.
11. **Summary table ki counts raw table se match nahi karti.** Time zones, late data, cancelled rows aur job failures compare. Affected dinon ki summary rebuild aur reconciliation check.
12. **Vendor system roz raat 50 lakh records bhejta hai.** Staging table, validate, batches mein load, asal tables mein upsert, counts log, aur poora job dobara chalane ke liye safe.

## X. Tricky aur "lines ke beech" wale questions

Yeh questions simple lagte hain, lekin interviewer honesty, judgement, ethics ya attitude check kar raha hota hai. Har question ke saath likha hai ke asal mein kya parakha ja raha hai.

**Q173. "Aap coding prefer karte hain ya team manage karna?"** Parakh: kya aap delivery-owner role ke liye dono kar sakte hain. Answer: "Mujhe dono pasand hain. Mushkil hisson par khud code karta hoon aur quality high rakhta hoon, aur planning, review aur blockers hata kar team ko lead karta hoon."

**Q174. "Ek senior officer kehta hai database mein seedha data change kar do, koi record nahi chahiye."** Parakh: integrity aur ethics. Answer: "Main silently data edit nahi karunga. Written request maangunga, controlled aur logged correction approval ke saath karunga, aur samjhaunga ke audit trail sab ko protect karta hai, us officer ko bhi."

**Q175. "Ek dost kisi ka ticket ya personal record dekhne ko kehta hai."** Parakh: data ethics. Answer: "Nahi. Access sirf kaam ke purpose ke liye hai aur har view log hota hai. Main official channel suggest karunga."

**Q176. "Minister ke demo se pehle bug mila. Kya aap batayenge?"** Parakh: pressure mein honesty. Answer: "Ji haan, apne manager ko foran, risk aur safe plan ke saath: fix karein, us path se bachein, ya jo stable hai wo dikhayen. Main chhupaunga nahi."

**Q177. "Hamari list ka ek tool aap nahi jaante. Kya phir bhi kaam kar sakte hain?"** Parakh: honesty aur learning speed. Answer: "Maine isay professionally use nahi kiya. Sab se close cheez jo maine ki wo yeh hai, aur main isay pehle haftaon mein is tareeqe se seekhunga." Aisi skill ka claim kabhi na karein jo aap explain na kar sakein.

**Q178. "Aap ka sab se weak area kya hai?"** Parakh: self-awareness. Answer: Real aur fixable weakness chunein: automated test coverage, ya BI tools, ya Kubernetes depth. Batayen ke us par kya kar rahe hain. "Main bahut mehnat karta hoon" jaise jawab se bachein.

**Q179. "Aap ka experience zyada private sector ka hai. Government ka kaam slow aur bureaucratic hota hai. Kya yeh problem hai?"** Parakh: adaptability. Answer: "Approvals aur documentation accountability ke liye hote hain. Main inhein pehle se plan karta hoon, written record rakhta hoon, aur sign-off ka wait karte hue kaam parallel chalata rehta hoon."

**Q180. "Aap PITB ke technical decision se agree nahi karte. Kya karenge?"** Parakh: professional disagreement. Answer: "Main data ke saath (risk, cost, examples) pehle private mein baat uthata hoon, ek alternative propose karta hoon, aur final decision accept karta hoon. Decision hone ke baad poori tarah support karta hoon aur jo risks bataye thay un par nazar rakhta hoon."

**Q181. "Vendor ka code poor quality hai aur aap ko us se integrate karna hai."** Parakh: pragmatism. Answer: "Main usay adapter mein wrap karta hoon, jis behavior par depend karta hoon uske gird tests lagata hoon, sab kuch log karta hoon, vendor ko defects written mein report karta hoon, aur unke problems apne code mein nahi laata."

**Q182. "Aap apni current company kyun chhor rahe hain?"** Parakh: attitude aur stability. Answer: Aap ka apna honest jawab. Positive aur forward-looking rakhein: scale, ownership aur national system banane ka moqa. Apne employer ki burai na karein.

**Q183. "Yeh contract hai. Aap ki salary expectation kya hai?"** Parakh: realism. Answer: Pehle se senior engineers aur contract grade ki market range research karein, reasonable range batayen, aur kahein ke sahi scope ke liye flexible hain. Aise numbers na batayen jinka defence na kar sakein.

**Q184. "Kya aap ke CV mein koi cheez hai jo aap detail mein explain nahi kar sakte?"** Parakh: CV honesty. Answer: Interview se pehle CV ki har line explain karne ke liye ready rahein. Agar kuch thin ho to seedha kahein: "Maine isay project ke ek hisse mein use kiya, zyada tar X."

**Q185. "Aap ko long hours kaam karna hoga aur raat ko urgent tasks aa sakte hain. Theek hai?"** Parakh: operations commitment. Answer: "Main samajhta hoon IT operations mein incidents hote hain. Main clear on-call rules aur achhi monitoring prefer karta hoon taake raat ka kaam kam ho, aur jab ho to properly respond karta hoon."

**Q186. "Aap pehle 30 dinon mein kya karenge?"** Parakh: planning. Answer: Architecture aur data flows seekhunga, owners se milunga, incident history padhunga, local environment set karunga, top teen risks (testing, monitoring, deployments) dhoondunga, aur ek chhoti safe improvement deliver karunga.

## Y. Concepts ki cheat sheet (ek line mein)

- **ACID vs BASE:** ACID database ki strict guarantees hain. BASE (basically available, soft state, eventually consistent) scale ke liye loose model hai.
- **CAP theorem:** network split ho to consistency ya availability mein se ek choose karo.
- **Idempotency:** action dohraane se result wohi rahe; retries ke liye zaroori.
- **MVCC:** readers snapshots dekhte hain, to writers ko block nahi karte.
- **B-tree vs hash index:** B-tree ranges aur sorting handle karta hai; hash sirf exact match.
- **Replication vs backup:** replication mistakes bhi copy kar deti hai (delete bhi replicate hota hai); backup se aap time mein peeche ja sakte hain.
- **Sharding vs partitioning vs replication:** servers mein todna, ek server ke andar todna, aur zyada servers par copy karna.
- **OLTP vs OLAP:** bahut saari chhoti live transactions vs kam lekin heavy analytical queries.
- **ETL vs ELT:** load se pehle transform vs pehle raw load phir warehouse mein transform.
- **CDC (change data capture):** database changes binary log se doosre systems ko stream karna.
- **Event sourcing:** har change event ki tarah store karna aur events se state dobara banana.
- **Saga vs two-phase commit:** compensating actions wale local steps ki chain vs systems mein locking protocol; distributed systems mein main saga prefer karta hoon.
- **Circuit breaker:** failing service ko thodi der call karna band karna taake wo recover kare aur aap ki app hang na ho.
- **Bulkhead:** resources alag rakhna taake ek hissa fail ho to sab na girein.
- **Rate limiting (token bucket):** tokens steady speed se refill hote hain aur har request ek token kharch karti hai.
- **Consistent hashing:** keys ko servers mein is tarah baantna ke naya server add karne par sirf thodi keys move hon.
- **Bloom filter:** chhota structure jo kehta hai "definitely nahi hai" ya "shayad hai", expensive lookups bachane ke liye.
- **Write-ahead log:** change pehle log mein likhi jati hai phir data files mein, taake crash ke baad recover ho sake.
- **Data lineage:** report ke har number ka source jaanna.
- **Least privilege:** kaam ke liye sirf zaroori access dena.
- **Defense in depth:** security ki kai layers, taake ek failure breach na bane.

# Part 3: Baqi topics (Git, Linux/Servers, Networking, Redis, APIs, Testing, Agile, Behavioral, Live Coding, Cloud aur Monitoring)

Numbering Q186 se aage chalti hai.

## Z1. Git aur team collaboration

**Q187. Merge vs rebase?** Answer: Merge do branches ko jorta hai aur real history merge commit ke saath rakhta hai. Rebase meri commits ko doosri branch ke upar replay karta hai taake history straight ho. Pull request se pehle apni local branch rebase karta hoon, shared branches kabhi nahi.

**Q188. Merge conflict kaise handle karte hain?** Answer: Latest code pull, conflict wali files open, dono changes samajhta hoon (na samjhoon to doosre developer se poochta hoon), sahi combination rakhta hoon, tests chalata hoon, phir commit. Bina padhe apni side kabhi nahi chunta.

**Q189. `git revert` vs `git reset`?** Answer: Revert naya commit banata hai jo purane ko undo karta hai, shared branches par safe hai. Reset branch pointer peeche karke history rewrite karta hai, to sirf local kaam par.

**Q190. Urgent production fix kaise ship karte hain?** Answer: Production tag se branch, sab se chhota fix test ke saath, quick review, deploy, release tag, phir fix ko main branch mein wapas merge taake kho na jaye.

**Q191. Kaise pata lagate hain ke bug kis commit se aaya?** Answer: `git bisect`: ek good aur ek bad commit mark karta hoon, aur Git history mein binary search karta hai jab main har step test karta hoon. Chand steps mein guilty commit mil jata hai.

**Q192. Achha pull request kaisa hota hai?** Answer: Chhota aur focused, clear description (kya aur kyun), task se linked, tests included, APIs ke liye screenshots ya sample requests, aur unrelated changes nahi. Chhote pull requests ka review behtar hota hai.

## Z2. Linux, Nginx aur server operations

**Q193. Laravel `storage` par permission error de raha hai. Kaise fix karein?** Answer: Web server user (aksar `www-data`) ko `storage` aur `bootstrap/cache` mein write ki permission chahiye. Ownership ya group permissions theek karta hoon, `chmod 777` nahi. Deploy process har baar yeh set kare.

**Q194. Server ki disk full hai. Cause kaise dhoondte hain?** Answer: `df -h` se dekhta hoon kaun si disk, phir `du -sh *` se folders mein neeche jaa kar bari cheezein. Aam causes: logs, purane backups, uploads, ya database. Logs rotate aur policy se archive.

**Q195. Kaise check karte hain ke kya chal raha hai aur kya galat hai?** Answer: CPU aur memory ke liye `top` ya `htop`, service ke liye `systemctl status service`, `journalctl -u service` ya logs par `tail -f`, open ports ke liye `ss -tulpn`, aur memory ke liye `free -m`.

**Q196. Cron vs Laravel scheduler?** Answer: Ek cron entry har minute `php artisan schedule:run` chalati hai, aur schedule code mein define hota hai (version control mein). Agar app kai servers par chale to ensure karta hoon ke har task sirf ek server par chale.

**Q197. Laravel ke liye Nginx ka basic setup samjhayen.** Answer: Server block `public` folder ki taraf, `try_files` requests ko `index.php` bhejta hai, PHP requests `fastcgi_pass` se PHP-FPM ko jati hain, HTTPS certificate ke saath, aur `.env` jaisi sensitive files kabhi serve nahi hoti.

**Q198. Queue workers ko zinda kaise rakhte hain?** Answer: Unhein Supervisor ya systemd ke under chalata hoon taake crash par restart hon, aur har deploy par restart karta hoon. Horizon ke liye Horizon process isi tarah chalata hoon.

**Q199. PHP-FPM ke workers khatam aur requests wait kar rahi hain. Kya check karenge?** Answer: `pm.max_children` aur available memory, workers ko rokne wali slow requests (slow queries ya slow external APIs), aur slow log. Pehle slow cause fix karta hoon, phir workers ki tadaad RAM ke hisaab se tune.

**Q200. SSH aur server ko secure kaise karte hain?** Answer: Key-based login, password login off, seedha root login nahi, firewall jo sirf zaroori ports kholay, automatic security updates, fail2ban jaisa tool, aur limited sudo rights.

**Q201. Ek server par kam downtime wala simple deployment?** Answer: Release folders aur `current` symlink: nayi release upload, composer aur migrations safely, caches warm, symlink switch, PHP-FPM reload aur workers restart, aur pichli release rollback ke liye rakhta hoon.

## Z3. Networking aur infrastructure basics (fiber backbone wala pehlu)

**Q202. DNS simple words mein.** Answer: Yeh naam ko IP address mein convert karta hai. A record naam ko IPv4 address se jorta hai, CNAME alias hai, aur TTL batata hai ke answer kitni der cache rahe. Server move se pehle TTL kam karta hoon.

**Q203. TCP vs UDP?** Answer: TCP reliable aur ordered hai (web, databases). UDP lightweight hai aur koi guarantee nahi (kuch tracking devices aur streaming). Bahut se GPS devices TCP ya UDP use karte hain, to ingestion service ko lost ya duplicate packets handle karne chahiye.

**Q204. Devices ke liye MQTT vs HTTP?** Answer: MQTT lightweight publish/subscribe protocol hai jo bahut se chhote devices aur weak networks ke liye suit karta hai. HTTP simple hai aur har jagah chalta hai. Hazaron devices jo chhote, frequent messages bhejein un ke liye MQTT attractive hai; main choice is par karunga ke devices kya support karte hain.

**Q205. Firewall, NAT, VPN, private network?** Answer: Firewall rule ke hisaab se traffic allow ya block karta hai. NAT bahut si private machines ko ek public address share karne deta hai. VPN private network mein secure tunnel deta hai. Databases aur internal services private network par rehti hain, public address ke baghair.

**Q206. Layer 4 vs layer 7 load balancer?** Answer: Layer 4 IP aur port se route karta hai (fast, simple). Layer 7 HTTP samajhta hai, to path se route, TLS terminate aur application health check kar sakta hai. Web apps ke liye aam tor par layer 7.

**Q207. Latency vs bandwidth vs throughput?** Answer: Latency ek message ki delay hai. Bandwidth link ki maximum capacity hai. Throughput actual deliver hone wali miqdar hai. Bara link bhi slow lag sakta hai agar latency zyada ho.

**Q208. Production mein TLS certificate expire ho gaya. Ab kya, aur kaise rokein?** Answer: Foran renew aur deploy, phir verify. Rokne ke liye: automatic renewal, expiry monitoring jis ka alert hafton pehle aaye, aur har certificate ka ek owner.

## Z4. Redis aur caching practice mein

**Q209. Redis ke kaun se data structures use karte hain, aur kis liye?** Answer: Cache aur counters ke liye strings, objects ke liye hashes (har train ki latest position), queues ke liye lists aur streams, unique members ke liye sets, rankings aur delayed items ke liye sorted sets, aur locks aur rate limits ke liye expiry wali keys.

**Q210. Redis persistence: RDB vs AOF?** Answer: RDB periodic snapshots leta hai (fast restart, recent writes lose ho sakti hain). AOF har write log karta hai (kam loss, bari files). Agar Redis sirf cache rakhe to persistence ki zaroorat nahi. Agar queues rakhe to AOF on karta hoon aur failure ka plan rakhta hoon.

**Q211. Redis ki memory full ho jaye to kya hota hai?** Answer: Wo eviction policy follow karta hai: cache ke liye LRU-style policy purani keys hata deti hai. Queues ya locks ke liye eviction dangerous hai, to alag Redis instance bina eviction ke rakhta hoon aur memory alerts lagata hoon.

**Q212. Kya Redis locks safe hain?** Answer: Expiry wala simple lock bahut kaamon ke liye theek hai, lekin fail ho sakta hai agar kaam jaari rahe aur lock expire ho jaye, ya Redis failover ho. Paison ya seats ke liye main kabhi sirf cache lock par rely nahi karta: database constraint final protection hai.

**Q213. Redis single point of failure hai. Kya karenge?** Answer: Automatic failover ke liye Sentinel ke saath replication, ya sharding ke liye Redis Cluster, aur app ko cache outage survive karne ke qabil banao (database par fallback aur slow ho, crash na ho).

## Z5. API design aur documentation

**Q214. POST request ko retry ke liye safe kaise banate hain?** Answer: Idempotency key bhejte hain. Server us key ka result store karta hai, aur repeat request doosri booking ya payment banane ke bajaye wohi result return karti hai.

**Q215. APIs ke liye filtering, sorting aur pagination kaise design karte hain?** Answer: Filters ke liye query parameters (`?station=12&status=open`), sortable fields ki whitelist, maximum page size ke saath cursor ya page-based pagination, aur consistent response shape jis mein totals ya next cursor ho.

**Q216. API error response kaisa hona chahiye?** Answer: Sahi status code, machine-readable stable error code, human ke liye clear message, field-level validation errors, aur support ke liye request ID. Stack traces ya internal details nahi.

**Q217. API versioning ke options?** Answer: URL mein (`/api/v1`), header mein, ya media type se. Main clarity ke liye URL prefer karta hoon. Purane versions notice period tak support hote hain, aur deprecations pehle announce karta hoon.

**Q218. API contract ko document aur test kaise karte hain?** Answer: OpenAPI (Swagger) ya Postman collection repository mein, CI mein generate ya check, aur contract tests taake mobile apps ko todne wali change release se pehle pakri jaye.

**Q219. Webhooks ko reliable kaise banate hain (bhejna aur receive karna)?** Answer: Bhejna: backoff ke saath retries, signatures aur delivery log. Receive: signature verify, jaldi response, kaam queue par, aur duplicates handle, kyunke ek webhook do baar bhi aa sakta hai.

## Z6. Testing practice mein (PHPUnit aur Pest)

**Q220. PHPUnit vs Pest?** Answer: Pest PHPUnit ke upar chalta hai, chhoti aur readable syntax ke saath. Engine aur assertions wohi hain. Team koi bhi use kar sakti hai, aur main existing convention follow karunga.

**Q221. Simple feature test dikhayen.** Answer: Pest mein example:

```php
it('rejects booking when no seats are left', function () {
    $train = Train::factory()->create(['available' => 0]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/bookings', ['train_id' => $train->id])
        ->assertStatus(422);
});
```

Yeh factories se data banata hai, user ban kar API call karta hai, aur result check karta hai.

**Q222. `RefreshDatabase` vs `DatabaseTransactions`?** Answer: `RefreshDatabase` tests ke beech database migrate aur reset karta hai, clean lekin slow. `DatabaseTransactions` har test ko transaction mein wrap karke rollback karta hai, fast lekin schema pehle se ready chahiye. Main default mein `RefreshDatabase` use karta hoon, in-memory ya dedicated test database ke saath.

**Q223. Jobs, events aur notifications kaise test karte hain?** Answer: `Queue::fake()`, `Event::fake()`, `Mail::fake()` aur `Notification::fake()` se check karta hoon ke sahi cheezein dispatch hui, aur alag tests jo job ka handle method real data par chalate hain.

**Q224. Authorization (policies aur roles) kaise test karte hain?** Answer: Har role ke liye test karta hoon ke allowed actions succeed hon aur forbidden actions 403 dein, jis mein wo case bhi shamil hai jahan user ID change karke doosri division ka record kholne ki koshish kare.

**Q225. Code coverage kya batati hai, aur kya nahi?** Answer: Yeh batati hai ke tests mein kaun si lines chali, yeh nahi ke tests sahi cheez check karte hain. Critical modules (booking, payments, permissions) par high coverage chahta hoon, har jagah 100 percent ka peecha nahi karta.

**Q226. Flaky test kya hai, aur kaise fix karte hain?** Answer: Aisa test jo kabhi pass kabhi fail ho, aam tor par time, random data, order dependency ya external services ki wajah se. Time freeze karke, data seed karke, tests isolate karke, aur bahar ki calls fake karke fix karta hoon. Flaky test ko kabhi ignore nahi karta.

**Q227. Kya aap TDD karte hain?** Answer: Honest answer: "Tricky business rules aur bug fixes ke liye test-first: pehle failing test jo bug reproduce kare, phir fix. Simple CRUD ke liye tests code ke saath likhta hoon."

## Z7. Agile, project aur requirement management

**Q228. Scrum vs Kanban?** Answer: Scrum fixed sprints mein planning, review aur retrospective ke saath chalta hai. Kanban continuous flow hai jis mein work in progress par limit hoti hai. Planned modules wale program ke liye sprints, aur support aur bug work ke liye Kanban.

**Q229. Achi user story aur acceptance criteria kaise likhte hain?** Answer: "Station operator ke taur par, main ... chahta hoon taake ...", phir clear, testable criteria (given, when, then). Agar main test nahi kar sakta to wo requirement abhi clear nahi hai.

**Q230. Sab kuch urgent ho to priority kaise set karte hain?** Answer: Business value, risk aur effort ke hisaab se, jaise MoSCoW (must, should, could, won't). Owner ke saath written mein must-haves tay karta hoon aur dikhata hoon ke kya bahar ja raha hai.

**Q231. Non-technical officers ko progress report kaise dete hain?** Answer: Ek page: kya hua, next kya hai, risks, aur un se kin decisions ki zaroorat hai. Module ke hisaab se percent complete, jahan possible ho live demo ke saath. Jin technical words ki zaroorat nahi, wo nahi.

**Q232. Risk register mein kya hota hai?** Answer: Risk, likelihood, impact, owner, action aur date. Yahan ke typical risks: vendor delays, unclear requirements, stations par weak connectivity, data quality, aur staff turnover. Main isay har hafte review karta hoon.

**Q233. Underperform karne wale team member ko kaise handle karte hain?** Answer: Pehle private mein baat karke cause dhoondta hoon (skills, clarity, workload, personal), chhote clear goals deta hoon, pairing aur feedback se support, progress check, aur sirf improvement na hone par documented examples ke saath escalate.

**Q234. Do developers ke conflict ko kaise resolve karte hain?** Answer: Dono ko alag alag sunta hoon, technical facts aur goal par focus, unhein saath bitha kar criteria par agree karwata hoon, aur agar na karein to khud reason bata kar decide karta hoon.

**Q235. Retrospective kya hai, aur achhe outcome ki example?** Answer: Sprint ke baad short team meeting: kya achha hua, kya nahi, kya change karna hai. Achha outcome ek concrete action hai jis ka owner ho, jaise bure migration ke baad "migration review checklist add karo".

## Z8. Behavioral questions (STAR method)

STAR use karein: **Situation** (ek jumla), **Task** (aap ka role), **Action** (aap ne kya kiya, "main" ke saath), **Result** (possible ho to numbers, aur kya seekha). Zyada se zyada do minute.

**Chhe real stories** apne kaam se ready rakhein aur unhein kai questions par lagayen:

1. Mushkil performance problem jo aap ne fix ki (HOLOIN ki slow queries).
2. Production incident jo aap ne handle kiya.
3. Deadline jo scope cut karke bachayi.
4. Jab aap ne kisi ko lead ya mentor kiya.
5. Disagreement ya conflict jo aap ne resolve kiya.
6. Jab aap ne naya technology jaldi seekha.

**Q236. Aisa waqt batayen jab aap ne manager ya client se disagree kiya.** Answer: Story 5 chunein. Dikhayen ke aap ne data diya, suna, aur decision hone ke baad us par commit kiya.

**Q237. Aisa waqt batayen jab aap fail hue.** Answer: Real, chhoti se medium failure chunein. Focus is par rakhein ke baad mein kya change kiya. Doosron ko blame na karein.

**Q238. Tight deadline ke dauran kaam ka waqt batayen.** Answer: Story 3 chunein. Batayen ke priority kaise di, kya cut kiya, aur kaise communicate kiya.

**Q239. Aisa waqt batayen jab aap ne kuch jaldi seekha.** Answer: Story 6 chunein. Apna learning method dikhayen: official docs, chhota prototype, experienced banday se poochna, phir apply karna.

**Q240. Aisa waqt batayen jab aap ne koi process improve kiya.** Answer: Koi CI check, review checklist, deployment script ya runbook jo aap ne shuru kiya, aur measurable result (kam bugs, fast deploys).

**Q241. Aisa waqt batayen jab aap ne non-technical shakhs ko technical baat samjhayi.** Answer: Analogy use karein, jaise background jobs ke liye ticket counter ki line, aur batayen ke us shakhs ne is se behtar decision liya.

## Z9. Live coding aur logic tasks (paper par practice)

**C1. Array mein duplicate values dhoondein.**

```php
function duplicates(array $items): array {
    $seen = [];
    $dups = [];
    foreach ($items as $item) {
        if (isset($seen[$item])) { $dups[$item] = true; }
        $seen[$item] = true;
    }
    return array_keys($dups);
}
```

Explain karein: ek pass, hash lookup, to time linearly barhta hai.

**C2. Tickets ko station ke hisaab se group karke count karein.**

```php
$counts = [];
foreach ($tickets as $t) {
    $counts[$t['station']] = ($counts[$t['station']] ?? 0) + 1;
}
arsort($counts); // busiest first
```

Laravel mein: `Ticket::select('station_id', DB::raw('COUNT(*) c'))->groupBy('station_id')->orderByDesc('c')->get()`.

**C3. CNIC format validate karein (5 digits, 7 digits, 1 digit).**

```php
function validCnic(string $v): bool {
    return preg_match('/^\d{5}-\d{7}-\d$/', $v) === 1;
}
```

Kahein: yeh sirf format check hai; isse sabit nahi hota ke CNIC real hai.

**C4. Brackets balanced hain ya nahi.** Stack use karein: opening bracket push, closing par pop aur compare, aur sirf tab valid jab aakhir mein stack khali ho.

**C5. Do GPS points ke beech distance (haversine ka idea).** Explain karein: degrees ko radians mein convert, Earth radius takreeban 6,371 km ke saath haversine formula, aur kilometers return. Add karein: bari scale par "station ke qareeb kaun si trains" ke liye pehle indexed latitude aur longitude par bounding box se filter karta hoon, phir exact distance calculate.

**C6. Log file mein har ghante ki error lines count karein.** File line by line padhein (poori kabhi load nahi), regex se ghanta nikalein, har ghante ka counter barhayen, aur result print karein.

**C7. Overlapping seat holds ya bookings pakadein.** Do ranges overlap karti hain agar `start1 < end2 AND start2 < end1`. Isay index wali query mein use karein, aur phir bhi database constraint ya lock se protect karein.

**C8. Simple rate limiter ka idea.** Har user aur minute ke liye Redis mein `INCR` aur expiry ke saath counter rakhein, aur limit cross hone par block karein. Smooth limits ke liye token bucket approach ka zikr karein.

Live coding tips: pehle apna plan bolein, simple correct version se shuru karein, phir improve karein, edge cases (empty input, null, duplicates, bahut bara input) ka naam lein, aur likhte hue bolte rahein.

## Z10. Cloud, availability aur monitoring

**Q242. Government system ke liye on-premise vs cloud?** Answer: On-premise ya government data centers control aur data residency dete hain lekin capacity planning aur staff mangte hain. Cloud fast scaling deta hai lekin cost, data kahan rakha ja sakta hai ke rules, aur provider par dependency laata hai. Aksar hybrid choose hota hai. Main program ki policy follow karunga aur app ko aisa banaunga ke move ho sake.

**Q243. Virtual machines vs containers?** Answer: VM mein poora operating system hota hai, to wo heavy aur zyada isolated hai. Container host kernel share karta hai, to fast start hota hai aur kam resources leta hai. Containers aksar VMs par chalte hain.

**Q244. 99.9 percent uptime ka matlab kya hai?** Answer: Saal mein takreeban 8.8 ghante downtime. 99.99 percent takreeban 53 minute saal mein. Har extra nine bahut mehnga parta hai, isliye main poochta hoon ke business ko asal mein kya chahiye.

**Q245. 3-2-1 backup rule?** Answer: Data ki teen copies, do alag qism ki storage par, ek copy off-site. Aur restore ko test karein.

**Q246. Monitoring aur error tracking ke liye kaun se tools use karte hain?** Answer: App aur queues ke liye Laravel Telescope aur Horizon (aur Pulse), Sentry jaisa error tracker, metrics ke liye Prometheus aur Grafana, aur logs ke liye ELK stack jaisa system. Honest note: wohi tools batayen jo asal mein use kiye hon, aur bataiye ke kaun se sirf concept level par jaante hain.

**Q247. Synthetic check kya hai?** Answer: Schedule par chalne wala test jo user ki tarah behave karta hai (home page kholo, train search karo, login karo) bahar se, aur fail hone par alert deta hai. Yeh problems real users ke complain karne se pehle pakadta hai.

**Q248. Alert fatigue se kaise bachte hain?** Answer: Sirf un cheezon par alert jin par abhi insaan ko action lena ho, related alerts group, sahi thresholds, severity ke hisaab se routing, aur har hafte noisy alerts ka review. Agar sab alert karein to kisi par attention nahi jati.

**Q249. Capacity planning kaise karte hain?** Answer: Current usage measure (CPU, memory, disk, connections, queue length), growth trends dhoondta hoon, limits maloom karne ke liye load test, aur kisi bhi limit ke takreeban 70 percent par pohnchne se pehle upgrades plan.
