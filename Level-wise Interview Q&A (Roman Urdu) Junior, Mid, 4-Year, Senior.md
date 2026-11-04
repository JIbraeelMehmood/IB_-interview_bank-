# Level-wise Interview Q&A (Roman Urdu): Junior, Mid, 4-Year, Senior

PITB / Pakistan Railways Senior Software Engineer (IT Operations) ke liye. Har level ke sawal poore jawab ke saath hain, sirf number nahi. Question numbers English guide aur Roman Urdu v2 tab ke Q numbers ke barabar hain, taake aap dono mein match kar sakein. Style wohi hai: Urdu ka dhancha, English tech words.

## Is doc ko kaise use karein

| Level | Interviewer ki umeed | Answer ki depth |
| --- | --- | --- |
| Junior (0 se 2 saal) | Basics aati hon aur simple code likh sakein | Definition plus ek chhoti example |
| Mid (taqreeban 3 saal) | Features khud banayein aur common traps jaanein | Kaise kaam karta hai plus ek gotcha jo aap ne dekha ho |
| 4 saal (aap ka level) | Ek module own karein, design karein, quality bachayein, team ki madad karein | Kaise, kyun, trade-off aur ek real story |
| Senior (5+ saal) | Kai modules ka outcome own karein, uncertainty mein decision, mentoring, incidents | Trade-offs, numbers, failure stories, kya alag karte |

**Aap ke liye tarteeb:** Job ka title Senior hai, to 4 saal ke bawajood senior-style sawal (ownership, design, quality, delivery) aayenge. Pehle Junior phir Mid parhein (yeh technical base hain), phir **4-Year Must** (sab se zyada important), aur aakhir mein Senior sirf trade-off phrases aur stories ke liye. Do-star (should-prepare) sawalon ki list is doc ke aakhir mein hai, un ke jawab Roman Urdu v2 tab mein Q number se milenge.

**Honest note:** jo experience aap ne asal mein kiya, wohi batayen, phir dikhayen ke bari scale par aap kaise sochte. Jo cheez kabhi nahi ki, uska claim na karein.

# Level 1: Junior (foundations, har kisi ko aani chahiyein)

Inmein se koi bhi miss ho to baqi sab ka faida nahi. Har answer ek minute se kam mein.

## PHP aur Laravel basics

**Q13. Production mein PHP request kaise chalti hai?** Answer: Nginx request PHP-FPM ko pass karta hai, ek worker script run karta hai, response wapas jata hai aur request ki memory clear ho jati hai. State process ke bahar rehni chahiye: sessions Redis mein, data database mein.

**Q15. Aap PHP 8.x ke kaun se features use karte hain?** Answer: Typed properties, enums, match, readonly properties, constructor promotion, named arguments, nullsafe operator, attributes. Code clear hota hai aur mistakes jaldi pakri jati hain.

**Q17. PHP/Laravel mein errors aur logging kaise handle karte hain?** Answer: Expected failures ke liye exceptions, baqi ke liye global handler, structured logs jis mein request ID aur user ID ho, aur users ko raw errors kabhi nahi dikhata.

**Q18. Dependency injection kya hai, aur kyun important hai?** Answer: Class jo cheez chahiye wo bahar se leti hai, khud create nahi karti. Is se code testable hota hai (fake inject kar do), aur payment, SMS ya GPS provider business logic touch kiye baghair swap ho sakta hai.

**Q19. Interface vs abstract class vs trait?** Answer: Interface ek contract hai. Abstract class shared base hai jis mein kuch code ho. Trait reusable code hai jo classes mein mix hota hai. Main `NotificationChannel` ya `PaymentGateway` jaisi cheezon ke liye interface use karta hoon.

**Q21. Laravel request lifecycle samjhayen.** Answer: `public/index.php` app boot karta hai, middleware chalti hai, router route dhoondta hai, controller chalta hai, aur response middleware se wapas jata hai. Service providers pehle services register aur boot karte hain.

**Q23. N+1 problem kya hai, aur kaise pakadte hain?** Answer: List ke liye ek query aur har row ke relation ke liye ek aur query. Fix: eager loading `with()`, `withCount()`, aur sirf zaroori columns select karna. Debugbar, Telescope ya query logs se pakadta hoon.

**Q24. Queues: background jobs ko safe kaise banate hain?** Answer: Backoff ke saath retries, timeouts, failed-jobs table, aur **idempotent** jobs, taake job do baar chalne se SMS do baar ya charge do baar na ho. Monitoring ke liye Redis ke saath Horizon.

**Q28. Validation aur API design.** Answer: Validation ke liye Form Requests, JSON shape ke liye API Resources, har list par pagination, aur versioned routes (`/api/v1`) taake mobile apps API change par break na hon.

**Q152. Mass assignment ka risk kya hai?** Answer: User extra fields bhejta hai (jaise `is_admin`) aur `Model::create($request->all())` unhein save kar deta hai. `$fillable`, sirf validated data (`$request->validated()`), aur raw request data kabhi pass nahi karna.

**Q160. Local scope kya hai?** Answer: Model par reusable query piece, jaise `scopeActive` jo `Ticket::active()->get()` ki tarah chalta hai. Filters ek jagah rehte hain aur code readable hota hai.

## MySQL basics

**Q31. Slow query kaise dhoondte aur fix karte hain?** Answer: Slow query log ya `EXPLAIN`. Dekhta hoon kaun sa index use hua, kitni rows scan hui, filesort ya temporary table to nahi. Fix: sahi (aksar composite) index, kam columns, indexed column par function nahi, aur per-row kaam kam.

**Q32. "Station aur date range se tickets" ke liye index design karein.** Answer: Composite index `(station_id, travel_date)`: equality column pehle, range column aakhir mein. Leading-column rule ki wajah se sirf date par filter is index ko use nahi karega.

**Q111. Kya `is_active` (yes/no) jaise column par index lagana chahiye?** Answer: Akele aam tor par nahi. Low cardinality ka matlab index aadhi table se match karta hai, to MySQL aksar ignore kar deta hai. Composite index ka hissa ho to useful hai, jaise `(station_id, is_active)`.

**Q126. Paison ke liye FLOAT ke bajaye DECIMAL kyun?** Answer: FLOAT approximate hota hai, to totals mein chhote chhote farq aa jate hain. DECIMAL exact hota hai. Ya main paise integer paisa mein store karta hoon.

**Q131. Normal forms simple words mein.** Answer: 1NF: ek column mein ek value, repeating groups nahi. 2NF: har column poori key par depend kare. 3NF: koi column kisi aur non-key column par depend na kare. Main 3NF par rukta hoon, phir read speed ke liye jaan boojh kar denormalize karta hoon.

**Q132. Woh SQL tasks jo aap ko paper par likhne aane chahiyein.**

- Second ya N-th highest value: `SELECT DISTINCT salary FROM t ORDER BY salary DESC LIMIT 1 OFFSET N-1` ya `DENSE_RANK()`.
- Duplicates dhoondna: `SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1`.
- Duplicates delete, sab se chhota id rakhna: `DELETE a FROM users a JOIN users b ON a.email = b.email AND a.id > b.id`.
- Jin rows ki matching nahi: `LEFT JOIN ... WHERE b.id IS NULL`.
- Running total: `SUM(amount) OVER (ORDER BY date)`.

## Web, Git aur tools

**Q68. Passenger Rabta app kholta hai aur train search karta hai to kya hota hai?** Answer: App HTTPS request bhejti hai, DNS aur TLS hote hain, load balancer web server ko route karta hai, PHP-FPM Laravel chalata hai, API pehle cache phir database check karti hai, JSON wapas aata hai, aur app render kar deti hai.

**Q69. HTTP methods, idempotency aur status codes.** Answer: GET read, POST create, PUT replace, PATCH partial update, DELETE remove. GET, PUT, DELETE idempotent hain. Codes: 200, 201, 400, 401 (login nahi), 403 (permission nahi), 404, 409, 422, 429, 500, 503.

**Q72. CORS, cookies, sessions aur tokens.** Answer: CORS browser ka rule hai, authentication nahi. Session server par data rakhta hai aur cookie mein sirf session ID hoti hai. Tokens mobile apps aur APIs ke liye suit karte hain; short expiry plus refresh tokens.

**Q187. Merge vs rebase?** Answer: Merge do branches ko jorta hai aur real history merge commit ke saath rakhta hai. Rebase meri commits ko doosri branch ke upar replay karta hai taake history straight ho. Pull request se pehle apni local branch rebase karta hoon, shared branches kabhi nahi.

**Q188. Merge conflict kaise handle karte hain?** Answer: Latest code pull, conflict wali files open, dono changes samajhta hoon (na samjhoon to doosre developer se poochta hoon), sahi combination rakhta hoon, tests chalata hoon, phir commit. Bina padhe apni side kabhi nahi chunta.

**Q189. `git revert` vs `git reset`?** Answer: Revert naya commit banata hai jo purane ko undo karta hai, shared branches par safe hai. Reset branch pointer peeche karke history rewrite karta hai, to sirf local kaam par.

**Q192. Achha pull request kaisa hota hai?** Answer: Chhota aur focused, clear description (kya aur kyun), task se linked, tests included, APIs ke liye sample requests, aur unrelated changes nahi.

## Testing, Docker aur security basics

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

**Q83. Multi-vendor program ke liye Docker kya problem solve karta hai?** Answer: Sab ek jaisa environment chalate hain, to "mere machine par to chal raha hai" wali problem khatam. Naye developers aur vendor teams jaldi start karte hain, aur staging production jaisa hota hai.

**Q91. OWASP Top 10: main risks aur fixes.** Answer: Broken access control (policies, ownership checks), injection (bindings), XSS (output escape, CSP), CSRF (tokens), weak authentication (MFA, lockouts), data exposure (TLS, encryption), outdated components (`composer audit`), misconfiguration (debug off), aur weak logging.

**Q95. Secrets management.** Answer: Environment variables ya secrets manager, Git mein kabhi nahi, har environment ki alag keys, staff change ya leak par rotate. Secret commit ho jaye to foran rotate karta hoon.

**Q147. Hashing vs encryption vs encoding?** Answer: Hashing one-way hai (passwords, bcrypt ya Argon2 se). Encryption key ke saath two-way hai (CNIC). Encoding (Base64) sirf format change hai, koi security nahi deta.

**Q151. Kya Eloquent ke saath SQL injection ho sakta hai?** Answer: Haan, raw methods mein aur un dynamic hisson mein jo bind nahi ho sakte, jaise user input se aaye column names ya `ORDER BY` direction. Main allowed columns aur directions ki whitelist rakhta hoon.

## Soft skills

**Q177. "Hamari list ka ek tool aap nahi jaante. Kya phir bhi kaam kar sakte hain?"** Answer: "Maine isay professionally use nahi kiya. Sab se close cheez jo maine ki wo yeh hai, aur main isay pehle haftaon mein is tareeqe se seekhunga." Aisi skill ka claim kabhi na karein jo aap explain na kar sakein.

**Q178. "Aap ka sab se weak area kya hai?"** Answer: Real aur fixable weakness chunein: automated test coverage, ya BI tools, ya Kubernetes depth. Batayen ke us par kya kar rahe hain. "Main bahut mehnat karta hoon" jaise jawab se bachein.

## Coding tasks (junior level)

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

# Level 2: Mid (taqreeban 3 saal): features khud banayein aur common traps se bachein

## Laravel aur PHP practice mein

**Q14. OPcache kya hai, aur production PHP mein aur kya tune karte hain?** Answer: OPcache compiled scripts memory mein rakhta hai, to har request par dobara compile nahi hota. Saath mein PHP-FPM workers memory ke hisaab se tune karta hoon, timeouts set karta hoon, display\_errors off, aur optimized Composer autoloader.

**Q16. Bahut bari file ya export bina memory khatam kiye kaise process karte hain?** Answer: Stream karta hoon: generators ya Laravel cursor/lazy/chunk, output saath saath likhta hoon, aur kaam queued job mein chalata hoon, web request mein nahi.

**Q22. 3 saal ke program ke liye bari Laravel app ki structure kaisi rakhenge?** Answer: Modular structure: Ticketing, Tracking, Inspection, Attendance, Reporting jaise modules, har ek ke apne routes, services, policies aur tests. Business logic service ya action classes mein, controllers mein nahi.

**Q25. Is program mein scheduler kaise use karenge?** Answer: Expired seat holds release karna, daily summary tables banana, stale GPS devices mark karna, overdue inspections ke reminders, aur payment providers ke saath reconciliation. Har task do baar chale to bhi safe ho, aur apna result log kare.

**Q26. Bari organization mein authentication aur authorization.** Answer: Authentication Sanctum ya OAuth se, admins ke liye MFA. Authorization Policies aur roles/permissions se, division, station ya office ke scope mein. Record ownership hamesha check karni hai taake IDOR na ho.

**Q27. Multi-tenancy ya multi-division data scoping (aapki story).** Answer: HOLOIN mein maine middleware mein tenant resolve kiya aur global scopes lagaye taake har tenant sirf apna data dekhe, phir test kiya ke scope bypass nahi ho sakta. Yahan wohi idea divisions aur stations par apply hoga.

**Q29. File uploads (inspection photos, documents) kaise handle karte hain?** Answer: Real file type aur size validate, file ka naam change, object storage mein store, expiring private links se serve, aur thumbnails queue jobs mein.

**Q30. Laravel mein audit logging kaise karte hain?** Answer: Model observers ya auditing package se who, what, when, aur old/new values append-only table mein save karta hoon, aur us table ka access restricted rakhta hoon.

**Q165. `whereHas` vs join: kaun sa fast hai?** Answer: `whereHas` subquery use karta hai aur clear hai, lekin bari tables par achhe indexes ke saath join ya `whereExists` fast ho sakta hai. Main EXPLAIN se measure karke choose karta hoon.

**Q166. Loop ke andar update karne par `chunk()` rows kyun skip ya repeat kar sakta hai?** Answer: Agar chunking ke dauran filter ya ordering wala column change ho jaye to offset boundaries shift ho jati hain. Updates ke liye `chunkById()` (ya `lazyById()`) use karein kyunke yeh primary key se pages banata hai.

**Q167. Kya `firstOrCreate` ya `updateOrCreate` concurrency mein safe hain?** Answer: Khud nahi. Do requests dono kuch nahi paa kar dono insert kar sakti hain. Unique constraint lagayen, duplicate-key error handle karein, ya `upsert` use karein. Uniqueness database ko enforce karni chahiye.

**Q168. Transaction ke andar job dispatch hui aur record nahi mila. Kyun?** Answer: Worker transaction commit hone se pehle start ho gaya. Commit ke baad dispatch karein (`afterCommit`, ya `after_commit` queue setting) taake job chalne tak data maujood ho.

**Q171. Karoron rows fast kaise insert karte hain?** Answer: Chand hazar ke batches mein bulk `insert()` ya `upsert()`, har batch ke liye ek transaction, kam indexes, aur queued job se. Loop mein `create()` slow hai kyunke events aur har row ki ek query hoti hai.

**Q172. Counter ko safely kaise barhate hain?** Answer: `increment()` atomic `UPDATE ... SET count = count + 1` chalata hai. Read karke PHP mein add karke save karna concurrency mein lost updates deta hai.

## Database

**Q33. Aakhri seat do log ek saath book na kar saken, kaise?** Answer: Transaction ke andar row lock (`lockForUpdate`) ya conditional update (`UPDATE ... WHERE available > 0`) aur affected rows check, saath mein (train, date, seat) par unique constraint. Final decision database ka hota hai, application code ka nahi.

**Q34. Hazaron locomotives ke GPS pings kaise store karenge?** Answer: Raw pings ko narrow, append-only, time-partitioned table (ya time-series store) mein, device aur time par index, aur har train ka alag "latest position" record. Purana raw data retention policy ke hisaab se archive hota hai. Dashboard ko kabhi history scan nahi karni chahiye; latest record har train ki sirf ek row hai, to hamesha fast.

**Q35. 10 crore rows wali table par pagination kaise karein?** Answer: Keyset pagination: `WHERE id > last_id ORDER BY id LIMIT 50`. Bade OFFSET slow hote hain kyunke MySQL ko skip ki hui rows bhi walk karni parti hain.

**Q37. Transactions, isolation levels aur deadlocks.** Answer: Transaction kai writes ko ek unit bana deti hai: sab success ya sab fail. MySQL ka default REPEATABLE READ hai. Deadlock tab hota hai jab do transactions ek doosre ke locks ka wait karti hain. Isliye transactions short rakho, locks ek hi order mein lo, aur deadlock par retry.

**Q38. Government database ka backup aur recovery.** Answer: Daily full backup plus point-in-time recovery ke liye binary logs, off-server copies, aur schedule par **tested restores**. Jis backup ka restore kabhi test nahi hua, wo backup nahi hai. RPO aur RTO business ke saath tay karta hoon.

**Q108. InnoDB mein clustered index kya hai, aur kyun matter karta hai?** Answer: InnoDB mein table khud primary-key order mein store hoti hai. Har secondary index mein primary key ki value bhi hoti hai. To bara primary key har index ko bara aur slow bana deta hai.

**Q110. EXPLAIN kaise padhte hain?** Answer: `type` dekhta hoon (best se worst: const, eq\_ref, ref, range, index, ALL), `key` (kaun sa index use hua), `rows` (estimated scan) aur `Extra`. Bari table par `ALL` ka matlab full scan. `Using filesort` aur `Using temporary` warning signs hain.

**Q112. WHERE ka index hone ke bawajood ORDER BY slow kyun ho sakta hai?** Answer: Index ko filter aur sort dono handle karne chahiye. `(station_id, created_at)` jaisa composite index `WHERE station_id = ? ORDER BY created_at` ko serve karta hai. Pehle column par range condition baad ke columns ka sort order tor deti hai.

**Q113. Bari InnoDB table par `COUNT(*)` slow kyun hota hai?** Answer: MVCC ki wajah se InnoDB row count store nahi karta, usay rows count karni parti hain. Bari tables ke liye counter ya summary table, display ke liye approximate count, ya sirf filtered indexed range count karta hoon.

**Q114. MySQL tables ko kaise join karta hai, aur joins fast kaise banate hain?** Answer: Nested-loop joins, aur naye MySQL 8 versions mein hash joins. Dono taraf join columns par index, same data type par join, pehle filter, aur sirf zaroori columns select.

**Q115. Window functions kya hain? Example dein.** Answer: Yeh related rows par calculation karte hain bina GROUP BY ki tarah rows collapse kiye. Har train ka latest ping: `SELECT * FROM (SELECT p.*, ROW_NUMBER() OVER (PARTITION BY train_id ORDER BY pinged_at DESC) rn FROM pings p) x WHERE rn = 1`. Baqi: RANK, DENSE\_RANK, SUM OVER se running totals.

**Q116. CTE aur recursive CTE kya hain?** Answer: CTE ek named sub-query hai (`WITH ... AS`) jo lambi queries ko readable banati hai. Recursive CTE hierarchies par chalta hai, jaise Headquarters, Division, Station, Staff.

**Q122. Deadlock ko investigate kaise karte hain?** Answer: `SHOW ENGINE INNODB STATUS` latest deadlock aur involved queries dikhata hai. Fix: rows ko ek hi order mein lock karo, transactions short, sahi index, aur deadlock par transaction retry.

**Q127. DATETIME vs TIMESTAMP?** Answer: TIMESTAMP UTC mein store hota hai, session time zone se convert hota hai, aur saal 2038 par khatam. DATETIME ki range bari hai aur automatic conversion nahi. Main hamesha UTC store karta hoon aur application mein convert karta hoon.

**Q128. Kya JSON columns use karne chahiye?** Answer: Flexible, kam filter hone wale extras ke liye (device settings, form answers). Aise data ke liye nahi jis par aksar filter, join ya report ho. Filter karna ho to indexed generated column lagata hoon.

## Design patterns

**Q48. Laravel mein aap kaun se patterns use karte hain, aur kyun?** Answer: Business logic ke liye Service/Action classes, Repository sirf complex ya reused queries ke liye, swap hone wale providers ke liye Strategy, model events ke liye Observer, objects aur test data ke liye Factory, aur middleware-style steps ke liye Pipeline.

**Q49. Is program se Strategy pattern ki example.** Answer: `NotificationChannel` interface jis mein `send()` ho. Classes: `SmsChannel`, `EmailChannel`, `PushChannel`. WhatsApp add karna ho to bas ek nayi class, purana code touch nahi hota.

**Q50. Inspection ya booking ke liye State pattern.** Answer: Booking states se guzarti hai: pending, held, paid, confirmed, cancelled. Inspection: raised, assigned, fixed, verified, closed. Har state sirf kuch next states allow karti hai, to invalid jump possible hi nahi.

**Q51. Bahar ke systems ke liye Adapter pattern.** Answer: Har external system (payment provider, SMS gateway, GPS vendor, NADRA) ko apni interface ke peeche wrap karta hoon. Vendor format change kare to sirf adapter badalta hai.

**Q52. SOLID ek ek line mein.** Answer: Ek class ka ek kaam. Naya feature code add karke aaye, purana edit karke nahi. Child class wahan chale jahan parent chalta hai. Chhoti, focused interfaces. Concrete classes par nahi, interfaces par depend karo.

## APIs aur integration

**Q70. Live train status ke liye REST vs WebSockets vs polling.** Answer: General lookups ke liye caching ke saath REST, live control-room views ke liye WebSockets, aur weak networks ke liye simple short polling fallback.

**Q71. Bahar ke systems (payment, SMS, NADRA, banks) se integrate kaise karte hain?** Answer: Versioned APIs, timeouts, backoff ke saath retries, idempotency keys, signature-checked webhooks, adapter layer, aur har exchange ka log. Main maan kar chalta hoon ke doosri taraf ka system slow ya down ho sakta hai.

**Q214. POST request ko retry ke liye safe kaise banate hain?** Answer: Idempotency key bhejte hain. Server us key ka result store karta hai, aur repeat request doosri booking ya payment banane ke bajaye wohi result return karti hai.

## QA aur CI/CD (mid level)

**Q74. Is program ke liye aap ki QA strategy kya hai?** Answer: Test pyramid: business rules ke liye bahut saare unit tests, kuch feature tests (routes, database, queues), aur key journeys (search, book, pay, cancel; inspect, fix, verify) ke liye thode end-to-end tests. Saath mein bade releases se pehle manual testing aur Railways staff ke saath UAT round. *Honest note:* "Main critical flows test karta hoon aur code review karta hoon, aur automated PHPUnit/Pest coverage strong kar raha hoon. Is program mein paise, booking aur permission logic ke liye tests mandatory rakhunga."

**Q75. Waqt kam ho to pehle kya test karte hain?** Answer: Payments, seat availability, refunds, permissions aur data exports, kyunke yahan failure ki cost sab se zyada hoti hai.

**Q76. Payment, SMS ya GPS systems call karne wala code kaise test karte hain?** Answer: Fakes aur mocks (`Http::fake()`, `Queue::fake()`, `Mail::fake()`), aur chand real integration checks ke liye sandbox environment. Tests kabhi real paise ya real passengers ko touch nahi karte.

**Q77. Aap ki CI pipeline kya kya chalati hai?** Answer: Dependencies install, Pint (style), PHPStan/Larastan (static analysis), automated tests, aur `composer audit`. Code tab hi merge hota hai jab sab pass ho.

**Q78. Safe release aur rollback bayan karein.** Answer: Build ek baar, staging par deploy, smoke test, quiet window mein production deploy, migrations safely, errors aur metrics watch, aur rollback ready. Database changes expand-then-contract pattern se.

**Q81. Severity vs priority.** Answer: Severity impact hai (booking na ho paye to critical). Priority yeh hai ke kitni jaldi fix karna hai. Home page ka typo low severity hai, lekin launch se pehle high priority ho sakta hai.

**Q82. Achha code review kaisa hota hai?** Answer: Requirement poori ho, code readable ho, secure ho, tests hon, N+1 ya heavy queries na hon, error handling ho, migrations safe hon. Small pull requests, specific aur polite comments, aur checklist.

## Operations aur monitoring (mid level)

**Q85. Container baar baar restart ho raha hai. Debug kaise karenge?** Answer: `docker ps -a`, `docker logs`, exit code dekhta hoon. Phir missing environment variables, wrong database host, permissions, port conflict, aur yeh ke database ready tha ya nahi.

**Q87. Dev, staging aur production kaise alag rakhte hain?** Answer: Versions same, secrets aur databases alag, production ke bahar masked data, aur dev mein real personal data nahi. Config environment variables ya vault se aati hai.

**Q88. Kaun si monitoring aur alerts lagate hain?** Answer: Application errors, response time, queue length, failed jobs, database load aur slow queries, disk space, aur "data aana band ho gaya" alerts (jaise GPS pings nahi aa rahe). Alert un cheezon par jo users feel karein, sirf CPU par nahi.

**Q89. Runbook kya hai?** Answer: Known problem (queue stuck, database full, GPS feed down) ke liye short step-by-step guide, taake koi bhi on-call banda action le sake. Har real incident ke baad ek runbook likhta hoon.

## Security, performance aur Redis (mid level)

**Q92. CNIC, phone numbers aur travel history ki protection kaise karte hain?** Answer: Sirf wohi data lena jo zaroori ho, transit mein TLS, sensitive fields rest par encrypt, logs aur non-production mein mask, role ke hisaab se access, kis ne dekha ya export kiya uska record, aur retention rules.

**Q94. Mobile apps aur doosre departments ki APIs secure kaise karte hain?** Answer: Token authentication, har resource par authorization, validation, rate limiting, sirf HTTPS, signed webhooks, aur URLs mein secrets nahi.

**Q97. Inspection photos jaise uploads secure kaise karte hain?** Answer: Real file type aur size check, file rename, web root ke bahar store, zaroorat ho to scan, uploads kabhi execute nahi, aur expiring private links se serve.

**Q146. Encryption in transit, at rest aur field-level: samjhayen.** Answer: In transit: sab parts ke beech TLS, database tak bhi. At rest: disk ya database encryption chori hui disks aur backups se bachati hai. Field-level: app khud bahut sensitive fields (CNIC, phone) encrypt karti hai, jaise Laravel ke `encrypted` cast se, to database admin bhi unhein aasani se nahi padh sakta.

**Q150. Database users kaise set karte hain?** Answer: Least privilege. App user sirf apni tables read aur write kar sakta hai, drop ya alter nahi. Schema changes ke liye alag migration user. BI ke liye read-only reporting user. Shared accounts nahi, aur remote root access nahi.

**Q153. Audit log ko tamper-evident kaise banate hain?** Answer: Append-only table, app user ko update ya delete ke rights nahi, aur chaho to har row ko pichli row ke hash se jodo taake changes detect hon. Copies alag system mein bhej do.

**Q98. Page slow hai. Kahan se start karenge?** Answer: Pehle measure: network, server time, database, external API ya front end. Browser tools, Debugbar/Telescope, slow query log use karta hoon. Sab se bara bottleneck fix karta hoon, phir dobara measure.

**Q99. Eid ticket booking jaise peak days ki preparation kaise karte hain?** Answer: Real flows par k6 ya JMeter se load test, web servers horizontally scale, read-heavy pages cache, slow kaam queue mein, database connection limits, waiting room, aur booking se pehle non-critical features off.

**Q100. Cache invalidation ke problems.** Answer: Stale data, aur bahut saari requests ka ek saath cache rebuild karna. Main short expiry, change par key clear, versioned keys aur locks use karta hoon. Seat availability ka cache bahut short rakhta hoon aur payment par final database check karta hoon.

**Q209. Redis ke kaun se data structures use karte hain, aur kis liye?** Answer: Cache aur counters ke liye strings, objects ke liye hashes (har train ki latest position), queues ke liye lists aur streams, unique members ke liye sets, rankings aur delayed items ke liye sorted sets, aur locks aur rate limits ke liye expiry wali keys.

## Coding tasks (mid level)

**C5. Do GPS points ke beech distance (haversine ka idea).** Explain karein: degrees ko radians mein convert, Earth radius takreeban 6,371 km ke saath haversine formula, aur kilometers return. Add karein: bari scale par "station ke qareeb kaun si trains" ke liye pehle indexed latitude aur longitude par bounding box se filter karta hoon, phir exact distance calculate.

**C6. Log file mein har ghante ki error lines count karein.** File line by line padhein (poori kabhi load nahi), regex se ghanta nikalein, har ghante ka counter barhayen, aur result print karein.

**C7. Overlapping seat holds ya bookings pakadein.** Do ranges overlap karti hain agar `start1 < end2 AND start2 < end1`. Isay index wali query mein use karein, aur phir bhi database constraint ya lock se protect karein.

**C8. Simple rate limiter ka idea.** Har user aur minute ke liye Redis mein `INCR` aur expiry ke saath counter rakhein, aur limit cross hone par block karein. Smooth limits ke liye token bucket approach ka zikr karein.

# Level 3: 4 saal (aap ka target): is job ke liye sab se zyada important sawal

Yeh section sab se pehle tayyar karein. Yahan answer mein "kaise" ke saath "kyun", trade-off aur apni real story bhi honi chahiye.

## Delivery aur ownership

**Q4. Aap kaise ensure karenge ke development targets poore hon?** Answer: Main program ko modules mein todta hoon, har module ka owner, milestones aur clear "done" criteria. Progress weekly track karta hoon, demos jaldi dikhata hoon, aur risk jis din nazar aaye usi din raise karta hoon. Waqt kam ho to scope cut karta hoon, quality nahi. *Cross-question: Agar target unrealistic ho?* Answer: Main numbers dikhata hoon (tasks, effort, risks) aur options deta hoon: scope kam karein, log barhayen, ya date aage karein. Jo deliver nahi kar sakta, uska wada nahi karta.

**Q5. Aap software ko bug-free kaise rakhte hain?** Answer: Koi software 100 percent bug-free nahi hota, isliye main process banata hoon: code review, critical paths par automated tests, CI checks, staging, safe release, aur release ke baad monitoring. Goal yeh hai ke serious bugs users tak na pohnchein, aur chhote bugs jaldi fix hon.

**Q6. Senior officer testing complete hone se pehle release ka pressure daalein to kya karenge?** Answer: Main risk simple words mein batata hoon: kya toot sakta hai, kis par asar padega. Phir safe option deta hoon: tested core abhi release karein, baqi hold par. Decision aur risk dono email ya document mein likh deta hoon.

**Q8. Koi project batayen jo aap ne end to end lead kiya (aapki story).** Answer: HOLOIN. Multi-tenant IoT platform: high-volume device data, queues, Docker aur AI service layer. Maine modules plan kiye, code review kiya, slow queries fix ki (10 se 20 minute ki queries indexes, DB-side processing aur latest-value caching se usable hui), aur production issues handle kiye.

**Q11. Development lagbhag khatam ho aur requirement change ho jaye to?** Answer: Change likhta hoon, uska impact estimate karta hoon, aur owner se kehta hoon ke choose karein: time barhayen, kuch aur hataein, ya next release mein rakhein. Silently absorb nahi karta.

**Q12. Production mein apni ghalti aur us ke baad kya change hua (aapki story).** Answer: Real example lein: kya toota, kitni jaldi pata chala, sab se pehle kya kiya (damage roka), root cause kya tha, aur kaunsi prevention lagayi (test, check, review rule).

**Q102. Bare program mein work ka estimate kaise karte hain?** Answer: Chhote tasks, har ek ki range, testing aur review ka time, pichle similar kaam se comparison, aur unknowns ke liye buffer. Facts badlein to estimate update karta hoon.

**Q104. Aap ki Definition of Done.** Answer: Reviewed, tests pass, koi naya critical warning nahi, jahan zaroori documented, staging par deploy aur acceptance criteria se checked, aur owner ki approval.

## Is program ke system designs

Bolne ka flow: users aur traffic clarify karo, main flows likho, data model, components, bottlenecks, security aur failure, monitoring aur growth.

**Q55. Tamam locomotives ke liye real-time train tracking design karein.** Answer: GPS devices ingestion API ko pings bhejte hain. API validate karke queue mein daal deti hai. Workers raw history save karte hain aur Redis mein latest-position record update karte hain. Control-room dashboard latest record read karta hai, aur live updates WebSockets ya polling se aate hain. Data purana ho jaye to threshold ke baad "stale" label lagta hai. *Cross-question: Hazaron pings per second aayein to pehle kya tootega?* Answer: Database writes. Main batch inserts karta hoon, queue se spikes smooth karta hoon, aur history ko time se partition karta hoon. *Cross-question: Devices duplicate ya out-of-order pings bhejte hain.* Answer: Device id plus timestamp ko unique key banata hoon, live view mein latest se purani ping ignore karta hoon, lekin history mein sab rakhta hoon.

**Q56. Online ticket booking flow design karein.** Answer: Search (cached), transaction mein takreeban 10 minute ki seat hold, payment, confirmation, aur ticket PDF aur SMS queue jobs mein. Scheduled job expired holds release karti hai. Peak (Eid rush) mein waiting room booking path ko protect karta hai. *Cross-question: Payment ho gayi lekin callback nahi aaya.* Answer: Booking ko pending rakhta hoon, reconciliation job provider se real status poochti hai, phir confirm ya release. Callbacks signature-checked aur idempotent hone chahiye.

**Q57. Real-time fuel monitoring system design karein.** Answer: Sensor readings usi ingestion queue se guzarti hain. Raw readings cheaply store, per-trip aur daily summaries, aur suspicious drop par alert (bina stop ke girawat, ya sensor fault). Reports aur dashboards summaries read karte hain.

**Q58. Control room dashboard (headquarters aur divisions) design karein.** Answer: Latest-position store se trains ka live map aur table (position, speed, delay, fuel), division filters, stale ya off-route trains ka alerts panel, aur role-based views: har division apna hissa dekhe, headquarters sab.

**Q59. Bahut stations ke staff ke liye attendance management system design karein.** Answer: Device ya app se time aur location ke saath check-in, offline capture aur baad mein sync, shift aur leave rules, manual correction sirf reason aur approval ke saath, full audit trail, aur office-wise reports. Supervisors sirf apna staff dekhte hain.

**Q60. e-inspection system design karein.** Answer: Mobile forms checklists ke saath, time aur location wali photos, offline mode, workflow (raised, assigned, fixed, verified, closed), deadlines aur escalation, aur repeat ya overdue issues ke dashboards. Evidence tamper-resistant hona chahiye.

## Database aur Laravel depth (4-year must)

**Q117. Views vs stored procedures vs triggers: aap ki opinion?** Answer: Views read-only shortcuts aur reports ke liye theek hain. Stored procedures business logic ko code review aur version control se door chhupa dete hain, to main avoid karta hoon. Triggers hidden side effects dete hain, to sirf narrow kaam jaise audit rows ke liye rakhta hoon aur document karta hoon. Audit ke liye main Laravel observer prefer karta hoon, aur trigger sirf tab jab changes application ke bahar se bhi pakadni hon.

**Q119. Gap locks aur next-key locks kya hain?** Answer: REPEATABLE READ mein InnoDB sirf rows nahi, index ranges bhi lock karta hai taake phantom rows na aayein. Is se range mein inserts block ho sakte hain aur ajeeb waits ya deadlocks aa sakte hain. Short transactions aur sahi indexes is problem ko kam karte hain.

**Q120. MVCC kya hai?** Answer: Multi-Version Concurrency Control. Readers data ka consistent snapshot dekhte hain aur writers ko block nahi karte, kyunke purane row versions rakhe jate hain. Isi liye long-running transactions nuksandeh hain: wo purane versions ko zinda rakhti hain.

**Q161. Global scope kya hai, aur kab use karte hain?** Answer: Aisi scope jo model ki har query par automatically lagti hai, jaise soft deletes, ya tenant ya division filter. Yeh powerful hai kyunke koi bhool nahi sakta, aur yehi iska danger bhi hai.

**Q162. Global scopes ke dangers kya hain?** Answer: Inhein `withoutGlobalScopes()` se bypass kiya ja sakta hai, `DB::table()` ya raw SQL par apply nahi hoti, joins aur relationship queries mein surprise de sakti hain, queue jobs aur console commands mein (jahan logged-in user nahi) alag behave karti hain, aur logic reader se chhupa deti hain. Main aise tests likhta hoon jo prove karein ke user doosri division ka data read nahi kar sakta.

**Q163. Division scoping ka example dikhayen.** Answer: `DivisionScope` normal staff ke liye `where('division_id', auth()->user()->division_id)` lagata hai, aur headquarters roles ise skip kar dete hain. Jobs mein main `auth()` par rely nahi karta, division explicitly pass karta hoon.

## QA, security, operations aur BI (4-year must)

**Q79. Government stakeholders ke saath UAT kaise karte hain?** Answer: Simple language mein test scenarios ready, real users ke saath staging par masked data par run, issues record, fix aur retest, aur go-live se pehle written sign-off.

**Q80. Management ko quality ki tracking aur reporting kaise dete hain?** Answer: Severity ke hisaab se bug counts, escaped defects (production mein mile), test pass rate, critical modules par coverage, mean time to fix, release failure rate. Metrics improvement ke liye hain, logon ko blame karne ke liye nahi.

**Q93. Bari organization mein insider misuse kaise rokte hain?** Answer: Least privilege, role aur region scoping, views aur exports ka audit log, unusual bulk access par alerts, aur regular access reviews. Jo staff chala jaye uska access foran band.

**Q154. Personal data kahan se bina kisi ko pata chale leak hota hai?** Answer: Logs, error reports, analytics tools, email mein exports, backups, test databases aur screenshots. Main logs mein mask karta hoon, exports par restriction, backups encrypt, aur production data dev mein kabhi copy nahi karta.

**Q155. Secure data export kaise design karte hain?** Answer: Sirf authorized roles ke liye, user ke apne scope tak, row aur time limits, expiring download links, kis ne kya export kiya uska record, aur sensitive columns default mein hata ya mask.

**Q90. On-call aur incident response kaise handle karte hain?** Answer: Acknowledge, impact assess, damage roko (rollback, feature off), status communicate, root cause fix, aur short report: kya hua, kyun hua, kya change kiya.

**Q41. Live system ko slow kiye baghair reports kaise banate hain?** Answer: Simple se shuru karta hoon: scheduled jobs se update hone wali summary tables. Phir read replica. Phir ETL se fill hone wala alag reporting database. Jo sab se simple option need poori kare, wohi chunta hoon.

**Q44. 3 saal ki revenue report 90 second leti hai. Fix karein.** Answer: Pehle `EXPLAIN`, phir `(station_id, date)` par index, PHP mein calculations band, daily summary table (har station har din ki ek row), aur result cache. Karoron rows hazaron mein badal jati hain.

**Q45. Do dashboards ke totals different hain. Kaise investigate karenge?** Answer: Filters, time zones (UTC vs Pakistan time), cancelled aur refunded records, aur source table compare karta hoon. Raw data se reconcile karta hoon aur har metric ki ek hi definition fix karta hoon.

**Q46. Aap ne kaun se BI tools use kiye hain?** Answer: Honest answer: "Maine data side banayi hai: aggregation, summaries, exports, APIs. BI tool meri main job nahi rahi, lekin Metabase ya Power BI clean reporting database par chalte hain, to main wo layer ready kar sakta hoon aur tool jaldi seekh loonga."

## Tricky aur behavioral sawal (4-year must)

Yeh sawal simple lagte hain, lekin interviewer honesty, judgement, ethics ya attitude check kar raha hota hai. Har sawal ke saath likha hai ke asal mein kya parakha ja raha hai.

**Q7. Kya aap ne government ya large organizations ke saath kaam kiya hai?** Parakh: honesty aur adaptability. Answer: "Directly government ke saath nahi. Mera experience bade multi-tenant aur high-volume platforms ka hai. Reliability, security, audit trails aur delivery tracking yahan bhi wesey hi matter karte hain, aur main domain rules business team se jaldi seekh leta hoon."

**Q173. "Aap coding prefer karte hain ya team manage karna?"** Parakh: kya aap delivery-owner role ke liye dono kar sakte hain. Answer: "Mujhe dono pasand hain. Mushkil hisson par khud code karta hoon aur quality high rakhta hoon, aur planning, review aur blockers hata kar team ko lead karta hoon."

**Q174. "Ek senior officer kehta hai database mein seedha data change kar do, koi record nahi chahiye."** Parakh: integrity aur ethics. Answer: "Main silently data edit nahi karunga. Written request maangunga, controlled aur logged correction approval ke saath karunga, aur samjhaunga ke audit trail sab ko protect karta hai, us officer ko bhi."

**Q175. "Ek dost kisi ka ticket ya personal record dekhne ko kehta hai."** Parakh: data ethics. Answer: "Nahi. Access sirf kaam ke purpose ke liye hai aur har view log hota hai. Main official channel suggest karunga."

**Q176. "Minister ke demo se pehle bug mila. Kya aap batayenge?"** Parakh: pressure mein honesty. Answer: "Ji haan, apne manager ko foran, risk aur safe plan ke saath: fix karein, us path se bachein, ya jo stable hai wo dikhayen. Main chhupaunga nahi."

**Q179. "Aap ka experience zyada private sector ka hai. Government ka kaam slow aur bureaucratic hota hai. Kya yeh problem hai?"** Parakh: adaptability. Answer: "Approvals aur documentation accountability ke liye hote hain. Main inhein pehle se plan karta hoon, written record rakhta hoon, aur sign-off ka wait karte hue kaam parallel chalata rehta hoon."

**Q180. "Aap PITB ke technical decision se agree nahi karte. Kya karenge?"** Parakh: professional disagreement. Answer: "Main data ke saath (risk, cost, examples) pehle private mein baat uthata hoon, ek alternative propose karta hoon, aur final decision accept karta hoon. Decision hone ke baad poori tarah support karta hoon aur jo risks bataye thay un par nazar rakhta hoon."

**Q181. "Vendor ka code poor quality hai aur aap ko us se integrate karna hai."** Parakh: pragmatism. Answer: "Main usay adapter mein wrap karta hoon, jis behavior par depend karta hoon uske gird tests lagata hoon, sab kuch log karta hoon, vendor ko defects written mein report karta hoon, aur unke problems apne code mein nahi laata."

**Q183. "Yeh contract hai. Aap ki salary expectation kya hai?"** Parakh: realism. Answer: Pehle se senior engineers aur contract grade ki market range research karein, reasonable range batayen, aur kahein ke sahi scope ke liye flexible hain. Aise numbers na batayen jinka defence na kar sakein.

**Q184. "Kya aap ke CV mein koi cheez hai jo aap detail mein explain nahi kar sakte?"** Parakh: CV honesty. Answer: Interview se pehle CV ki har line explain karne ke liye ready rahein. Agar kuch thin ho to seedha kahein: "Maine isay project ke ek hisse mein use kiya, zyada tar X."

**Q186. "Aap pehle 30 dinon mein kya karenge?"** Parakh: planning. Answer: Architecture aur data flows seekhunga, owners se milunga, incident history padhunga, local environment set karunga, top teen risks (testing, monitoring, deployments) dhoondunga, aur ek chhoti safe improvement deliver karunga.

## Scenario practice (bol kar jawab dein)

Har scenario mein pehle masla pehchano, phir cause, phir fix, phir prevention.

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

# Level 4: Senior (5+ saal): stretch questions

Job ka title Senior hai, to inmein se kuch aa sakte hain. Yahan definition nahi, trade-off aur story tayyar rakhein. Senior-sounding answer ka formula: ek line mein trade-off, ek number, failure mode aur usay kaise detect karenge, aur ek real example.

## Architecture aur trade-offs

**Q53. Kya Repository pattern hamesha zaroori hai?** Answer: Nahi. Simple cases mein Eloquent khud repository ki tarah kaam karta hai. Main Repository tab add karta hoon jab queries complex ya reused hon, ya data source swap hone ka chance ho. Bina zaroorat extra layers over-engineering hain.

**Q54. CQRS ya event-driven design kab use karenge?** Answer: Jab reads aur writes ki needs bahut alag hon, jaise live booking writes aur heavy reporting reads. Complexity barhti hai, to sirf tab jab need clear ho. Event handlers idempotent hon aur tracing ke liye correlation IDs lagayen.

**Q61. Police station record aur complaint system (PSRMS/CMS) design karein.** Answer: Role aur station ke hisaab se strict access, sensitive data par field-level encryption, har view aur edit ka audit, retention rules, production ke bahar real data nahi, aur integrity controls taake records silently modify na ho sakein.

**Q62. Helpline 117 ka support tooling design karein.** Answer: Agents ke liye ticketing view: passenger history, categories aur status, booking aur train status ke links, escalation ke saath SLAs, aur volume aur resolution time ki reports. Staff sirf wohi dekhe jo uske kaam ke liye zaroori ho.

**Q64. Rabta app ko backend se kaise integrate karenge?** Answer: Versioned REST APIs, token authentication, rate limits, pagination, train status ke liye caching, aur backward compatibility taake purane app versions chalte rahein. Updates ke liye notification service.

**Q65. Stations par weak connectivity mein chalne wala backbone kaise design karenge?** Answer: Assume karta hoon ke link toot sakta hai: local caching, backoff ke saath retry, jahan possible ho edge par queues, clear offline states, aur connection wapas aane par conflict rules ke saath sync.

**Q66. Yahan monolith ya microservices?** Answer: Pehle modular monolith: clear modules, ek deployable app, kyunke team ke liye test aur run karna aasan hai. Tracking ingestion ya notifications jaise modules ko tab alag karta hoon jab un ki scale ya team ki need alag ho.

**Q67. National system ke liye high availability aur disaster recovery.** Answer: Load balancer ke peeche ek se zyada app servers, tested failover ke saath database replication, tested restores ke saath backups, health checks, monitoring, aur business ke saath tay RTO aur RPO wala documented disaster plan.

## Scale aur data

**Q36. Bari live table ko safely kaise alter karte hain?** Answer: Online schema change tool (gh-ost, pt-online-schema-change), ya pehle nullable column add, phir batches mein backfill, phir constraints. Production-size data par test, aur backup plus rollback plan ready.

**Q101. Database scaling ke steps order mein.** Answer: Pehle queries aur indexes fix, phir cache, phir read replicas, phir purana data archive ya partition, aur sab se aakhir mein sharding. Infrastructure barhane se pehle optimize karo.

**Q123. MySQL replication aur uske risks samjhayen.** Answer: Primary binary log likhta hai aur replicas usay replay karti hain. Default mein asynchronous hai, to replicas peeche reh sakti hain, aur failover mein last chand transactions lose ho sakti hain. Main lag monitor karta hoon, critical fresh data replica se read nahi karta, aur failover test karta hoon.

**Q133. Big data kya hai, aur kya hamare program ka data "big" hai?** Answer: Big data ka matlab hai volume, velocity aur variety jo ek normal database ya tool aaraam se handle na kar sake. Bahut si trains ke GPS pings, sensor readings aur saalon ki ticket history bari aur fast ho sakti hai. Main hype ke liye "big data" nahi bolunga: pehle measure karunga, phir sab se simple tool choose karunga jo kaam kar de.

**Q134. Storage aur load ka estimate kaise lagate hain?** Answer: Made-up numbers ka example: 2,000 devices har 10 second mein ping karein to 200 pings per second, takreeban 1.7 crore rows roz. Row takreeban 100 bytes ki ho to roz 1.7 GB, saal mein takreeban 630 GB raw, indexes se pehle. Is se pata chalta hai ke partitioning, retention aur summaries pehle din se chahiye. (Real numbers milen to wohi lagayen.)

**Q143. CAP theorem aur eventual consistency samjhayen.** Answer: Network split ho to distributed system ko consistency (sab ko wohi data dikhe) aur availability (hamesha jawab de) mein se ek choose karni parti hai. Eventual consistency ka matlab copies thode time ke liye alag ho sakti hain, phir mil jati hain. Live map eventually consistent ho sakta hai; seat booking nahi.

**Q144. Late, duplicate aur out-of-order data kaise handle karte hain?** Answer: Har event ko unique key do (device ID plus timestamp), insert-ignore ya upsert se duplicates harmless, device time aur received time dono store, aur live view tab hi update karo jab event stored value se naya ho.

## Leadership aur governance

**Q105. Doosre departments ya vendors par dependencies kaise manage karte hain?** Answer: Owner aur date ke saath risk list, blockers jaldi escalate, doosri taraf ready hone tak mocks, aur agreements written mein.

**Q106. Badalte staff wale 3 saal ke program ke liye documentation kaise rakhte hain?** Answer: README aur setup guide, API docs (OpenAPI/Postman), chhote decision records, aur runbooks. Documentation code ke paas rehti hai aur usi pull request mein update hoti hai.

**Q107. Module Railways IT staff ko handover kaise karte hain?** Answer: Training sessions, runbook, monitoring dashboards, known issues ki list, aur ek support period jis mein main sawalon ke jawab deta hoon. Module tab done hai jab unki team use chala sake.

**Q156. Doosre department ya vendor ke saath data safely kaise share karte hain?** Answer: Sirf wohi jo zaroori ho, apni credentials aur limited scope wali API se, database dump se nahi. Har access log, purpose aur retention written mein tay, aur jahan identity zaroori nahi wahan masked data.

**Q159. Data protection laws aur policy par aap kya kehte hain?** Answer: Honest answer: "Main principles follow karta hoon: sirf zaroori data lena, kyun le rahe hain batana, protect karna, sirf zaroori muddat tak rakhna, aur sirf unhein access dena jinhein need hai. Main program ki apni policy aur wo legal rules follow karunga jo department confirm kare." Kisi specific law ka reference tab tak na dein jab tak yaqeen na ho.

**Q230. Sab kuch urgent ho to priority kaise set karte hain?** Answer: Business value, risk aur effort ke hisaab se, jaise MoSCoW (must, should, could, won't). Owner ke saath written mein must-haves tay karta hoon aur dikhata hoon ke kya bahar ja raha hai.

**Q232. Risk register mein kya hota hai?** Answer: Risk, likelihood, impact, owner, action aur date. Yahan ke typical risks: vendor delays, unclear requirements, stations par weak connectivity, data quality, aur staff turnover. Main isay har hafte review karta hoon.

**Q233. Underperform karne wale team member ko kaise handle karte hain?** Answer: Pehle private mein baat karke cause dhoondta hoon (skills, clarity, workload, personal), chhote clear goals deta hoon, pairing aur feedback se support, progress check, aur sirf improvement na hone par documented examples ke saath escalate.

**Q242. Government system ke liye on-premise vs cloud?** Answer: On-premise ya government data centers control aur data residency dete hain lekin capacity planning aur staff mangte hain. Cloud fast scaling deta hai lekin cost, data kahan rakha ja sakta hai ke rules, aur provider par dependency laata hai. Aksar hybrid choose hota hai. Main program ki policy follow karunga aur app ko aisa banaunga ke move ho sake.

**Q249. Capacity planning kaise karte hain?** Answer: Current usage measure (CPU, memory, disk, connections, queue length), growth trends dhoondta hoon, limits maloom karne ke liye load test, aur kisi bhi limit ke takreeban 70 percent par pohnchne se pehle upgrades plan.

# Do-star (should-prepare) sawal: kahan milenge

Yeh sawal 4-year level ke liye bhi useful hain, lekin unke poore jawab Roman Urdu v2 tab mein (Q number se) maujood hain. Pehle upar ke three-star sawal tayyar karein, phir inhein dekhein.

| Theme | Q numbers (Roman Urdu v2 tab mein) |
| --- | --- |
| Delivery aur team | Q1, Q3, Q9, Q10, Q103 |
| Program designs | Q62, Q63 se Q67 ke baqi hisse |
| Database | Q39, Q118, Q121, Q132 |
| Laravel depth | Q28 se Q30, Q169, Q170 |
| QA aur testing | Q221 se Q227 |
| Security aur data | Q94 se Q97, Q148, Q149, Q151, Q152 |
| Operations | Q83 se Q87, Q244, Q246, Q248 |
| Reporting aur BI | Q40, Q42, Q43, Q47, Q135 se Q137 |
| Patterns | Q50, Q52, Q53, Q54 |
| Behavioral | Q182, Q185, Q236 se Q241 |

## 3 din hain to yeh top 30 karein

1. Q8 aap ka project, Q4 targets, Q5 bug-free software
2. Q55 tracking, Q56 booking, Q33 double booking
3. Q31 slow query, Q34 GPS storage, Q110 EXPLAIN
4. Q23 N+1, Q24 queues, Q161 aur Q162 global scopes
5. Q74 QA strategy, Q77 CI, Q78 safe release
6. Q91 OWASP, Q92 CNIC protection, Q93 insider misuse
7. Q88 monitoring, Q90 incident response
8. Q117 views, procedures, triggers, Q167 firstOrCreate race, Q168 after commit
9. Q7 government experience, Q174 silent data change, Q176 demo se pehle bug, Q178 weakness, Q186 first 30 days
10. C1, C2, C7 coding aur ek scope ya observer yaad se likhna

## Aakhri hidayat

1. Pehle din Junior level tez tez bol kar karein: yeh aasan lagna chahiye.
2. Din 2 aur 3: Mid level, phir 4-year three-star.
3. Phir scenarios, tricky sawal aur coding tasks.
4. Senior section sab se aakhir mein, sirf trade-off phrases aur stories ke liye.
5. Jo asal mein kiya wohi batayen, aur batayen ke bari scale par kaise sochte.
