# Interview Prep: Roman Urdu Version (Poori Guide)

Yeh PITB / Pakistan Railways ITOPS interview guide ka Roman Urdu tarjuma hai (Part 1, 2 aur 3). Technical words (queue, index, transaction waghera) jaan boojh kar English mein rakhe hain, kyun ke interview mein aap yehi bolenge. Jawab pehle shakhs mein hain taake aap natural tareeqe se bol sakein. Jahan "aapki story" likha hai wahan apni asal kahani ke mutabiq details badlein. Program ki details (phase status, stations ki list) interview se pehle verify karein. Question numbers English guide ke barabar hain. Aakhri jawab interview mein English mein bolne ki practice karein.

## 0. Yeh job asal mein kya parakh rahi hai

1. **Delivery owner:** kya aap 3 saal ke program mein targets aur deadlines poore kar sakte hain, jahan bohat se stakeholders hain.
2. **Quality owner:** kya aap government system ko bugs se bacha sakte hain jo hazaron staff aur lakhon passengers istemal karte hain.
3. **Operations mindset:** title mein IT Operations hai, is liye uptime, monitoring, support aur incidents ke sawal aayenge, sirf coding ke nahi.
4. **Government context:** audit trails, sensitive data (CNIC, police records), role-based access, long-term maintenance, vendors aur departments par dependency.

**Opening line:** "Maine high-volume, multi-tenant platforms banaye hain jin mein queues, caching aur live dashboards hain. Reliability, security aur delivery tracking ka wohi discipline is program ko chahiye."

## A. Role, delivery aur HR ke sawal

**Q1. Aap Pakistan Railways ki digital transformation par kyun kaam karna chahte hain?** Jawab: Yeh ek bara public system hai jis ka asal asar hai: ticketing, tracking, safety aur transparency. Mujhe lambe programs pasand hain jahan quality sirf quick demo se ziada ahem hoti hai, aur main team lead ke taur par delivery lead kar chuka hun.

**Q2. Yeh 3 saal ka contract hai. Hum kyun maane ke aap tikenge aur motivated rahenge?** Jawab: 3 saal ka program mujhe cheezein theek tareeqe se banane aur production mein chalte dekhne ka moqa deta hai. Mujhe system ko poore cycle mein own karna pasand hai: build, release, support, improve.

**Q3. Developer role mein "IT Operations" ka matlab aap ke liye kya hai?** Jawab: Aisa code likhna jo chalana aasan ho: logs, health checks, alerts, safe deployments, runbooks aur tez incident response. Feature tab tak complete nahi jab tak support staff usay operate na kar sake.

**Q4. Aap kaise yaqeeni banayenge ke tamam development targets poore hon?** Jawab: Main program ko modules mein baant deta hun, har ek ka owner, milestones aur saaf "done" rules. Progress hafta-war track karta hun, demos jaldi dikhata hun, aur risk jis din nazar aaye usi din raise karta hun. Waqt kam ho to scope kam karta hun, quality nahi. *Cross-question: Agar target ghair-haqeeqi ho?* Jawab: Main numbers dikhata hun (tasks, effort, risks) aur options deta hun: scope kam karein, log barhayen, ya date aage karein. Jo poora nahi kar sakta us ka wada nahi karta.

**Q5. Aap kaise yaqeeni banate hain ke software bugs aur errors se paak ho?** Jawab: Koi software bug-free nahi hota, is liye main process banata hun: code review, critical paths par automated tests, CI checks, staging, safe releases aur release ke baad monitoring. Maqsad yeh hai ke serious bugs users tak na pohnchein aur chhote jaldi theek hon.

**Q6. Senior officials release ka dabao daalen jab testing mukammal na ho, to kya karenge?** Jawab: Main risk saaf alfaz mein batata hun (kya toot sakta hai, kis par asar parega) aur safe option deta hun: tested core abhi release karein, baqi rok lein. Faisla aur risk likhit mein rakhta hun.

**Q7. Kya aap ne government ya bari organizations ke saath kaam kiya hai?** Jawab: Seedha government ke saath nahi. Mera kaam bare multi-tenant platforms par raha jahan reliability, access control aur audit ahem the. Main business team ke saath beth kar domain rules jaldi seekh leta hun.

**Q8. Aisa project batayen jo aap ne shuru se aakhir tak lead kiya (aapki story).** Jawab: HOLOIN. Multi-tenant IoT platform jis mein high-volume device data, queues, Docker aur AI service layer thi. Maine modules plan kiye, code review kiya, slow queries theek ki (10 se 20 minute ki queries indexes, DB-side kaam aur latest-value caching se istemal ke qabil hui), aur production issues sambhale.

**Q9. Alag alag skill levels wali team ko kaise manage karte hain?** Jawab: Juniors ko chhote, saaf tasks misaal ke saath deta hun, pehle tasks par pair karta hun, aur narmi se aur khaas feedback deta hun. Seniors ko ek module ki ownership deta hun. Ek shared checklist rakhta hun taake quality sab ki barabar ho.

**Q10. PITB teams aur Railways officers (jo technical nahi) ke saath kaise kaam karte hain?** Jawab: Saada alfaz, likhit requirements, change log, aur har sprint chhote demos. Trade-offs ko time, cost aur risk mein batata hun, technical zubaan mein nahi.

**Q11. Development lagbhag khatam ho aur requirement badal jaye to kya karte hain?** Jawab: Tabdeeli likhta hun, us ka asar estimate karta hun, aur owner se kehta hun ke chune: time barhayen, kuch aur hataein, ya agle release mein rakhein.

**Q12. Production mein apni ghalti aur us ke baad kya badla (aapki story).** Jawab: Asal misaal lein: kya toota, kitni jaldi pata chala, pehle kya kiya (nuqsan roka), root cause, aur jo prevention lagayi (test, check, review rule).

## B. PHP ki buniyaad

**Q13. Production mein PHP request kaise chalti hai?** Jawab: Nginx request PHP-FPM ko deta hai, ek worker script chalata hai aur response wapas karta hai, aur memory saaf ho jati hai. State process ke bahar rehni chahiye (sessions Redis mein, data database mein). *Cross-question: Yeh scaling mein kyun madad karta hai?* Jawab: Requests aapas mein independent hain, to main workers ya servers barha sakta hun. Sessions, cache aur uploads shared hone chahiye (Redis, object storage).

**Q14. OPcache kya hai aur production PHP mein aur kya tune karte hain?** Jawab: OPcache compiled scripts ko memory mein rakhta hai. Main PHP-FPM workers memory ke hisaab se tune karta hun, sahi timeouts rakhta hun, display\_errors band karta hun, aur optimized Composer autoloader istemal karta hun.

**Q15. Aap PHP 8.x ke kaun se features istemal karte hain?** Jawab: Typed properties, enums, match, readonly properties, constructor promotion, named arguments, nullsafe operator aur attributes. Yeh code ko saaf banate hain aur ghaltiyan pehle pakarte hain.

**Q16. Bohat bari file ya export bina memory khatam kiye kaise process karte hain?** Jawab: Stream karta hun: generators ya Laravel cursor/lazy/chunk, output saath saath likhta hun, aur kaam queued job mein chalata hun, web request mein nahi.

**Q17. PHP/Laravel mein errors aur logging kaise sambhalte hain?** Jawab: Expected failures ke liye exceptions, baqi ke liye global handler, request ID aur user ID ke saath structured logs, aur users ko raw errors kabhi nahi dikhata.

**Q18. Dependency injection kya hai aur lambe program mein kyun ahem hai?** Jawab: Classes jo chahiye wo bahar se paati hain, khud nahi banatin. Is se code testable hota hai (fake pass karo), aur payment, SMS ya GPS provider business code badle bina badal sakte hain.

**Q19. Interface vs abstract class vs trait?** Jawab: Interface: contract. Abstract class: shared base jis mein kuch code ho. Trait: reusable code jo classes mein mila diya jata hai. Main `NotificationChannel` ya `PaymentGateway` jaisi cheezon ke liye interfaces istemal karta hun.

**Q20. PSR standards kya hain aur bari team ko kyun chahiye?** Jawab: PSR-4 autoloading, PSR-12 style, PSR-3 logging. Yeh bohat developers aur vendors ke beech code ko yaksan rakhte hain. Main style CI mein Pint se khud ba khud lagwata hun.

## C. Laravel

**Q21. Laravel request lifecycle samjhayen.** Jawab: `public/index.php` app boot karta hai, middleware chalti hai, router route dhoondta hai, controller chalta hai, aur response middleware se wapas jata hai. Service providers pehle services register aur boot karte hain.

**Q22. 3 saal ke program ke liye bari Laravel application ki structure kaise banate hain?** Jawab: Modular structure: Ticketing, Tracking, Inspection, Attendance aur Reporting jaise modules, har ek ke apne routes, services, policies aur tests. Business logic service ya action classes mein, controllers mein nahi.

**Q23. N+1 problem kya hai aur kaise pakadte hain?** Jawab: List ke liye ek query aur har row ke relation ke liye ek aur query. Fix: `with()`, `withCount()` aur sirf zaroori columns select karna. Debugbar, Telescope ya query logs se pakadta hun, aur query count barhne par test fail bhi karwa sakta hun.

**Q24. Queues: background jobs ko safe kaise banate hain?** Jawab: Backoff ke saath retries, timeouts, failed-jobs table, aur **idempotent** jobs, taake do baar chalne se SMS do baar ya charge do baar na ho. Monitoring ke liye Redis ke saath Horizon. *Cross-question: Deploy ke baad workers purana code chala rahe hain. Kyun?* Jawab: Workers lambe waqt chalte hain. Har deploy par `queue:restart` (ya Horizon restart) chalayen.

**Q25. Is program ke liye scheduler kaise istemal karenge?** Jawab: Expire hui seat holds chhodna, daily summary tables banana, stale GPS devices mark karna, overdue inspections ke reminders bhejna, aur payment providers ke saath reconciliation. Har task do baar chalne par bhi safe ho aur apna result log kare.

**Q26. Bari organization mein authentication aur authorization.** Jawab: Authentication Sanctum ya OAuth se, admins ke liye MFA. Authorization Policies aur roles/permissions se, division, station ya office ke hisaab se scoped. Record ki ownership hamesha check karein taake IDOR na ho.

**Q27. Multi-tenancy ya multi-division data scoping (aapki story).** Jawab: HOLOIN mein maine middleware mein tenant resolve kiya aur global scopes lagaye taake har tenant sirf apna data dekhe, phir test kiya ke scope bypass nahi ho sakta. Yahan wohi idea divisions aur stations par lagta hai.

**Q28. Validation aur API design.** Jawab: Validation ke liye Form Requests, JSON shape ke liye API Resources, har list par pagination, versioned routes (`/api/v1`) taake Rabta jaisi mobile apps API badalne par na toot jayen.

**Q29. File uploads (inspection photos, documents) kaise sambhalte hain?** Jawab: Asal file type aur size check, files ka naam badalna, object storage mein rakhna, expiring private links se dena, aur thumbnails queue jobs mein banana.

**Q30. Laravel mein audit logging kaise karte hain?** Jawab: Model observers ya auditing package se who, what, when, purani aur nayi values append-only table mein, jis tak access mehdood ho.

## D. MySQL, indexes aur performance

**Q31. Slow query kaise dhoondte aur theek karte hain?** Jawab: Slow query log ya `EXPLAIN`. Dekhein ke kaun sa index use hua, kitni rows scan hui, filesort aur temporary tables. Behtar (aksar composite) index, kam columns, indexed columns par function nahi, aur per-row kaam kam.

**Q32. "Station aur date range ke hisaab se tickets" ke liye indexes design karein.** Jawab: Composite index `(station_id, travel_date)`: equality column pehle, range column aakhir mein. Leading-column rule ka matlab sirf date par filter is index ko istemal nahi karega.

**Q33. Aakhri seat do log ek saath book na karein, kaise?** Jawab: Transaction mein row lock (`lockForUpdate`) ya conditional update (`UPDATE ... WHERE available > 0`) aur affected rows check, saath mein (train, date, seat) par unique constraint. Faisla database karta hai.

**Q34. Hazaron locomotives ke GPS pings kaise store karte hain?** Jawab: Raw pings ko narrow, append-only, time-partitioned table (ya time-series/NoSQL store) mein, device aur time par index, aur har train ka alag "latest position" record. Purana raw data policy ke mutabiq archive hota hai. *Cross-question: Alag latest-position record kyun?* Jawab: Dashboards ko kabhi history scan nahi karni chahiye. Latest record har train ki ek row hai aur hamesha tez. (Aapka HOLOIN latest-packet approach.)

**Q35. 10 crore rows wali table par pagination.** Jawab: Keyset pagination: `WHERE id > last_id ORDER BY id LIMIT 50`. Bare OFFSET slow hote hain kyun ke MySQL ko skip ki hui rows se guzarna parta hai.

**Q36. Bari live table ko safely kaise badalte hain?** Jawab: Online schema change tools (gh-ost, pt-online-schema-change) ya nullable column pehle, batches mein backfill, phir constraints. Production-size data par test, backup aur rollback plan.

**Q37. Transactions, isolation levels aur deadlocks.** Jawab: Transactions kai writes ko saath kamyab ya naakam banati hain. MySQL ka default REPEATABLE READ hai. Deadlock tab hota hai jab transactions ek doosre ka intezar karti hain, to unhein chhota rakho, locks hamesha ek order mein lo, aur deadlock par retry karo.

**Q38. Government database ka backup aur recovery.** Jawab: Daily full plus point-in-time recovery ke liye binary logs, server se bahar copies, aur schedule par **tested restores**. Jis backup ka restore kabhi test nahi hua wo backup nahi. RPO aur RTO business ke saath tay karein.

**Q39. Read replicas: kab aur kya dekhna hai.** Jawab: Bari reports ke liye taake live booking tez rahe. Replication lag dekhein: lag wali replica se "abhi book hua" data na parhein.

## E. BI, reporting aur data

**Q40. Is program mein kaun si reports ki umeed hai?** Jawab: Station/din ke hisaab se ticket sales aur revenue, passenger counts, train delays, punctuality, har trip ka fuel, attendance aur discipline, inspection findings aur overdue fixes, helpline call volumes, complaint resolution time.

**Q41. Live system ko slow kiye bina reports kaise banate hain?** Jawab: Saada shuru karein: scheduled jobs se update hone wali summary tables. Phir read replica. Phir ETL se bhara hua alag reporting database. Wo chunein jo zaroorat poori kare aur sab se saada ho.

**Q42. ETL samjhayen aur use reliable kaise banate hain.** Jawab: Extract, Transform, Load. Jobs repeatable banata hun (do baar chalane se wohi result), row counts log karta hun, late data sambhalta hun, aur failures par alert lagata hun.

**Q43. Ticket sales ke liye fact aur dimension tables.** Jawab: Fact: har ticket ki ek row (amount, time, station id, train id). Dimensions: station, train, date, passenger type. Reports fact table ko chand dimensions se join karti hain.

**Q44. 3 saal ki revenue report 90 second leti hai. Theek karein.** Jawab: `EXPLAIN` dekhein, `(station_id, date)` par index, PHP mein hisaab band, daily summary table (har station har din ki ek row), result cache. Karoron rows hazaron ban jati hain.

**Q45. Do dashboards ke totals alag hain. Kaise tehqeeq karenge?** Jawab: Filters, time zones (UTC vs Pakistan time), cancelled aur refunded records, aur source table compare karein. Raw data se reconcile karein aur har metric ki ek definition tay karein.

**Q46. Aap ne kaun se BI tools istemal kiye?** Jawab: Imandari se: "Maine data wala hissa banaya hai (aggregation, summaries, exports, APIs). BI tool meri main job nahi rahi, lekin Metabase ya Power BI saaf reporting database par chalte hain, to main wo layer tayyar kar sakta hun aur tool jaldi seekh loonga."

**Q47. Faislay karne walon ke liye report data ko bharosemand kaise banate hain?** Jawab: Har metric ki ek definition, raw data se reconciliation checks, input par data validation, aur har dashboard par nazar aane wala "last updated" time.

## F. Design patterns aur principles

**Q48. Laravel mein aap kaun se patterns istemal karte hain aur kyun?** Jawab: Business logic ke liye Service/Action classes, Repository sirf complex ya reused queries ke liye, badalne wale providers (SMS, payment, GPS vendors) ke liye Strategy, model events ke liye Observer, objects aur test data ke liye Factory, middleware jaise steps ke liye Pipeline.

**Q49. Is program se Strategy pattern ki misaal.** Jawab: `NotificationChannel` interface jis mein `send()` ho; classes `SmsChannel`, `EmailChannel`, `PushChannel`. WhatsApp add karna matlab ek class add karna, purana code nahi chhedna.

**Q50. Inspection ya booking ke liye State pattern.** Jawab: Booking states se guzarti hai: pending, held, paid, confirmed, cancelled. Inspection: raised, assigned, fixed, verified, closed. Har state sirf kuch agle states ki ijazat deti hai, to ghalat jump mumkin hi nahi.

**Q51. Bahar ke systems ke liye Adapter pattern.** Jawab: Har external system (payment provider, SMS gateway, GPS vendor, NADRA) ko apni interface ke peeche lapet deta hun. Vendor format badle to sirf adapter badalta hai.

**Q52. SOLID ek ek line mein.** Jawab: Ek class ka ek kaam; naya feature code add karke, purana edit karke nahi; child class wahan chale jahan parent chale; chhoti interfaces; concrete classes par nahi, interfaces par depend karo.

**Q53. Kya Repository pattern hamesha chahiye?** Jawab: Nahi. Eloquent saadi surat mein pehle hi kaam kar deta hai. Main complex ya reused queries ke liye ya data source badalne ke imkan par add karta hun. Bila zaroorat extra layers over-engineering hain.

**Q54. CQRS ya event-driven design kab istemal karenge?** Jawab: Jab reads aur writes ki zarooratein bohat alag hon, jaise live booking writes aur bhaari reporting reads. Complexity barhti hai, is liye sirf jab zaroorat saaf ho. Events ke handlers idempotent aur tracing ke liye correlation IDs hone chahiyein.

## G. Is program ke liye System design

Bolne ka tareeqa: users aur traffic clear karo, main flows likho, data model, components, bottlenecks, security aur failure, monitoring aur growth.

**Q55. Tamam locomotives ke liye real-time train tracking design karein.** Jawab: GPS devices ingestion API ko pings bhejte hain. API validate karke queue mein daalti hai. Workers raw history save karte hain aur Redis mein latest-position record update karte hain. Control-room dashboards latest record parhte hain aur WebSockets ya polling se live update milta hai. Stale data threshold ke baad label ho jata hai. *Cross-question: Hazaron pings per second. Pehle kya tootega?* Jawab: Database writes. Main batch inserts karta hun, queue se spikes ko smooth karta hun, aur history ko time se partition karta hun. *Cross-question: Devices duplicate ya out-of-order pings bhejte hain.* Jawab: Device id plus timestamp ko unique key banao, live view ke liye latest se purane ko ignore karo, lekin history mein sab rakho.

**Q56. Online ticket booking flow design karein.** Jawab: Search (cached), transaction mein takreeban 10 minute ki seat hold, payment, confirmation, ticket PDF aur SMS queue jobs mein. Scheduled job expired holds chhodta hai. Peak (Eid rush) mein waiting room booking ki hifazat karta hai. *Cross-question: Payment ho gayi lekin callback nahi aaya.* Jawab: Booking ko pending rakho, reconciliation job provider se asal status pooche, phir confirm ya release karo. Callbacks signature-checked aur idempotent hon.

**Q57. Real-time fuel monitoring system design karein.** Jawab: Sensor readings wahi ingestion queue se guzarti hain. Raw readings sasti tarah store, per-trip aur daily summaries, aur shak wali girawat par alerts (bina ruke girawat, ya sensor fault). Reports aur dashboards summaries parhte hain.

**Q58. Control room dashboard (headquarters aur divisions) design karein.** Jawab: Latest-position store se trains ka ek live map aur table (position, speed, delay, fuel), division ke filters, stale ya off-route trains ka alerts panel, aur role-based views taake har division apna hissa dekhe aur headquarters sab.

**Q59. Bohat stations ke staff ke liye attendance management system design karein.** Jawab: Device ya app se time aur location ke saath check-in, offline capture aur baad mein sync, shift aur leave rules, manual correction sirf wajah aur approval ke saath, mukammal audit trail, aur office ke hisaab se reports. Supervisors sirf apna staff dekhte hain.

**Q60. e-inspection system design karein.** Jawab: Mobile forms checklists ke saath, time aur location wali photos, offline mode, workflow (raised, assigned, fixed, verified, closed), deadlines aur escalation, aur repeat ya overdue issues ke dashboards. Evidence tamper-resistant hona chahiye.

**Q61. Police station record aur complaint system (PSRMS/CMS) design karein.** Jawab: Role aur station ke hisaab se sakht access, sensitive data par field-level encryption, har view aur edit ka audit, retention rules, production ke bahar asal data nahi, aur integrity controls taake records chupke se badle na ja sakein.

**Q62. Helpline 117 ka support tooling design karein.** Jawab: Agents ke liye ticketing view jis mein passenger history, categories aur status, booking aur train status ke links, escalation ke saath SLAs, aur volume aur resolution time ki reports. Staff sirf wohi dekhta hai jo zaroori hai.

**Q63. Smart stations: passenger info displays aur Wi-Fi.** Jawab: Central schedule service displays ko light API ya WebSockets se updates bhejti hai, displays aakhri theek data cache karte hain aur link toote to offline notice dikhate hain. Wi-Fi sign-in aur usage data kam aur privacy ka khayal rakhne wala ho.

**Q64. Rabta app ko backend se kaise jodenge?** Jawab: Versioned REST APIs, token authentication, rate limits, pagination, train status ke liye caching, aur backward compatibility taake purane app versions chalte rahein. Updates notification service se bhejein.

**Q65. Aisa backbone kaise design karenge jo stations par kamzor connectivity mein chale?** Jawab: Maan lo link toot sakta hai: local caching, backoff ke saath retry, jahan mumkin ho edge par queues, saaf offline states, aur connection wapas aane par conflict rules ke saath sync.

**Q66. Yahan monolith ya microservices?** Jawab: Pehle modular monolith (saaf modules, ek deployable app) kyun ke team ke liye test aur chalana aasan hai. Tracking ingestion ya notifications jaise modules ko tab alag karo jab un ki scale ya team ki zaroorat alag ho.

**Q67. Qaumi system ke liye high availability aur disaster recovery.** Jawab: Load balancer ke peeche ek se ziada app servers, tested failover ke saath database replication, tested restores ke saath backups, health checks, monitoring, aur business ke saath tay RTO aur RPO wala documented disaster plan.

## H. Web ki buniyaad aur integration

**Q68. Jab passenger Rabta app kholta hai aur train search karta hai to kya hota hai?** Jawab: App HTTPS request bhejti hai, DNS aur TLS hote hain, load balancer web server ko route karta hai, PHP-FPM Laravel chalata hai, API pehle cache phir database dekhti hai, JSON wapas aata hai, aur app render karti hai.

**Q69. HTTP methods, idempotency aur status codes.** Jawab: GET parho, POST banao, PUT replace, PATCH update, DELETE hatao. GET, PUT, DELETE idempotent hain. Codes: 200, 201, 400, 401 (login nahi), 403 (ijazat nahi), 404, 409, 422, 429, 500, 503.

**Q70. Live train status ke liye REST vs WebSockets vs polling.** Jawab: Aam lookups ke liye caching ke saath REST, live control-room views ke liye WebSockets, aur kamzor networks ke liye saada short polling fallback.

**Q71. Bahar ke systems (payment, SMS, NADRA, banks) se integration kaise karte hain?** Jawab: Versioned APIs, timeouts, backoff ke saath retries, idempotency keys, signature checks ke saath webhooks, adapter layer, aur har exchange ka log. Main maanta hun ke doosri taraf slow ya band ho sakti hai.

**Q72. CORS, cookies, sessions aur tokens.** Jawab: CORS browser ka rule hai, authentication nahi. Sessions server par data rakhte hain aur cookie mein ID hoti hai. Tokens mobile aur APIs ke liye munasib hain; chhoti umar aur refresh tokens rakhein.

**Q73. Time zones aur zubanein (English/Urdu).** Jawab: UTC mein store, Asia/Karachi mein dikhao, Laravel localization, Urdu ke liye right-to-left layout, aur har jagah `utf8mb4`.

## I. QA, testing aur CI/CD (is JD ka dil)

**Q74. Is program ke liye aap ki QA strategy kya hai?** Jawab: Test pyramid: business rules ke liye bohat unit tests, kuch feature tests (routes, database, queues), key journeys (search, book, pay, cancel; inspect, fix, verify) ke liye thode end-to-end tests. Saath mein bade releases se pehle manual testing aur Railways staff ke saath UAT round. *Imaandar note:* "Main critical flows test karta hun aur code review karta hun, aur automated PHPUnit/Pest coverage mazboot kar raha hun. Is program mein paise, booking aur permission logic ke liye tests lazmi karunga."

**Q75. Waqt kam ho to pehle kya test karte hain?** Jawab: Payments, seat availability, refunds, permissions aur data exports, kyun ke yahan nakami sab se mehngi parti hai.

**Q76. Payment, SMS ya GPS systems ko call karne wala code kaise test karte hain?** Jawab: Fakes aur mocks (`Http::fake()`, `Queue::fake()`, `Mail::fake()`), saath mein chand asal integration checks ke liye sandbox environment. Tests kabhi asal paise ya asal passengers ko nahi chhoote.

**Q77. Aap ki CI pipeline kya chalati hai?** Jawab: Dependencies install, Pint (style), PHPStan/Larastan (static analysis), automated tests, aur `composer audit`. Code tabhi merge ho sakta hai jab sab pass hon.

**Q78. Safe release aur rollback bayan karein.** Jawab: Ek baar build, staging par deploy, smoke test, khamosh waqt mein production deploy, migrations safely chalana, errors aur metrics dekhna, rollback tayyar rakhna. Database changes expand-then-contract tareeqe se.

**Q79. Government stakeholders ke saath UAT kaise karte hain?** Jawab: Saada zubaan mein test scenarios tayyar, asal users ke saath staging par masked data par chalana, issues record, fix aur dobara test, aur go-live se pehle likhit sign-off.

**Q80. Management ko quality ki tracking aur reporting kaise karte hain?** Jawab: Severity ke hisaab se bug counts, escaped defects (production mein mile), test pass rate, critical modules par coverage, mean time to fix, release failure rate. Metrics behtari ke liye hain, logon ko qusoorwaar thehrane ke liye nahi.

**Q81. Severity vs priority.** Jawab: Severity asar hai (booking na ho paye to critical). Priority hai kitni jaldi theek karna hai. Home page ka typo kam severity lekin launch se pehle high priority ho sakta hai.

**Q82. Achha code review kya hota hai?** Jawab: Requirement poori, parhne mein saaf, secure, tests maujood, N+1 ya bhaari queries nahi, error handling, safe migrations. Chhote pull requests, khaas aur narm comments, aur checklist.

## J. Docker, environments aur operations

**Q83. Multi-vendor program ke liye Docker kya masla hal karta hai?** Jawab: Sab ek jaisa environment chalate hain, to "mere machine par chalta hai" khatam. Naye developers aur vendor teams jaldi shuru karte hain, aur staging production jaisa hota hai.

**Q84. Containers mein Laravel ka aam stack.** Jawab: Nginx, PHP-FPM, MySQL, Redis, queue worker ya Horizon, scheduler, aur local mein Mailpit. Docker Compose inhein service name se jorta hai.

**Q85. Container baar baar restart ho raha hai. Debug kaise karenge?** Jawab: `docker ps -a`, `docker logs`, exit code dekhein, missing environment variables, ghalat database host, permissions, port conflicts, aur kya database tayyar tha ya nahi.

**Q86. Docker vs Kubernetes, imaandari se.** Jawab: Docker aur Compose meri amali taqat hain. Kubernetes concept ki had tak jaanta hun (scaling, self-healing, rolling updates) aur program ko jaise zaroorat ho seekh loonga.

**Q87. Dev, staging aur production alag kaise rakhte hain?** Jawab: Same versions, alag secrets aur databases, production ke bahar masked data, aur dev mein asal personal data nahi. Config environment variables ya vault se aati hai.

**Q88. Kaun si monitoring aur alerts lagate hain?** Jawab: Application errors, response time, queue length, failed jobs, database load aur slow queries, disk space, aur "data aana band" alerts (jaise GPS pings nahi aa rahi). Un cheezon par alert jo users mehsoos karein, sirf CPU par nahi.

**Q89. Runbook kya hai?** Jawab: Maloom masle (queue atki, database full, GPS feed band) ke liye chhoti step-by-step guide taake koi bhi on-call banda kaam kar sake. Har asal incident ke baad ek likhta hun.

**Q90. On-call aur incident response kaise sambhalte hain?** Jawab: Acknowledge, asar ka andaza, nuqsan roko (rollback, feature band), status batao, wajah theek karo, aur chhoti report likho: kya hua, kyun, humne kya badla.

## K. Security

**Q91. OWASP Top 10: bare khatre aur un ka hal.** Jawab: Broken access control (policies, ownership checks), injection (bindings), XSS (output escape, CSP), CSRF (tokens), kamzor authentication (MFA, lockouts), data ka khul jana (TLS, encryption), purane components (`composer audit`), misconfiguration (debug band), aur kamzor logging.

**Q92. CNIC, phone numbers aur travel history ki hifazat kaise karte hain?** Jawab: Sirf zaroori data lena, transit mein TLS, sensitive fields rest par encrypt, logs aur non-production mein mask, role ke hisaab se access mehdood, kis ne dekha ya export kiya uska record, aur retention rules par amal.

**Q93. Bari organization mein andar se ghalat istemal kaise rokte hain?** Jawab: Least privilege, role aur region scoping, views aur exports ka audit log, ghair-mamooli bulk access par alerts, aur baqaida access reviews. Jaane wale staff ka access foran band.

**Q94. Mobile apps aur doosre departments ke istemal wali APIs ko secure kaise karte hain?** Jawab: Token authentication, har resource par authorization, validation, rate limiting, sirf HTTPS, signed webhooks, aur URLs mein secrets nahi.

**Q95. Secrets management.** Jawab: Environment variables ya secrets manager, Git mein kabhi nahi, har environment ki alag keys, staff badalne ya leak par rotate. Agar secret commit ho jaye to foran rotate karein.

**Q96. Shak ho ke data breach hua hai to kya karenge?** Jawab: Contain karein (keys revoke, access band), logs mehfooz, scope maloom, suraakh band, security team aur management ko procedure ke mutabiq batayen, aur lessons learned likhein. Saboot kabhi na mitayen.

**Q97. Inspection photos jaise uploads ko secure kaise karte hain?** Jawab: Asal file type aur size check, naam badlo, web root ke bahar rakho, zaroorat par scan, uploads kabhi execute nahi, aur expiring private links se do.

## L. Performance aur scaling

**Q98. Page slow hai. Kahan se shuru karte hain?** Jawab: Pehle measure: network, server time, database, external API ya front end. Browser tools, Debugbar/Telescope, slow query log. Sab se bari cheez theek karo, phir dobara measure.

**Q99. Eid ticket booking jaise peak dinon ke liye tayyari kaise karte hain?** Jawab: Asal flows par k6 ya JMeter se load test, web servers horizontally barhao, read-heavy pages cache, slow kaam queue mein, database connection limits, waiting room, aur booking se pehle ghair-zaroori features band.

**Q100. Cache invalidation ke masle.** Jawab: Stale data aur bohat saari requests ka ek saath rebuild karna. Main chhoti expiry, change par key clear, versioned keys aur locks istemal karta hun. Seat availability ka cache bohat chhota rakhta hun aur payment par aakhri database check karta hun.

**Q101. Database scaling ke steps tarteeb se.** Jawab: Queries aur indexes theek, cache, read replicas, purana data archive ya partition, aur sab se aakhir mein sharding. Infrastructure barhane se pehle optimize karo.

## M. Cross-check scenarios (zor se bol kar practice karein)

1. **Control room mein train 30 minute se ek hi jagah dikh rahi hai.** Dekhein ke pings band hain (device, network, ingestion queue, worker) ya sirf dashboard stale hai. Stale data label karein aur operators ko alert dein.
2. **Attendance mein ek station ka poora staff ek din ghair-hazir.** Pehle network outage aur late sync, time zone ki ghalti, ya deployment issue dekhein, staff ko qusoorwaar thehrane se pehle. Theek karein, dobara process karein, alert lagayen.
3. **API badalne ke baad Rabta app crash.** Purane app versions support nahi the. Rollback, API versioning, aur contract tests.
4. **Ek hi SMS ticket teen baar gaya.** Job timeout ke baad retry hui. Job ko sent flag ya unique key se idempotent banayen.
5. **Booking rush mein payment provider band.** Saaf paigham dikhayen, seats hold rakhein, confirmations queue karein, backoff se retry, aur baad mein reconcile.
6. **Fuel report mein na-mumkin consumption.** Sensor data quality, unit conversion, duplicate readings aur time zones dekhein. Shak wala data chupke se average mein na milayen, flag karein.
7. **Migration ne live database slow kar diya.** Roken ya throttle karein, online change tool par le jayen, batches mein chalayen, aur migration review rule lagayen.
8. **Vendor ki API bina batay format badal deti hai.** Adapter layer, response validation, failure par alerts, aur agreed versioned contracts. (Aapki HOLOIN Python service ki kahani.)
9. **Senior officer do din mein naya feature maangta hai.** Dikhayen ke kya safely ho sakta hai, kya risky hai, aur scope likhit mein tay karein.
10. **Junior ne secret Git mein push kar diya.** Rotate karein, hatayen, access logs dekhein, aur CI mein secret scanning lagayen.
11. **Database disk lagbhag full.** Bari tables (shayad GPS history) dhoondein, retention policy se archive, binary logs aur backups dekhein, phir alerts lagayen.
12. **Production mein defect pohncha aur manager poochta hai QA se kaise chhoot gaya.** Pur-sukoon aur haqeeqat par rahein: wajah, fix, prevention (naya test, checklist item, CI check). Process theek karein, kisi ko qusoorwaar na thehrayen.

## N. Team lead aur delivery

**Q102. Bare program mein kaam ka estimate kaise lagate hain?** Jawab: Chhote tasks, har ek ki range, testing aur review ka waqt, pichle milte-julte kaam se muqabla, aur anjaan cheezon ke liye buffer. Haqaiq badlein to estimate update karta hun.

**Q103. Sprints kaise chalate hain?** Jawab: Acceptance criteria ke saath planning, blockers par chhote daily check-ins, demo, aur retrospective jis mein ek ya do asal behtariyan tay hon.

**Q104. Aap ki Definition of Done.** Jawab: Reviewed, tests pass, koi naya critical warning nahi, jahan zaroori documented, staging par deploy, acceptance criteria se check, aur owner ki manzoori.

**Q105. Doosre departments ya vendors par dependencies kaise manage karte hain?** Jawab: Owner aur date ke saath risk list, blockers jaldi escalate, doosri taraf tayyar hone tak mocks, aur likhit agreements.

**Q106. Badalte staff wale 3 saal ke program ke liye documentation kaise karte hain?** Jawab: README aur setup guide, API docs (OpenAPI/Postman), chhote decision records, aur runbooks. Documentation code ke paas rehti hai aur usi pull request mein update hoti hai.

**Q107. Module Railways IT staff ko hawale kaise karte hain?** Jawab: Training sessions, runbook, monitoring dashboards, maloom issues ki list, aur support period jis mein main sawalon ke jawab deta hun. Module tab mukammal hai jab un ki team ise chala sake.

## O. Rapid-fire

- **Idempotent?** Dobara karne se wohi result.
- **Stateless app?** Requests ke beech server par user ki state nahi.
- **401 vs 403?** Login nahi vs ijazat nahi.
- **Race condition?** Natija timing par depend karta hai; locks ya atomic updates se theek.
- **Soft delete?** Hatane ke bajaye deleted mark karna, restore aur audit ke liye.
- **Webhook?** Koi aur system kuch hone par aap ke URL ko call karta hai.
- **Reverse proxy?** App ke aage ka server jo requests aage bhejta hai aur cache aur TLS sambhal sakta hai.
- **RTO vs RPO?** Bahal hone ka waqt vs data jo kho dene ka bardasht ho.
- **SLA vs SLO?** Customer se wada vs andarooni target.
- **Blue/green?** Do environments; traffic purane se naye par badlein.
- **Canary release?** Pehle chhote hisse ke users ko naya version dein.
- **Technical debt?** Jaldi ke faislay jo baad mein tabdeeli slow karte hain.
- **Heartbeat?** Device ka regular "main zinda hun" signal; gum heartbeat par alert.
- **Backpressure?** System na sambhal sake to input ko slow ya buffer karna, crash na hona.
- **Dead-letter queue?** Wo jagah jahan baar baar fail hone wale jobs jate hain taake un ko dekha ja sake.

## P. Aap ko un se kaun se sawal poochne chahiyein

1. Har module kis phase mein hai, aur mujh se kin modules ki ownership ki umeed hai?
2. Technology stack aur hosting kya hai (apna data center, cloud, PITB)?
3. PITB aur Railways IT teams kaise organized hain, aur launch ke baad operations kis ke zimme hain?
4. Aaj kaun sa testing aur CI process maujood hai?
5. Stations aur field mein connectivity ki kya hudood hain?
6. Uptime aur peak-load ki kya umeedein hain, maslan Eid ke booking dinon mein?
7. Pehle chhe mahine mein kamyabi kaisi dikhegi?

## Q. Imaandar gaps ke jawab (yaad karein)

- **Government ya Railways ka tajurba:** "Seedha nahi. Mera tajurba bare multi-tenant aur high-volume platforms ka hai. Reliability, security, audit trails aur delivery tracking yahan bhi wesey hi ahem hain, aur main domain rules business team se jaldi seekh leta hun."
- **Automated testing:** "Main critical flows test aur code review karta hun, aur automated coverage barha raha hun. Yahan booking, payment aur permission logic ke liye tests lazmi karunga aur CI mein chalaunga."
- **BI tools:** "Maine data wala hissa banaya hai. Program jo BI tool istemal kare wo seekh loonga."
- **Kubernetes:** "Amali tor par Docker aur Compose, Kubernetes concept ki had tak, aur zaroorat par seekh loonga."
- **Program ki details:** "Maine public announcements parhi hain. Main jaanna chahunga ke aaj har module kahan khara hai."

## R. Mock interview ki tarteeb (30 minute)

1. Q1, Q4, Q5 (delivery aur quality).
2. Q34, Q55 (data model aur real-time tracking).
3. Q56 aur is ke cross-questions (booking aur payments).
4. Q74 se Q78 (QA aur CI/CD).
5. Q92, Q93 (security).
6. Section M se do scenarios ittefaq se chunein.
7. Section P se aap ke teen sawal.

Har jawab do minute mein, zor se bol kar dein.

# Part 2: Database, Big Data, Data Security, Scopes, Scenarios, Tricky aur Concept sawal

Yeh hisse upar ki guide ko barhate hain. Numbering Q107 se aage chalti hai.

## S. MySQL gehra jaiza (database ke sawal)

**Q108. InnoDB mein clustered index kya hai aur kyun ahem hai?** Jawab: InnoDB mein table khud primary-key ki tarteeb mein store hoti hai. Har secondary index mein primary key ki value bhi hoti hai. To bara primary key har index ko bara aur slow bana deta hai.

**Q109. Kya random UUID achha primary key hai?** Jawab: Aam tor par nahi. Random values B-tree mein har jagah insert hoti hain, jis se page splits aur slow writes hote hain, aur har secondary index bara ho jata hai. Main BIGINT auto-increment ko tarjeeh deta hun, ya agar public ID chahiye to ordered ID (ULID ya UUIDv7).

**Q110. EXPLAIN kaise parhte hain?** Jawab: `type` dekhein (behtar se kharab: const, eq\_ref, ref, range, index, ALL), `key` (asal mein kaun sa index use hua), `rows` (andazan scan hui rows) aur `Extra`. Bari table par `ALL` ka matlab full scan. `Using filesort` aur `Using temporary` khatre ki nishaniyan hain.

**Q111. Kya `is_active` (haan/nahi) jaise column par index lagana chahiye?** Jawab: Akele aam tor par nahi. Kam cardinality ka matlab index aadhi table se match karta hai, to MySQL aksar use ignore kar deta hai. Composite index ka hissa ho to kaam ka hai, jaise `(station_id, is_active)`.

**Q112. WHERE ka index hone ke bawajood ORDER BY slow kyun ho sakta hai?** Jawab: Index ko filter aur sort dono sambhalne chahiyein. `(station_id, created_at)` jaisa composite index `WHERE station_id = ? ORDER BY created_at` ko serve karta hai. Pehle column par range condition baad ke columns ki sort order tor deti hai.

**Q113. Bari InnoDB table par `COUNT(*)` slow kyun hota hai?** Jawab: MVCC ki wajah se InnoDB row count store nahi karta, usay rows ginni parti hain. Bari tables ke liye counter ya summary table rakhta hun, display ke liye andazan count, ya sirf filtered indexed range ginta hun.

**Q114. MySQL tables ko kaise join karta hai aur joins tez kaise banate hain?** Jawab: Nested-loop joins, aur naye MySQL 8 versions mein hash joins. Dono taraf join columns par index, same data type par join, pehle filter, aur sirf zaroori columns select.

**Q115. Window functions kya hain? Misaal dein.** Jawab: Yeh related rows par hisaab karte hain bina GROUP BY ki tarah rows ko samet'e. Misaal, har train ka latest ping: `SELECT * FROM (SELECT p.*, ROW_NUMBER() OVER (PARTITION BY train_id ORDER BY pinged_at DESC) rn FROM pings p) x WHERE rn = 1`. Baqi: RANK, DENSE\_RANK, SUM OVER se running totals.

**Q116. CTE aur recursive CTE kya hain?** Jawab: CTE naam wali sub-query hai (`WITH ... AS`) jo lambi queries ko parhne ke qabil banati hai. Recursive CTE hierarchies par chalta hai, jaise Headquarters, Division, Station, Staff.

**Q117. Views vs stored procedures vs triggers: aap ki raaye?** Jawab: Views sirf-parhne wale shortcuts aur reports ke liye theek hain. Stored procedures logic ko code review aur version control se door chhupa dete hain, to business rules ke liye bachta hun. Triggers chhupe hue side effects dete hain, to sirf tang kaam jaise audit rows ke liye rakhta hun aur document karta hun.

**Q118. Table partitioning kya hai aur kab istemal karenge?** Jawab: Ek bari table ko hisson mein baantna, aksar date range se. Date par filter karne wali queries sirf zaroori partitions chhoo'ti hain (pruning), aur purana data partition drop karke tez hata sakte hain. MySQL mein partition column har unique key ka hissa hona chahiye. GPS aur log history ke liye istemal karunga. *Cross-question: Partitioning vs sharding?* Jawab: Partitioning ek server ke andar table baantta hai. Sharding data ko servers mein phailata hai aur bari complexity laata hai, is liye sab se aakhir mein.

**Q119. Gap locks aur next-key locks kya hain?** Jawab: REPEATABLE READ mein InnoDB sirf rows nahi, index ranges bhi lock karta hai taake phantom rows na aayein. Is se range mein inserts block ho sakte hain aur ajeeb waits aur deadlocks ho sakte hain. Chhoti transactions aur sahi indexes masle ko kam karte hain.

**Q120. MVCC kya hai?** Jawab: Multi-Version Concurrency Control. Readers data ka consistent snapshot dekhte hain aur writers ko block nahi karte, kyun ke purane row versions rakhe jate hain. Isi liye lambi transactions nuqsandeh hain: wo purane versions ko zinda rakhti hain.

**Q121. `FOR UPDATE SKIP LOCKED` kis kaam aata hai?** Jawab: Worker agli unlocked row le leta hai aur doosre workers ki pakri hui rows chhod deta hai. Saadi job-queue tables ya bohat workers mein tasks baantne ke liye mufeed hai bina ek doosre ko block kiye.

**Q122. Deadlock ki tehqeeq kaise karte hain?** Jawab: `SHOW ENGINE INNODB STATUS` aakhri deadlock aur shamil queries dikhata hai. Fix: rows ko ek hi tarteeb mein lock karo, transactions chhoti, sahi index, aur deadlock par transaction retry.

**Q123. MySQL replication aur us ke khatre samjhayen.** Jawab: Primary binary log likhta hai aur replicas use dobara chalate hain. Default mein asynchronous hai, to replicas peeche reh sakti hain, aur failover mein aakhri chand transactions kho sakti hain. Main lag monitor karta hun, critical taaza data replica se nahi parhta, aur failover test karta hun.

**Q124. PHP har request par nayi connection kholta hai. MySQL ko kaise bachate hain?** Jawab: Munasib `max_connections`, requests chhoti, persistent connections ehtiyat se, ya aage ProxySQL jaisa pooler. Peak load mein connection spikes par nazar.

**Q125. InnoDB buffer pool kya hai?** Jawab: Data aur index pages ki memory cache. Dedicated database server par aam tor par RAM ka bara hissa (aksar 60 se 70 percent). Achha hit rate sab se bari muft performance jeet hai.

**Q126. Paison ke liye FLOAT ke bajaye DECIMAL kyun?** Jawab: FLOAT andazan hota hai, to totals mein baareek farq aa jata hai. DECIMAL durust hota hai. Ya main paise integer paisa mein store karta hun.

**Q127. DATETIME vs TIMESTAMP?** Jawab: TIMESTAMP UTC mein store hota hai, session time zone se convert hota hai, aur saal 2038 par khatam. DATETIME ki range bari hai aur khud ba khud conversion nahi. Main hamesha UTC store karta hun aur application mein convert karta hun.

**Q128. Kya JSON columns istemal karne chahiyein?** Jawab: Lachakdar, kam filter hone wale extras ke liye (device settings, form answers). Aise data ke liye nahi jis par aksar filter, join ya report ho. Filter karna ho to indexed generated column lagata hun.

**Q129. Bari scale par foreign keys: haan ya nahi?** Jawab: Core transactional data ke liye haan: yeh integrity bachate hain. Bahut bari append-only tables (pings, logs) mein write speed ke liye aksar nahi, aur rules application aur ingestion checks mein lagata hun.

**Q130. Soft deletes aur unique columns: kya ghalat hota hai?** Jawab: Deleted row ab bhi unique value pakarti hai, to user dobara register nahi kar sakta. Fix: aisi unique key jis mein deleted marker shamil ho, ya purana record restore karne ka faisla.

**Q131. Normal forms saada alfaz mein.** Jawab: 1NF: ek column mein ek value, repeating groups nahi. 2NF: har column poori key par depend kare. 3NF: koi column kisi aur non-key column par depend na kare. Main 3NF par rukta hun, phir parhne ki raftaar ke liye jaan boojh kar denormalize karta hun.

**Q132. Woh SQL tasks jo aap ko kaghaz par likhne aane chahiyein.**

- Doosri ya N-th sab se bari value: `SELECT DISTINCT salary FROM t ORDER BY salary DESC LIMIT 1 OFFSET N-1` ya `DENSE_RANK()`.
- Duplicates dhoondna: `SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1`.
- Duplicates hatana, sab se chhota id rakhna: self join `DELETE a FROM users a JOIN users b ON a.email = b.email AND a.id > b.id`.
- Har group ki latest row (Q115 dekhein) aur `ROW_NUMBER()` se har group ke top 3.
- Jin customers (ya trains) ki koi matching rows nahi: `LEFT JOIN ... WHERE b.id IS NULL`.
- Running total: `SUM(amount) OVER (ORDER BY date)`.

## T. Big data aur bari scale par data

**Q133. Big data kya hai, aur kya hamare program ka data "bara" hai?** Jawab: Big data aam tor par volume, velocity aur variety ko kehte hain jo ek aam database ya tool aaraam se na sambhal sake. Bohat si trains ke GPS pings aur sensor readings, aur saalon ki ticket history bari aur tez ho sakti hain. Main hype ke liye "big data" nahi kahunga; pehle measure karunga aur sab se saada tool chunoonga jo kaam kare.

**Q134. Storage aur load ka andaza kaise lagate hain?** Jawab: Farzi numbers ki misaal: 2,000 devices har 10 second mein ping karein to 200 pings per second, takreeban 1.7 crore rows roz. Taqreeban 100 bytes ki row ho to roz kareeban 1.7 GB, saal mein kareeban 630 GB raw, indexes se pehle. Is se maloom hota hai ke partitioning, retention aur summaries pehle din se chahiyein. (Asal numbers milen to wohi lagayen.)

**Q135. Hot, warm aur cold data kya hain?** Jawab: Hot: taaza data jo musalsal istemal ho (aakhri chand din), tez storage par. Warm: pichle mahine, kabhi kabhi query. Cold: qanoon ya audit ke liye purana data, sasti object storage mein compress. Retention policy data ko inke beech le jati hai.

**Q136. Downsampling ya roll-up kya hai?** Jawab: Raw readings thode waqt ke liye rakho, phir chhoti summaries store karo: per minute, per hour, per day. Pichle saal ke dashboards daily summaries parhte hain, arbon raw rows nahi.

**Q137. Batch vs stream processing?** Jawab: Batch data ko schedule par groups mein process karta hai (raat ki reports). Stream har event ko aate hi process karta hai (live alerts, live map). Operational alerts ke liye streaming aur bhaari reports ke liye batch.

**Q138. Kaun sa queue ya messaging tool, aur kaise chunte hain?** Jawab: Saadi, tez jobs ke liye Redis queues ya Redis Streams. Bharosemand routing aur acknowledgements ke liye RabbitMQ. Bohat high-volume event streams jinhein kai consumers dobara parhein un ke liye Kafka. Imaandar note: meri amali taqat Redis queues hain; Kafka concept ki had tak jaanta hun aur volume ki zaroorat tak add nahi karunga.

**Q139. Data lake vs data warehouse vs data mart?** Jawab: Lake: kai formats mein raw data, sasti storage. Warehouse: saaf, structured data jo analysis ke liye ho. Mart: ek team ke liye chhota warehouse hissa (jaise finance ya operations).

**Q140. Columnar ya OLAP store kya hai, aur kab chahiye?** Jawab: Data column ke hisaab se store karta hai, to arbon rows par chand columns parhne wali analytical queries bohat tez hoti hain (ClickHouse ek misaal). Sirf tab dekhunga jab MySQL ki summary tables reports ko tez na rakh sakein.

**Q141. GPS pings ke liye MySQL, MongoDB ya time-series database?** Jawab: Darmiyani volume par date partitions wala MySQL achha chalta hai aur ek hi technology rehti hai. MongoDB lachakdar event documents aur aasan horizontal scaling ke liye. Time-series database built-in retention aur roll-ups deta hai. Main wo chunoonga jo team achhe se chala sake, aur latest-position record har soorat mein alag rakhunga.

**Q142. Shard key kya hai, aur hot shard kya hai?** Jawab: Shard key tay karti hai ke row kis server par jaye. Ghalat key (jaise aaj ki date) tamam naye writes ek shard par bhej deti hai, jo hot shard ban jata hai. Achhi key load barabar baanti hai, maslan device ID ka hash.

**Q143. CAP theorem aur eventual consistency samjhayen.** Jawab: Network toot'e to distributed system ko consistency (sab ko wohi data dikhe) aur availability (hamesha jawab de) mein se ek chunni parti hai. Eventual consistency ka matlab copies thode waqt ke liye alag ho sakti hain phir mil jati hain. Live map eventually consistent ho sakta hai; seat booking nahi.

**Q144. Late, duplicate aur out-of-order data kaise sambhalte hain?** Jawab: Har event ko unique key do (device ID plus timestamp), insert-ignore ya upsert se duplicates beezarar, device time aur received time dono store, aur live view tabhi update karo jab event store hue se naya ho.

**Q145. Sensor aur GPS data ki quality kaise achhi rakhte hain?** Jawab: Ranges validate (speed, coordinates, fuel level), na-mumkin jumps flag, gum data ko andaza lagane ke bajaye missing mark, raw data ko na chhedna, aur har device ki data-quality percentage report taake kharab devices theek hon.

## U. Data security aur privacy

**Q146. Encryption in transit, at rest aur field-level: samjhayen.** Jawab: In transit: tamam hisson ke beech TLS, database tak bhi. At rest: disk ya database encryption churaye hue disks aur backups se bachati hai. Field-level: app khud bohat sensitive fields (CNIC, phone) encrypt karti hai, maslan Laravel ke `encrypted` cast se, to database admin bhi unhein aaram se nahi parh sakta.

**Q147. Hashing vs encryption vs encoding?** Jawab: Hashing ek-tarfa hai (passwords, bcrypt ya Argon2 se). Encryption key ke saath do-tarfa hai (CNIC). Encoding (Base64) sirf format ki tabdeeli hai aur koi security nahi deti.

**Q148. Encrypted field mein search kaise karte hain?** Jawab: Normalize ki hui value ka alag keyed hash (blind index) store karta hun aur exact match us par search karta hun. Encrypted data par partial search mushkil hai, to usay mehdood karta hun ya sirf non-sensitive fields mein search karta hun.

**Q149. Masking, tokenization, pseudonymization, anonymization?** Jawab: Masking value ka hissa chhupata hai (`***-***-1234`). Tokenization value ko random token se badalta hai jo mehfooz vault mein rehta hai. Pseudonymization shanakht ko ID se badalti hai lekin extra data se wapas ho sakti hai. Anonymization insaan se link hamesha ke liye khatam kar deti hai. Test aur analytics mein masked ya pseudonymized data istemal karta hun.

**Q150. Database users kaise set karte hain?** Jawab: Least privilege. App user sirf apni tables parh aur likh sakta hai, drop ya alter nahi. Schema changes ke liye alag migration user. BI ke liye sirf-parhne wala reporting user. Shared accounts nahi, aur remote root access nahi.

**Q151. Kya Eloquent ke saath SQL injection ho sakta hai?** Jawab: Haan, raw methods mein aur un dynamic hisson mein jo bind nahi ho sakte, jaise user input se aaye column names ya `ORDER BY` direction. Main allowed columns aur directions ki whitelist rakhta hun, user ka text seedha query mein nahi dalta.

**Q152. Mass assignment ka khatra kya hai?** Jawab: User extra fields bhejta hai (jaise `is_admin`) aur `Model::create($request->all())` unhein save kar deta hai. `$fillable`, sirf validated data (`$request->validated()`), aur raw request data kabhi pass nahi karna.

**Q153. Audit log ko tamper-evident kaise banate hain?** Jawab: Append-only table, app user ko update ya delete ke haqooq nahi, aur chaho to har row ko pichli row ke hash se jodo taake tabdeeli pakri jaye. Copies alag system mein bhejein.

**Q154. Personal data kahan se bina kisi ko pata chale leak hota hai?** Jawab: Logs, error reports, analytics tools, email mein exports, backups, test databases aur screenshots. Main logs mein mask, exports par pabandi, backups encrypt karta hun, aur production data dev mein kabhi copy nahi karta.

**Q155. Secure data export kaise design karte hain?** Jawab: Sirf authorized roles ke liye, user ke apne scope tak, row aur time limits, expiring download links, kis ne kya export kiya us ka record, aur sensitive columns default mein hata ya mask.

**Q156. Doosre department ya vendor ke saath data mehfooz tareeqe se kaise share karte hain?** Jawab: Sirf wohi jo zaroori ho, apni credentials aur mehdood scope wali API se, database dump se nahi. Har access log, maqsad aur retention likhit mein tay, aur jahan shanakht zaroori nahi wahan masked data.

**Q157. Database server ko harden kaise karte hain?** Jawab: Internet par khula nahi (sirf private network), TLS on, mazboot unique passwords, anonymous ya remote root nahi, baqaida patching, gair-zaroori features band, tested backups, aur ghair-mamooli queries aur logins par monitoring.

**Q158. Ransomware aur ghalti se delete se kaise bachte hain?** Jawab: Baqaida backups jo main network se door aur immutable hon (ek muddat tak badle ya mitaye nahi ja sakte), tested restores, least-privilege access, aur user data ke liye recovery window wale soft deletes.

**Q159. Data protection laws aur policy par aap kya kehte hain?** Jawab: Imaandar jawab: "Main usool follow karta hun: sirf zaroori cheez lena, wajah batana, hifazat karna, sirf zaroori muddat tak rakhna, aur sirf un ko access dena jinhein zaroorat hai. Main program ki apni policy aur wo qanooni rules follow karunga jo department tasdeeq kare." Kisi khaas qanoon ka hawala tab tak na dein jab tak yaqeen na ho.

## V. Laravel scopes aur Eloquent ke sawal

**Q160. Local scope kya hai?** Jawab: Model par reusable query ka tukra, jaise `scopeActive` jo `Ticket::active()->get()` ki tarah chalta hai. Filters ek jagah rehte hain aur parhna saaf hota hai. Naye Laravel versions mein `scope` prefix ke bajaye method par scope attribute bhi lag sakta hai, to team ka version check karein.

**Q161. Global scope kya hai aur kab istemal karte hain?** Jawab: Aisi scope jo model ki har query par khud ba khud lagti hai, maslan soft deletes, ya tenant ya division filter. Yeh taqatwar hai kyun ke koi bhool nahi sakta, aur yehi is ka khatra bhi hai.

**Q162. Global scopes ke khatre kya hain?** Jawab: Inhein `withoutGlobalScopes()` se bypass kiya ja sakta hai, `DB::table()` ya raw SQL par nahi lagtin, joins aur relationship queries mein hairan kar sakti hain, queue jobs aur console commands mein (jahan logged-in user nahi) alag chalti hain, aur logic parhne wale se chhupa deti hain. Main aise tests likhta hun jo sabit karein ke user doosri division ka data nahi parh sakta.

**Q163. Division scoping ki misaal dikhayen.** Jawab: `DivisionScope` aam staff ke liye `where('division_id', auth()->user()->division_id)` lagata hai, aur headquarters roles ise chhod dete hain. Jobs mein main `auth()` par bharosa nahi karta, division saaf tor par pass karta hun.

**Q164. Scopes vs repository vs query object?** Jawab: Chhote reusable filters ke liye scopes. Complex, multi-step ya cross-model queries aur reporting ke liye query objects ya repositories. Jo layers chahiyein nahi wo nahi lagata.

**Q165. `whereHas` vs join: kaun sa tez hai?** Jawab: `whereHas` subquery use karta hai aur saaf hai, lekin bari tables par achhe indexes ke saath join ya `whereExists` tez ho sakta hai. EXPLAIN se check karke naap ke natije par chunta hun.

**Q166. Loop ke andar update karne par `chunk()` rows kyun chhor ya dohra sakta hai?** Jawab: Agar chunking ke dauran filter ya ordering wala column badal jaye to offset ki hudood khisak jati hain. Updates ke liye `chunkById()` (ya `lazyById()`) istemal karein kyun ke yeh primary key se pages banata hai.

**Q167. Kya `firstOrCreate` ya `updateOrCreate` concurrency mein safe hain?** Jawab: Khud nahi. Do requests dono kuch nahi paa kar dono insert kar sakti hain. Unique constraint lagayen, duplicate-key error sambhalen, ya `upsert` istemal karein. Uniqueness database ko enforce karni chahiye.

**Q168. Transaction ke andar job dispatch hui aur record nahi mila. Kyun?** Jawab: Worker transaction commit hone se pehle shuru ho gaya. Commit ke baad dispatch karein (`afterCommit`, ya `after_commit` queue setting) taake job chalne tak data maujood ho.

**Q169. Bulk update par mera observer kyun nahi chala?** Jawab: Query builder se mass updates aur deletes model events chhor dete hain kyun ke koi model instance load nahi hota. Jahan events zaroori hon wahan model-level updates istemal karein, ya audit step saaf tor par likhein.

**Q170. Lazy-loading aur doosri Eloquent ghaltiyan jaldi kaise pakadte hain?** Jawab: Non-production mein `Model::preventLazyLoading()` aur strict mode, jo lazy loading, missing attributes aur chupke se chhor di gayi fills par error deta hai. Is se N+1 masle tests mein nazar aane wali failures ban jate hain.

**Q171. Karoron rows tez kaise insert karte hain?** Jawab: Chand hazar ke batches mein bulk `insert()` ya `upsert()`, har batch ke liye ek transaction, kam indexes, aur queued job se. Loop mein `create()` slow hai kyun ke events aur har row ki ek query hoti hai.

**Q172. Counter ko safely kaise barhate hain?** Jawab: `increment()` atomic `UPDATE ... SET count = count + 1` chalata hai. Parh kar PHP mein jama karke save karna concurrency mein lost updates deta hai.

## W. Scenario-based sawal (database aur data)

1. **Dashboard query pichle saal tez thi, ab slow hai.** Data barh gaya. EXPLAIN, missing ya badla hua index, naya bhaari filter aur table size dekhein. Behtar index, summary table, ya purani rows archive karein.
2. **Report mein ek train ki 5 saal ki GPS history chahiye.** Poori table scan na karein. Index aur partition pruning se (train\_id, time range) par query, chunks mein queued job se export, aur link email karein.
3. **Database CPU roz subah 9 baje 100 percent ho jata hai.** Slow query log aur process list se wajah dhoondein: scheduled report, ek saath expire hone wala cache, ya login-time queries. Jobs ko waqt mein alag karein, cache locks lagayen, reports replica par le jayen.
4. **Do admins ek hi record edit karte hain aur ek ki tabdeeli kho jati hai.** Optimistic locking (version ya updated\_at check) aur saaf conflict message.
5. **Replica 10 minute peeche hai.** Primary par lambi transactions ya bhaari write job dhoondein, throttle karein, us replica se taaza data parhna band karein, aur lag alerts lagayen.
6. **Retention muddat ke baad personal data delete karna hai.** Scheduled, logged purge batches mein, bina personal data ke deletion ka audit saboot, aur pehle staging par test.
7. **Developer debug ke liye production database dump maangta hai.** Raw dump se inkar. Masked copy ya jhoote data par reproduction dein, aur darkhwast log karein.
8. **30 crore rows wali table mein naya column chahiye.** Online schema change tool, ya nullable column aur batches mein backfill, rollback plan aur khamosh waqt ke saath.
9. **Kisi ne production mein WHERE ke baghair UPDATE chala diya.** Zaroorat ho to writes roken, backup ya point-in-time recovery se copy par restore karein, mutasir rows theek karein, phir safeguards: production access mehdood, manual queries ka review, aur safe-updates setting.
10. **Passenger ke naam se search slow hai.** `LIKE '%name%'` index istemal nahi kar sakta. Prefix search, full-text index, ya zaroorat par OpenSearch jaisa search engine.
11. **Summary table ki counts raw table se nahi miltin.** Time zones, late-aane wala data, cancelled rows aur job failures compare karein. Mutasir dinon ki summary dobara banayen aur reconciliation check lagayen.
12. **Vendor system roz raat 50 lakh records bhejta hai.** Staging table, validate, batches mein load, asal tables mein upsert, counts log, aur poora job dobara chalane ke liye safe.

## X. Tricky aur "lines ke beech" ke sawal

Yeh sawal saade lagte hain, lekin interviewer imaandari, faislay ki salahiyat, akhlaq ya rawaiye ko parakh raha hota hai. Har sawal ke saath likha hai ke wo asal mein kya check kar raha hai.

**Q173. "Aap coding ko tarjeeh dete hain ya logon ko manage karne ko?"** Parakh: kya aap delivery-owner role ke liye dono kar sakte hain. Jawab: "Mujhe dono pasand hain. Mushkil hisson par khud code karta hun aur quality oonchi rakhta hun, aur planning, review aur dusron ke masle hal karke lead karta hun."

**Q174. "Ek senior officer kehta hai database mein seedha data badal do, koi record na rakho."** Parakh: integrity aur akhlaq. Jawab: "Main chupke se data edit nahi karunga. Likhit darkhwast maangunga, controlled aur logged correction approval ke saath karunga, aur samjhaunga ke audit trail sab ki hifazat karta hai, us officer ki bhi."

**Q175. "Ek dost kisi ka ticket ya personal record dekhne ko kehta hai."** Parakh: data ka akhlaq. Jawab: "Nahi. Access sirf kaam ke maqsad ke liye hai aur har view log hota hai. Main official channel ka mashwara dunga."

**Q176. "Minister ke demo se pehle bug mila. Kya aap batayenge?"** Parakh: dabao mein imaandari. Jawab: "Ji haan, apne manager ko foran, risk aur safe plan ke saath: fix karein, us raste se bachein, ya jo stable hai wo dikhayen. Main chupaunga nahi."

**Q177. "Hamari list ka ek tool aap nahi jaante. Kya phir bhi kaam kar sakte hain?"** Parakh: imaandari aur seekhne ki raftaar. Jawab: "Maine isay professionally istemal nahi kiya. Sab se qareeb cheez jo maine ki wo yeh hai, aur main isay pehle haftaon mein is tareeqe se seekhunga." Aisi skill ka daawa kabhi na karein jo aap samjha na sakein.

**Q178. "Aap ka sab se kamzor pehlu kya hai?"** Parakh: khud-agahi. Jawab: Asal aur theek hone wala pehlu chunein: automated test coverage, ya BI tools, ya Kubernetes ki gehraai. Batayen ke us par kya kar rahe hain. "Main bohat mehnat karta hun" se bachein.

**Q179. "Aap ka tajurba zyada private sector ka hai. Government ka kaam slow aur bureaucratic hota hai. Kya yeh masla hai?"** Parakh: dhalne ki salahiyat. Jawab: "Manzooriyan aur documentation jawabdehi ke liye hoti hain. Main inhein pehle se plan karta hun, likhit record rakhta hun, aur sign-off ke intezar mein kaam parallel chalata rehta hun."

**Q180. "Aap PITB ke technical faislay se ittefaq nahi karte. Kya karenge?"** Parakh: pesha-warana ikhtilaf. Jawab: "Main data ke saath (risk, cost, misalein) pehle nijee taur par baat uthata hun, ek badal tajweez karta hun, aur aakhri faisla qubool karta hun. Faisla ho jaye to poori tarah saath deta hun aur jo risks bataye the un par nazar rakhta hun."

**Q181. "Vendor ka code kharab hai aur aap ko us se integrate karna hai."** Parakh: amali soch. Jawab: "Main usay adapter mein lapet deta hun, jis behavior par depend karta hun us ke gird tests lagata hun, sab kuch log karta hun, vendor ko likhit defects batata hun, aur un ke masle apne code mein nahi laata."

**Q182. "Aap apni maujooda company kyun chhor rahe hain?"** Parakh: rawaiya aur istiqlal. Jawab: Aap ka apna imaandar jawab. Musbat aur aage dekhne wala rakhein: scale, ownership aur qaumi system banane ka moqa. Apne employer ki burai na karein.

**Q183. "Yeh contract hai. Aap ki tankhwah ki umeed kya hai?"** Parakh: haqeeqat-pasandi. Jawab: Pehle se senior engineers aur contract grade ki market range maloom karein, munasib range batayen, aur kahein ke sahi scope ke liye lachak hai. Aise numbers na batayen jinka defence na kar sakein.

**Q184. "Kya aap ke CV mein koi cheez hai jo aap tafseel se samjha nahi sakte?"** Parakh: CV ki imaandari. Jawab: Interview se pehle CV ki har line samjhane ke liye tayyar rahein. Agar kuch halki ho to saaf kahein: "Maine isay project ke ek hisse mein istemal kiya, zyada tar X."

**Q185. "Aap ko lambe ghante kaam karna hoga aur raat ko urgent tasks aa sakte hain. Theek hai?"** Parakh: operations ki wabastagi. Jawab: "Main samajhta hun ke IT operations mein incidents hote hain. Main saaf on-call rules aur achhi monitoring pasand karta hun taake raat ka kaam kam ho, aur jab ho to theek tareeqe se respond karta hun."

**Q186. "Aap pehle 30 dinon mein kya karenge?"** Parakh: planning. Jawab: Architecture aur data flows seekhunga, owners se milunga, incident history parhunga, local environment set karunga, top teen risks (testing, monitoring, deployments) dhoondunga, aur ek chhoti safe behtari deliver karunga.

## Y. Concepts ki cheat sheet (ek line mein)

- **ACID vs BASE:** ACID database ki sakht guarantees hain. BASE (basically available, soft state, eventually consistent) scale ke liye dheela model hai.
- **CAP theorem:** network toote to consistency ya availability mein se ek chunein.
- **Idempotency:** kaam dohraane se wohi natija; retries ke liye lazmi.
- **MVCC:** readers snapshots dekhte hain to writers ko block nahi karte.
- **B-tree vs hash index:** B-tree ranges aur sorting sambhalta hai; hash sirf exact match.
- **Replication vs backup:** replication ghaltiyan bhi copy karti hai (delete bhi replicate hota hai); backup se aap waqt mein peeche ja sakte hain.
- **Sharding vs partitioning vs replication:** servers mein baantna, ek server ke andar baantna, aur zyada servers par copy karna.
- **OLTP vs OLAP:** bohat chhoti live transactions vs kam lekin bhaari analytical queries.
- **ETL vs ELT:** load se pehle transform vs pehle raw load phir warehouse mein transform.
- **CDC (change data capture):** database ki tabdeeliyan binary log se doosre systems ko stream karna.
- **Event sourcing:** har tabdeeli event ki tarah store karna aur events se state dobara banana.
- **Saga vs two-phase commit:** compensating actions wale local steps ki zanjeer vs systems mein locking protocol; distributed systems mein main saga ko tarjeeh deta hun.
- **Circuit breaker:** nakam service ko thodi der call karna band karna taake wo sambhal sake aur aap ki app latki na rahe.
- **Bulkhead:** resources alag rakhna taake ek hissa kharab ho to sab na girein.
- **Rate limiting (token bucket):** tokens ek hi raftaar se bharte hain aur har request ek kharch karti hai.
- **Consistent hashing:** keys ko servers mein is tarah baantna ke naya server lagane se sirf thodi keys hilein.
- **Bloom filter:** chhota structure jo kehta hai "yaqeenan nahi hai" ya "shayad hai", mehngi lookups bachane ke liye.
- **Write-ahead log:** tabdeeli pehle log mein likhi jati hai phir data files mein, taake crash se recover ho.
- **Data lineage:** report ke har number ka source jaanna.
- **Least privilege:** kaam ke liye sirf zaroori access dena.
- **Defense in depth:** hifazat ki kai tehein, taake ek nakami breach na bane.

# Part 3: Baqi mauzoo (Git, Linux/Servers, Networking, Redis, APIs, Testing, Agile, Behavioral, Live Coding, Cloud aur Monitoring)

Numbering Q186 se aage chalti hai.

## Z1. Git aur team collaboration

**Q187. Merge vs rebase?** Jawab: Merge do branches ko jodta hai aur asal history merge commit ke saath rakhta hai. Rebase meri commits ko doosri branch ke upar dobara chalata hai taake history seedhi ho. Pull request se pehle apni local branch rebase karta hun, shared branches kabhi nahi.

**Q188. Merge conflict kaise sambhalte hain?** Jawab: Taaza code pull karein, conflict wali files kholein, dono tabdeeliyan samjhein (na samjhen to doosre developer se poochein), sahi mel rakhein, tests chalayen, phir commit. Parhe baghair apni taraf kabhi nahi chunta.

**Q189. `git revert` vs `git reset`?** Jawab: Revert naya commit banata hai jo purane ko ulat deta hai, shared branches par safe hai. Reset branch pointer peeche karke history likh deta hai, to sirf local kaam par.

**Q190. Urgent production fix kaise ship karte hain?** Jawab: Production tag se branch, test ke saath sab se chhota fix, jaldi review, deploy, release tag, phir fix ko main branch mein wapas merge taake kho na jaye.

**Q191. Kaise pata lagate hain ke bug kis commit se aaya?** Jawab: `git bisect`: ek achhi aur ek buri commit mark karein, aur Git history mein binary-search karta hai jab main har qadam test karta hun. Chand qadam mein qusoorwaar commit mil jati hai.

**Q192. Achha pull request kaisa hota hai?** Jawab: Chhota aur markooz, saaf description (kya aur kyun), task se link, tests shamil, APIs ke liye screenshots ya sample requests, aur unrelated changes nahi. Chhote pull requests ka review behtar hota hai.

## Z2. Linux, Nginx aur server operations

**Q193. Laravel `storage` par permission error de raha hai. Kaise theek karein?** Jawab: Web server user (aksar `www-data`) ko `storage` aur `bootstrap/cache` mein likhne ki ijazat chahiye. Ownership ya group permissions theek karein, `chmod 777` nahi. Deploy process har baar ise set kare.

**Q194. Server ki disk full hai. Wajah kaise dhoondte hain?** Jawab: `df -h` se pata karein kaun si disk, phir `du -sh *` se folders mein neeche ja kar bari cheezein dhoondein. Aam wajahein: logs, purane backups, uploads, ya database. Logs rotate aur policy se archive karein.

**Q195. Kaise check karte hain ke kya chal raha hai aur kya ghalat hai?** Jawab: CPU aur memory ke liye `top` ya `htop`, service ke liye `systemctl status service`, `journalctl -u service` ya logs par `tail -f`, khule ports ke liye `ss -tulpn`, aur memory ke liye `free -m`.

**Q196. Cron vs Laravel scheduler?** Jawab: Ek cron entry har minute `php artisan schedule:run` chalati hai, aur schedule code mein tay hota hai (version control mein). Agar app kai servers par chale to yaqeeni banata hun ke har task sirf ek server par chale.

**Q197. Laravel ke liye Nginx ka bunyadi setup samjhayen.** Jawab: Server block `public` folder ki taraf, `try_files` requests ko `index.php` bhejta hai, PHP requests `fastcgi_pass` se PHP-FPM ko jati hain, HTTPS certificate ke saath, aur `.env` jaisi hassas files kabhi serve nahi hotin.

**Q198. Queue workers ko zinda kaise rakhte hain?** Jawab: Unhein Supervisor ya systemd ke tehat chalayen taake crash par restart hon, aur har deploy par restart karein. Horizon ke liye Horizon process isi tarah chalayen.

**Q199. PHP-FPM ke workers khatam aur requests intezar kar rahi hain. Kya check karenge?** Jawab: `pm.max_children` aur maujood memory, workers ko rokne wali slow requests (slow queries ya slow external APIs), aur slow log. Pehle slow wajah theek karein, phir workers ki tadaad RAM ke mutabiq tune karein.

**Q200. SSH aur server ko secure kaise karte hain?** Jawab: Key-based login, password login band, seedha root login nahi, firewall jo sirf zaroori ports kholay, khud ba khud security updates, fail2ban jaisa tool, aur mehdood sudo haqooq.

**Q201. Ek server par kam downtime wala saada deployment?** Jawab: Release folders aur `current` symlink: nayi release upload, composer aur migrations safely, caches garam, symlink badlo, PHP-FPM reload aur workers restart, aur pichli release rollback ke liye rakhein.

## Z3. Networking aur infrastructure ki buniyaad (fiber backbone wala pehlu)

**Q202. DNS saada alfaz mein.** Jawab: Yeh naam ko IP address mein badalta hai. A record naam ko IPv4 address se jodta hai, CNAME alias hai, aur TTL batata hai ke jawab kitni der cache rahe. Server move se pehle TTL kam karta hun.

**Q203. TCP vs UDP?** Jawab: TCP bharosemand aur tarteeb-war hai (web, databases). UDP halka hai aur koi guarantee nahi (kuch tracking devices aur streaming). Bohat se GPS devices TCP ya UDP istemal karte hain, to ingestion service ko gum ya dohre packets sambhalne chahiyein.

**Q204. Devices ke liye MQTT vs HTTP?** Jawab: MQTT halka publish/subscribe protocol hai jo bohat se chhote devices aur kamzor networks ke liye munasib hai. HTTP saada hai aur har jagah chalta hai. Hazaron devices jo chhote, baar baar paigham bhejein un ke liye MQTT dilkash hai; main chunav is par karunga ke devices kya support karte hain.

**Q205. Firewall, NAT, VPN, private network?** Jawab: Firewall rule ke hisaab se traffic allow ya block karta hai. NAT bohat si private machines ko ek public address share karne deta hai. VPN private network mein mehfooz tunnel deta hai. Databases aur internal services private network par rehti hain, public address ke baghair.

**Q206. Layer 4 vs layer 7 load balancer?** Jawab: Layer 4 IP aur port se route karta hai (tez, saada). Layer 7 HTTP samajhta hai, to path se route, TLS terminate aur application health check kar sakta hai. Web apps ke liye aam tor par layer 7.

**Q207. Latency vs bandwidth vs throughput?** Jawab: Latency ek paigham ki dair hai. Bandwidth link ki adhiktam gunjaish hai. Throughput asal mein pohnchne wali miqdar hai. Bara link bhi slow lag sakta hai agar latency zyada ho.

**Q208. Production mein TLS certificate expire ho gaya. Ab kya, aur kaise rokein?** Jawab: Foran renew aur deploy karein, phir verify. Rokne ke liye: khud ba khud renewal, expiry monitoring jis ka alert hafton pehle aaye, aur har certificate ka ek owner.

## Z4. Redis aur caching amal mein

**Q209. Redis ke kaun se data structures istemal karte hain, aur kis liye?** Jawab: Cache aur counters ke liye strings, objects ke liye hashes (har train ki latest position), queues ke liye lists aur streams, unique members ke liye sets, rankings aur delayed items ke liye sorted sets, aur locks aur rate limits ke liye expiry wali keys.

**Q210. Redis persistence: RDB vs AOF?** Jawab: RDB baqaida snapshots leta hai (tez restart, taaza writes kho sakti hain). AOF har write log karta hai (kam nuqsan, bari files). Agar Redis sirf cache rakhe to persistence ki zaroorat nahi. Agar queues rakhe to AOF on karta hun aur failure ka plan rakhta hun.

**Q211. Redis ki memory full ho jaye to kya hota hai?** Jawab: Wo eviction policy follow karta hai: cache ke liye LRU-style policy purani keys hata deti hai. Queues ya locks ke liye eviction khatarnak hai, to alag Redis instance bina eviction ke rakhta hun aur memory alerts lagata hun.

**Q212. Kya Redis locks safe hain?** Jawab: Expiry wala saada lock bohat kaamon ke liye theek hai, lekin fail ho sakta hai agar kaam jaari rahe aur lock expire ho jaye, ya Redis failover ho. Paison ya seats ke liye main kabhi sirf cache lock par bharosa nahi karta: database constraint aakhri hifazat hai.

**Q213. Redis single point of failure hai. Kya karenge?** Jawab: Automatic failover ke liye Sentinel ke saath replication, ya sharding ke liye Redis Cluster, aur app ko cache outage se bachne ke qabil banao (database par wapas aao aur slow ho, crash na ho).

## Z5. API design aur documentation

**Q214. POST request ko retry ke liye safe kaise banate hain?** Jawab: Idempotency key bhejein. Server us key ka result store karta hai, aur dohrai hui request dusri booking ya payment banane ke bajaye wohi result lautati hai.

**Q215. APIs ke liye filtering, sorting aur pagination kaise design karte hain?** Jawab: Filters ke liye query parameters (`?station=12&status=open`), sortable fields ki whitelist, adhiktam page size ke saath cursor ya page-based pagination, aur yaksan response shape jis mein totals ya next cursor ho.

**Q216. API error response kaisa hona chahiye?** Jawab: Sahi status code, mashheen ke parhne wala stable error code, insaan ke liye saaf paigham, field-level validation errors, aur support ke liye request ID. Stack traces ya andarooni tafseelat nahi.

**Q217. API versioning ke options?** Jawab: URL mein (`/api/v1`), header mein, ya media type se. Main saafi ke liye URL ko tarjeeh deta hun. Purane versions notice period tak support hote hain, aur deprecations pehle announce karta hun.

**Q218. API contract ko document aur test kaise karte hain?** Jawab: OpenAPI (Swagger) ya Postman collection repository mein, CI mein generate ya check, aur contract tests taake mobile apps ko todne wali tabdeeli release se pehle pakri jaye.

**Q219. Webhooks ko bharosemand kaise banate hain (bhejna aur wasool karna)?** Jawab: Bhejna: backoff ke saath retries, signatures aur delivery log. Wasool: signature verify, jaldi jawab, kaam queue par, aur duplicates sambhalna kyun ke ek webhook do baar bhi aa sakta hai.

## Z6. Testing amal mein (PHPUnit aur Pest)

**Q220. PHPUnit vs Pest?** Jawab: Pest PHPUnit ke upar chalta hai, chhoti aur parhne mein aasan syntax ke saath. Engine aur assertions wohi hain. Team koi bhi istemal kar sakti hai, aur main maujooda convention follow karunga.

**Q221. Saada feature test dikhayen.** Jawab: Pest mein misaal:

```php
it('rejects booking when no seats are left', function () {
    $train = Train::factory()->create(['available' => 0]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/bookings', ['train_id' => $train->id])
        ->assertStatus(422);
});
```

Yeh factories se data banata hai, user ban kar API call karta hai, aur natija check karta hai.

**Q222. `RefreshDatabase` vs `DatabaseTransactions`?** Jawab: `RefreshDatabase` tests ke beech database migrate aur reset karta hai, saaf lekin slow. `DatabaseTransactions` har test ko transaction mein lapet kar rollback karta hai, tez lekin schema pehle se tayyar chahiye. Main default mein `RefreshDatabase` istemal karta hun, in-memory ya alag test database ke saath.

**Q223. Jobs, events aur notifications kaise test karte hain?** Jawab: `Queue::fake()`, `Event::fake()`, `Mail::fake()` aur `Notification::fake()` se check karta hun ke sahi cheezein dispatch hui, aur alag tests jo job ka handle method asal data par chalate hain.

**Q224. Authorization (policies aur roles) kaise test karte hain?** Jawab: Har role ke liye test karein ke allowed actions kamyab aur forbidden actions 403 dein, jis mein wo bhi shamil ho ke user ID badal kar doosri division ka record kholne ki koshish kare.

**Q225. Code coverage kya batati hai, aur kya nahi?** Jawab: Yeh dikhati hai ke tests mein kaun si lines chali, yeh nahi ke tests sahi cheez check karte hain. Critical modules (booking, payments, permissions) par oonchi coverage chahta hun, har jagah 100 percent ka peecha nahi karta.

**Q226. Flaky test kya hai, aur kaise theek karte hain?** Jawab: Aisa test jo kabhi pass kabhi fail ho, aam tor par time, random data, order dependency ya external services ki wajah se. Time freeze karke, data seed karke, tests alag rakh kar, aur bahar ki calls fake karke theek karein. Flaky test ko kabhi nazar-andaz na karein.

**Q227. Kya aap TDD karte hain?** Jawab: Imaandar jawab: "Mushkil business rules aur bug fixes ke liye test-first: pehle failing test jo bug dohraye, phir fix. Saade CRUD ke liye tests code ke saath likhta hun."

## Z7. Agile, project aur requirement management

**Q228. Scrum vs Kanban?** Jawab: Scrum fixed sprints mein planning, review aur retrospective ke saath chalta hai. Kanban musalsal flow hai jis mein jaari kaam par hadd hoti hai. Planned modules wale program ke liye sprints, aur support aur bug kaam ke liye Kanban.

**Q229. Achi user story aur acceptance criteria kaise likhte hain?** Jawab: "Station operator ke taur par, main ... chahta hun taake ...", phir saaf, test hone wale criteria (given, when, then). Agar main test nahi kar sakta to wo kaafi saaf nahi.

**Q230. Sab kuch urgent ho to priority kaise tay karte hain?** Jawab: Business value, risk aur effort ke hisaab se, maslan MoSCoW (must, should, could, won't). Owner ke saath likhit mein must-haves tay karta hun aur dikhata hun ke kya bahar ja raha hai.

**Q231. Non-technical officers ko progress ki report kaise dete hain?** Jawab: Ek safha: kya hua, agla kya hai, risks, aur un se kin faislon ki zaroorat hai. Module ke hisaab se percent complete, jahan mumkin live demo ke saath. Technical alfaz jin ki zaroorat nahi unhein nahi.

**Q232. Risk register mein kya hota hai?** Jawab: Risk, imkaan, asar, owner, action aur date. Yahan ke aam risks: vendor ki deri, na-saaf requirements, stations par kamzor connectivity, data quality, aur staff ka badalna. Main isay har hafte dekhta hun.

**Q233. Kam kaarkardagi wale team member ko kaise sambhalte hain?** Jawab: Pehle nijee taur par baat karke wajah dhoondta hun (skills, wazahat, kaam ka bojh, zaati), chhote saaf goals dena, pairing aur feedback se madad, progress check, aur sirf behtari na hone par likhit misalon ke saath escalate.

**Q234. Do developers ke jhagde ko kaise hal karte hain?** Jawab: Dono ko alag alag sunta hun, technical haqaiq aur maqsad par tawajjo, unhein ek saath bitha kar criteria par ittefaq karwata hun, aur agar na karein to khud wajah bata kar faisla karta hun.

**Q235. Retrospective kya hai, aur achhe natije ki misaal?** Jawab: Sprint ke baad chhoti team meeting: kya achha hua, kya nahi, kya badalna hai. Achha natija ek thos action hai jis ka owner ho, jaise bure migration ke baad "migration review checklist add karo".

## Z8. Behavioral sawal (STAR tareeqa)

STAR istemal karein: **Situation** (ek jumla), **Task** (aap ka kirdar), **Action** (aap ne kya kiya, "main" ke saath), **Result** (mumkin ho to numbers, aur kya seekha). Zyada se zyada do minute.

**Chhe asal kahaniyan** apne kaam se tayyar rakhein aur unhein kai sawalon par lagayen:

1. Mushkil performance masla jo aap ne theek kiya (HOLOIN ki slow queries).
2. Production incident jo aap ne sambhala.
3. Deadline jo scope kam karke bachayi.
4. Jab aap ne kisi ko lead ya mentor kiya.
5. Ikhtilaf ya jhagda jo aap ne hal kiya.
6. Jab aap ne naya technology jaldi seekha.

**Q236. Aisa waqt batayen jab aap ne manager ya client se ikhtilaf kiya.** Jawab: Kahani 5 chunein. Dikhayen ke aap ne data diya, suna, aur faisla hone ke baad us par amal kiya.

**Q237. Aisa waqt batayen jab aap nakam hue.** Jawab: Asal, chhoti se darmiyani nakami chunein. Is par tawajjo ke baad mein kya badla. Doosron ko qusoorwaar na thehrayen.

**Q238. Tang deadline ke dauran kaam ka waqt batayen.** Jawab: Kahani 3 chunein. Batayen ke kaise priority di, kya kaata, aur kaise communicate kiya.

**Q239. Aisa waqt batayen jab aap ne kuch jaldi seekha.** Jawab: Kahani 6 chunein. Seekhne ka tareeqa dikhayen: official docs, chhota prototype, tajurbakar se poochna, phir lagana.

**Q240. Aisa waqt batayen jab aap ne process behtar kiya.** Jawab: Koi CI check, review checklist, deployment script ya runbook jo aap ne shuru kiya, aur naapa jaane wala natija (kam bugs, tez deploys).

**Q241. Aisa waqt batayen jab aap ne non-technical shakhs ko technical baat samjhayi.** Jawab: Misaal istemal karein, jaise background jobs ke liye ticket counter ki qatar, aur batayen ke us shakhs ne is se behtar faisla kiya.

## Z9. Live coding aur logic tasks (kaghaz par practice)

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

Samjhayen: ek pass, hash lookup, to waqt seedha barhta hai.

**C2. Tickets ko station ke hisaab se group karke ginein.**

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

Kahein: sirf format check hai; yeh sabit nahi karta ke CNIC asli hai.

**C4. Brackets balanced hain ya nahi.** Stack istemal karein: kholne wale push, band karne wale par pop aur compare, aur sirf tab durust jab aakhir mein stack khali ho.

**C5. Do GPS points ke beech fasla (haversine ka idea).** Samjhayen: degrees ko radians mein badlein, Earth radius takreeban 6,371 km ke saath haversine formula lagayen, aur kilometers wapas karein. Add karein: bari scale par "station ke qareeb kaun si trains" ke liye pehle indexed latitude aur longitude par bounding box se filter karta hun, phir asal fasla nikalta hun.

**C6. Log file mein har ghante ki error lines ginein.** File ko line by line parhein (poori kabhi load nahi), regex se ghanta nikalein, har ghante ka counter barhayen, aur natija print karein.

**C7. Overlapping seat holds ya bookings pakdein.** Do ranges overlap karti hain agar `start1 < end2 AND start2 < end1`. Isay index wali query mein istemal karein, aur phir bhi database constraint ya lock se hifazat karein.

**C8. Saada rate limiter ka idea.** Har user aur minute ke liye Redis mein `INCR` aur expiry ke saath counter rakhein, aur limit paar hone par block karein. Naram limits ke liye token bucket ka zikr karein.

Live coding ke tips: pehle apna plan bolein, saada sahi version se shuru karein, phir behtar karein, edge cases (khali input, null, duplicates, bohat bara input) ke naam lein, aur likhte hue bolte rahein.

## Z10. Cloud, availability aur monitoring

**Q242. Government system ke liye on-premise vs cloud?** Jawab: On-premise ya government data centers control aur data residency dete hain lekin capacity planning aur staff mangte hain. Cloud tez scaling deta hai lekin cost, data kahan rakha ja sakta hai ke rules, aur provider par inhisar laata hai. Aksar hybrid chuna jata hai. Main program ki policy follow karunga aur app ko aisa banaunga ke move ho sake.

**Q243. Virtual machines vs containers?** Jawab: VM mein poora operating system hota hai, to wo bhaari aur ziada isolated hai. Container host kernel share karta hai, to tez shuru hota hai aur kam istemal karta hai. Containers aksar VMs par chalte hain.

**Q244. 99.9 percent uptime ka matlab kya hai?** Jawab: Saal mein takreeban 8.8 ghante downtime. 99.99 percent takreeban 53 minute saal mein. Har extra nine bohat mehnga parta hai, is liye poochta hun ke business ko asal mein kya chahiye.

**Q245. 3-2-1 backup rule?** Jawab: Data ki teen copies, do alag qism ki storage par, ek copy off-site. Aur restore ko test karein.

**Q246. Monitoring aur error tracking ke liye kaun se tools istemal karte hain?** Jawab: App aur queues ke liye Laravel Telescope aur Horizon (aur Pulse), Sentry jaisa error tracker, metrics ke liye Prometheus aur Grafana, aur logs ke liye ELK stack jaisa system. Imaandar note: wohi tools batayen jo asal mein istemal kiye hon, aur batayen ke kaun se sirf concept ki had tak jaante hain.

**Q247. Synthetic check kya hai?** Jawab: Schedule par chalne wala test jo user ki tarah bartaav karta hai (home page kholo, train search karo, login karo) bahar se, aur fail hone par alert deta hai. Yeh masle asal users ke shikayat karne se pehle pakadta hai.

**Q248. Alert fatigue se kaise bachte hain?** Jawab: Sirf un cheezon par alert jin par abhi insaan ko action lena ho, related alerts ko group, munasib thresholds, severity se routing, aur har hafte shor machane wale alerts ka review. Agar sab alert karein to kisi par tawajjo nahi hoti.

**Q249. Capacity planning kaise karte hain?** Jawab: Maujooda istemal naapein (CPU, memory, disk, connections, queue length), growth trends dhoondein, hadein maloom karne ke liye load test, aur kisi bhi had ke takreeban 70 percent par pohnchne se pehle upgrades plan karein.
