# Senior PHP/Laravel Interview: 5 Server Questions + Top 25 (Roman Urdu Answers)

Aap ki baat bilkul sahi hai: yeh sawal junior aur senior dono roles mein puchhe jate hain. Farq depth ka hai. Junior se definition aur example liya jata hai. Senior se follow-up aate hain: "kitna handle karega, kab fail hoga, tum ne production mein kya dekha?" Is doc mein pehle woh 5 server sawal hain jo senior level ke hain (scaling aur system ko pressure mein zinda rakhna), phir Top 25 ke jawab. Har sawal par tag hai: **\[Mid\]** ya **\[Senior\]**. Style wohi: Urdu ka dhancha, English tech words.

**Senior answer ka formula:** concept ek line mein, phir number ya example, phir failure mode (kab toot'ta hai), phir fix. Isi pattern par har jawab likha hai.

# Part 1: 5 server sawal (senior level)

## Poora raasta ek nazar mein

```
Client -> DNS -> TCP/TLS -> (CDN / load balancer) -> Nginx
      -> FastCGI (unix socket ya 127.0.0.1:9000) -> PHP-FPM master
      -> idle FPM worker -> public/index.php -> Laravel -> response
      -> wapas FPM -> Nginx -> client
```

**S1. \[Senior\] Aap ka server request ko Laravel ke index file tak pohanchne se pehle kaise process karta hai?** Answer: Pehle client DNS se IP leta hai aur TCP connection plus TLS handshake hota hai (aksar load balancer ya CDN par terminate). Phir request Nginx tak aati hai. Nginx server block aur `location` match karta hai. Static files (CSS, JS, images) wo seedha khud serve kar deta hai. PHP requests ke liye `try_files` unhein `index.php` par bhejta hai aur `fastcgi_pass` se FastCGI protocol mein PHP-FPM ko deta hai (unix socket ya TCP). FPM ka master process pool se ek idle worker ko request assign karta hai, worker `public/index.php` chalata hai, Laravel boot hota hai, response wapas Nginx ke raste client tak jata hai. *Cross-question: Static files Laravel tak kyun nahi jatin?* Answer: Nginx bahut fast hai static serve karne mein aur PHP worker ko block nahi karta. Isi liye static files ko CDN ya Nginx se serve karna PHP workers bachata hai.

**S2. \[Mid\] FPM kya hai?** Answer: PHP-FPM ka matlab FastCGI Process Manager. Ek master process hota hai jo workers ka pool manage karta hai. Har worker ek time par sirf ek request handle karta hai (threads nahi). Master workers ko spawn, kill aur recycle karta hai. Important settings:

- `pm = static`: workers ki fixed tadaad, predictable, high-traffic ke liye achha.
- `pm = dynamic`: `pm.max_children`, `pm.start_servers`, `pm.min_spare_servers`, `pm.max_spare_servers` ke beech workers ghat-barhte hain.
- `pm = ondemand`: jab request aaye tab worker banta hai, kam traffic wali sites ke liye.
- `pm.max_requests`: worker itni requests ke baad restart hota hai (memory leaks se bachne ke liye).
- `request_terminate_timeout` aur `slowlog`: atki hui requests ko pakadne ke liye.

**S3. \[Senior\] Nginx concurrent requests ko FPM workers tak kaise pohanchata hai?** Answer: Nginx event-driven hai (Linux par epoll). Ek Nginx worker process hazaron connections non-blocking tareeqe se sambhal sakta hai, kyunke wo wait nahi karta, events par react karta hai (`worker_processes auto`, `worker_connections`). PHP request ke liye wo FPM se connection kholta hai (`fastcgi_pass`, chaho to `fastcgi_keep_conn` se connection reuse). FPM ka socket requests accept karta hai aur master unhein idle workers ko deta hai. Nginx PHP ki parwah nahi karta: wo bas FPM ke jawab ka intezar karta hai. To bottleneck aksar Nginx nahi, FPM workers ki tadaad hoti hai.

**S4. \[Senior\] Aap ka PHP server ek waqt mein kitni requests process kar sakta hai?** Answer: Ek FPM pool mein concurrent requests ki limit `pm.max_children` hai: har worker ek request. Lekin asal sawal yeh hai ke sahi number kitna ho:

- **Memory limit:** `max_children` taqreeban (PHP ke liye available RAM) / (har worker ki average memory). Misaal: 4 GB PHP ke liye aur har worker 50 MB, to taqreeban 80 workers.
- **CPU:** CPU-heavy kaam mein cores se zyada workers faida nahi dete. Jo requests zyada waqt database ya API ka wait karti hain wahan cores se zyada workers chal sakte hain.
- **Database connections:** har worker ek DB connection pakad sakta hai, to `max_connections` bhi dekhna parta hai.
- **Throughput ka formula:** requests per second taqreeban = workers / average response time. 80 workers aur 200 ms response se takreeban 400 req/s. Agar response 2 second ho jaye to wohi 80 workers sirf takreeban 40 req/s dete hain. Isi liye slow requests system ko maar deti hain. *Cross-question: Kya threads se behtar ho sakta hai?* Answer: FPM mein threads nahi. Laravel Octane (Swoole ya RoadRunner) app ko memory mein zinda rakhta hai aur concurrency alag tarah handle karta hai, lekin us mein memory leaks aur global state ka khayal rakhna parta hai.

**S5. \[Senior\] Jo requests process nahi ho rahi, unka kya hota hai? Woh kahan hold hoti hain?** Answer: Agar saare workers busy hon to nayi connections FPM socket ki **listen queue (backlog)** mein kernel ke paas intezar karti hain. Backlog ki size `listen.backlog` aur OS ki `net.core.somaxconn` se tay hoti hai (default aksar 511, apne config mein check karein). Phir:

- Agar worker thodi der mein free ho jaye, request chal padti hai, lekin user ko slow response milta hai.
- Agar Nginx FPM ka jawab `fastcgi_read_timeout` tak na paaye, user ko **504 Gateway Timeout** milta hai.
- Agar backlog full ho jaye ya FPM down ho, to Nginx ko connection nahi milta aur wo **502 Bad Gateway** deta hai.
- FPM log mein warning aati hai: `server reached pm.max_children setting`. Yeh sab se pehla signal hai.

*Fix ka tareeqa:* pehle slow cause dhoondo (slow query, slow external API), slow kaam queue mein bhejo, caching lagao, timeouts sahi rakho, `max_children` RAM ke hisaab se tune karo, rate limiting aur load balancer ke peeche zyada servers lagao, aur monitoring mein "active workers", "listen queue" aur 502/504 par alerts rakho. Sirf `max_children` barhana aksar masla nahi hal karta; yeh RAM khatam kar ke server ko aur girata hai.

**Quick tuning checklist (yaad rakhne ke liye):** OPcache on, `config:cache` aur `route:cache` aur `view:cache`, `pm.max_requests` set, `request_terminate_timeout` set, slowlog on, Nginx `keepalive` aur gzip, static files CDN par, sessions aur cache Redis mein, heavy kaam queue mein.

# Part 2: Top 25 PHP & Laravel questions (jawab ke saath)

## PHP Core aur OOP

**Q1. \[Mid\] PHP 8.x aur purane versions ka kya farq hai?** Answer: PHP 8.0 mein JIT, union types, named arguments, attributes, `match`, constructor promotion aur nullsafe operator aaye. 8.1 mein enums, readonly properties, fibers, never type. 8.2 mein readonly classes aur DNF types. 8.3 mein typed class constants aur `#[Override]`. 8.4 mein property hooks aur asymmetric visibility. Practical faida: ghaltiyan compile ya type level par pakri jati hain, code short aur clear hota hai, aur performance behtar. Main jo features asal mein use karta hoon wohi batata hoon: enums, readonly, match, constructor promotion.

**Q2. \[Mid\] SOLID principles real PHP example ke saath samjhayen.** Answer: **S**: ek class ka ek kaam, jaise `TicketPriceCalculator` sirf price nikale, SMS na bheje. **O**: naya feature code add karke, purana edit karke nahi: nayi `SmsChannel` class add ho, `NotificationService` na badle. **L**: child class parent ki jagah chal jaye bina behavior toote. **I**: chhoti interfaces, `Printable` aur `Exportable` alag. **D**: high-level class concrete par nahi, interface par depend kare: `BookingService` ko `PaymentGateway` interface mile, `StripeGateway` nahi.

**Q3. \[Mid\] Interface, abstract class aur trait ka farq?** Answer: Interface sirf contract hai (kya karna hai). Abstract class mein shared code aur kuch abstract methods ho sakte hain aur ek hi class extend hoti hai. Trait reusable code hai jo kai classes mein mix ho sakta hai, lekin us ka koi type nahi. Main provider-swap wali cheezon ke liye interface, shared base behavior ke liye abstract class, aur chhote reusable helpers (jaise logging) ke liye trait use karta hoon.

**Q4. \[Mid\] Dependency injection aur Dependency Inversion Principle PHP mein kaise kaam karte hain?** Answer: DIP kehta hai: high-level code abstraction par depend kare, concrete class par nahi. DI us ka tareeqa hai: class ko dependency constructor se milti hai. Laravel mein container interface ko implementation se bind karta hai: `$this->app->bind(SmsGateway::class, TwilioGateway::class)`. Faida: test mein fake inject kar sakte hain aur provider badalna aasan hai.

**Q5. \[Senior\] PHP memory management, garbage collection aur common memory leak scenarios.** Answer: PHP reference counting use karta hai: jab value ka koi reference na bache to memory free. Circular references ke liye cycle garbage collector chalta hai (`gc_collect_cycles()`). Normal web request mein memory request ke saath khatam ho jati hai (shared-nothing), isliye leaks aam tor par long-running processes mein dikhte hain: queue workers, Octane, scheduler commands. Common causes: bade Eloquent collections ko loop mein load karna, static arrays ya singletons mein data jama hona, listeners ka jama hona, unbounded in-memory cache, closures jo bade objects pakre rahein. Fixes: `chunkById`/`lazyById`, `unset`, `queue:work --max-jobs --max-time --memory` se worker ko restart, `pm.max_requests` FPM mein, aur memory usage ko monitor karna.

## Laravel Framework

**Q6. \[Mid\] Laravel request lifecycle samjhayen.** Answer: `public/index.php` autoloader load karta hai aur application bootstrap karta hai, HTTP kernel request leta hai, service providers register aur boot hote hain, global middleware chalti hai, router route match karta hai, route middleware, controller, response banta hai, aur wapas middleware se guzar kar client ko jata hai. Aakhir mein terminable middleware chalti hai. Senior follow-up: isi liye bootstrap ka kaam ko cache karte hain (`config:cache`, `route:cache`).

**Q7. \[Mid\] Service Container kya hai aur dependency injection kaise kaam karta hai?** Answer: Container Laravel ka IoC container hai jo classes banata hai aur unki dependencies khud resolve karta hai (reflection se type-hints dekh kar). `bind` har baar nayi instance deta hai, `singleton` ek hi instance, `scoped` request ya job ke dauran ek instance. Contextual binding se alag classes ko alag implementation de sakte hain. Example: controller ke constructor mein `BookingService` type-hint karo, container usay khud bana ke inject kar dega.

**Q8. \[Mid\] Service Providers aur Facades mein kya farq hai?** Answer: Service Provider app ko bootstrap karta hai: `register()` mein bindings, `boot()` mein jab sab ready ho to kaam (routes, observers, macros). Facade static-jaisi syntax hai (`Cache::get(...)`) jo asal mein container se resolve hui instance par method forward karti hai (`getFacadeAccessor`). Testing mein `Cache::shouldReceive()` ya `Mail::fake()` use hota hai. Mera view: business classes mein constructor injection prefer karta hoon, facades zyada tar framework helpers ke liye.

**Q9. \[Mid\] Middleware kya hai aur custom middleware kaise banate hain?** Answer: Middleware request ke aage peeche ka layer hai (pipeline): auth, rate limit, logging, headers. Banane ke liye `php artisan make:middleware EnsureDivisionHeader`, phir `handle($request, Closure $next)` mein check karke `return $next($request)` ya error response. Register: route par alias, ya group mein, ya global. Parameters ke saath bhi chal sakti hai (`role:admin`). Response ke baad kaam ke liye terminable middleware.

**Q10. \[Mid\] Events, Listeners, Jobs aur Queues mein kya farq hai?** Answer: **Event**: "kuch ho gaya" (`TicketPaid`), decoupled notification. **Listener**: us event par react karta hai, chaho to `ShouldQueue` se background mein. **Job**: ek explicit kaam jo aap queue mein dispatch karte hain (`SendTicketSms::dispatch($id)`). **Queue**: transport aur storage (Redis, database, SQS) jahan jobs wait karte hain, aur workers unhein process karte hain. Sawal yaad rakhne ka tareeqa: event batata hai kya hua, job batata hai kya karna hai, queue batati hai kahan wait karna hai.

**Q11. \[Mid\] Authentication vs authorization, Guards aur Policies.** Answer: Authentication matlab "aap kaun hain" (login). Authorization matlab "aap kya kar sakte hain". Guards define karte hain ke user kaise authenticate ho (session guard web ke liye, Sanctum token API aur SPA ke liye, Passport OAuth ke liye). Authorization ke liye Gates (simple checks) aur Policies (model ke hisaab se rules: `update`, `delete`). Controller mein `$this->authorize('update', $inspection)`. Senior point: har record par ownership aur division check, warna IDOR.

**Q12. \[Mid\] Eloquent ORM vs Query Builder.** Answer: Eloquent model, relationships, events, casts, accessors aur soft deletes deta hai, readable hai, lekin har row ka model hydrate hona memory aur CPU leta hai. Query Builder fluent SQL hai jo seedha rows (stdClass) deta hai, fast hai, bulk aur reporting ke liye behtar. Main normal CRUD aur business logic ke liye Eloquent, heavy reports, bulk updates aur aggregations ke liye Query Builder ya raw SQL use karta hoon. Eloquent par `->toBase()` ya `DB::table()` se hydration bacha sakte hain.

**Q13. \[Mid\] Laravel mein N+1 problem kaise rokte hain?** Answer: Eager loading: `Ticket::with('train', 'station')->get()`, count ke liye `withCount()`, bad mein zaroorat ho to `$tickets->load('train')`. Constrained eager loading: `with(['pings' => fn ($q) => $q->latest()->limit(1)])` ya `latestOfMany`. Development mein `Model::preventLazyLoading()` lagata hoon taake N+1 error ban jaye, aur Debugbar ya Telescope se query count dekhta hoon.

**Q14. \[Senior\] Database transactions aur failures kaise handle karte hain?** Answer: `DB::transaction(function () { ... }, 3)`: exception aaye to automatic rollback, aur doosra parameter deadlock par retry attempts. Manual control ke liye `beginTransaction`, `commit`, `rollBack`. Nested transactions savepoints use karti hain. Senior points: (1) transaction short rakho, (2) transaction ke andar external calls (SMS, payment API) mat karo kyunke wo rollback nahi hoti, (3) jobs aur events `afterCommit` dispatch karo, (4) failure par log aur compensating action (jaise refund ya release) rakho.

**Q15. \[Mid\] Redis ke saath caching kaise implement karte hain?** Answer: `.env` mein cache store Redis, phir `Cache::remember('train:7:latest', 30, fn () => Ping::latestFor(7))`. Tags (Redis par supported), `Cache::lock()` se atomic locks, aur write par key clear. Senior points: cache stampede se bachne ke liye lock ya jitter wali expiry, har key ka scope clear (user-specific data ko shared key mein nahi), seat jaise critical data par bohat short TTL aur final database check, aur Redis memory eviction policy cache aur queues ke liye alag.

## Database aur performance optimization

**Q16. \[Senior\] 5 se 10 second lene wali Laravel API ko kaise optimize karenge?** Answer: Pehle measure, andaza nahi: Telescope, Debugbar, APM ya logs se dekho waqt kahan ja raha hai. Phir order se:

1. **Database:** N+1, missing indexes, `select *` ki jagah zaroori columns, slow query log aur EXPLAIN.
2. **External calls:** timeouts lagao, parallel (`Http::pool`), ya slow kaam queue mein.
3. **Response size:** pagination, API Resources mein sirf zaroori fields, gzip.
4. **Caching:** Redis ya response cache read-heavy endpoints par.
5. **PHP aur framework:** OPcache, `config:cache`, `route:cache`, autoloader optimize.
6. **Infra:** FPM workers ka size, keepalive, replicas. Har fix ke baad dobara measure, aur result ka number batao ("8 second se 400 ms").

**Q17. \[Mid\] Database indexes performance kaise behtar karte hain, aur kab nuksan dete hain?** Answer: Index lookup, filter, join aur sort tez karte hain (B-tree se poori table scan nahi). Nuksan: har INSERT, UPDATE, DELETE ke saath index bhi update hota hai (write slow), storage barhta hai, bahut zyada ya low-cardinality indexes optimizer ko confuse ya waste karte hain, aur function lagane (`WHERE DATE(created_at) = ...`) ya `LIKE '%x'` par index use nahi hota. Composite index mein leftmost-prefix rule.

**Q18. \[Senior\] Laravel mein millions of records efficiently kaise process karte hain?** Answer: Pehle sochta hoon kya ye set-based SQL mein ho sakta hai (ek `UPDATE ... WHERE` poori table par database khud karega). Agar PHP mein chahiye to `chunkById()` ya `lazyById()` se rows batches mein, ya `Bus::batch()` se jobs mein todna taake parallel workers chalein. Inserts `insert()` ya `upsert()` batches mein. Exports stream karo (`response()->streamDownload`, `fputcsv`) aur memory monitor. Eloquent models ki jagah ho sake to Query Builder, kyunke model hydration mehnga hai.

**Q19. \[Senior\] `chunk()`, `chunkById()`, `lazy()` aur `cursor()` mein farq?** Answer:

- **`chunk(n)`:** offset par based queries, har batch ke liye ek query. Agar loop ke andar filter ya order wala column update karo to rows skip ya repeat ho sakti hain.
- **`chunkById(n)`:** primary key par based (`WHERE id > last`), updates ke liye safe aur fast.
- **`lazy()`:** chunks mein query karta hai lekin aap ko ek ek model ka LazyCollection deta hai, to code seedha lagta hai aur memory chunk-size jitni. Updates ke liye `lazyById()`.
- **`cursor()`:** ek hi query, ek ek model hydrate hota hai (generator), PHP-side models ki memory kam. Lekin result set driver level par buffer ho sakta hai (MySQL buffered queries), connection lambi der khula rehta hai, aur eager loading nahi chalti. Meri rule of thumb: updates ho to `chunkById`/`lazyById`, sirf padhna ho aur relations chahiye to `lazy()`, bahut simple stream ho to `cursor()` (aur result size ka dhyan).

**Q20. \[Mid\] Slow SQL queries kaise debug karte hain aur execution plan kaise analyze karte hain?** Answer: Slow query log ya Laravel Pulse/Telescope se slow queries pakadta hoon (`DB::listen` bhi). Phir `EXPLAIN` (MySQL 8 mein `EXPLAIN ANALYZE` asal timing bhi deta hai): `type` (ALL matlab full scan), `key`, `rows`, aur `Extra` mein filesort ya temporary. Fix: sahi composite index, query rewrite, kam columns, summary table. Phir dobara EXPLAIN aur real timing compare.

## Architecture, security aur scalability

**Q21. \[Senior\] Scalable REST API Laravel mein kaise design karenge?** Answer: Stateless API (Sanctum tokens), resource-based URLs, versioning (`/api/v1`), pagination aur filtering har list par, consistent error format, rate limiting, idempotency keys POST ke liye, ETag ya cache headers, slow kaam queue mein, caching Redis mein, aur load balancer ke peeche zyada app servers. Database side par indexes, read replicas heavy reads ke liye, aur monitoring (error rate, latency percentiles, queue length). Scale ke liye pehle bottleneck measure karta hoon, phir upar se infra barhata hoon.

**Q22. \[Senior\] Repository Pattern, Service Layer, DTOs: kab kaunsa useful hai?** Answer: **Service layer:** business logic ek jagah (booking ka flow), controllers patle. Zyada tar projects mein yeh sab se zyada kaam ka hai. **Repository:** jab queries complex ya reused hon, ya data source badalne ka imkan ho, warna Eloquent khud kaafi hai aur extra layer sirf boilerplate. **DTO:** jab data layers ke beech clear shape mein jata ho (API request se service tak, ya external vendor ka response), type-safe aur validated, arrays se behtar. Rule: layer tab add karo jab us ka masla saamne ho, pehle se nahi.

**Q23. \[Mid\] SQL injection, CSRF, XSS aur mass-assignment se kaise bachte hain?** Answer:

- **SQL injection:** Eloquent aur Query Builder bindings use karte hain; raw queries mein `?` placeholders; user se aaye column ya order by ki whitelist.
- **CSRF:** web forms mein `@csrf` token, `SameSite` cookies; token-based APIs mein CSRF ki zaroorat nahi par token safe rakho.
- **XSS:** Blade ka `{{ }}` output escape karta hai; `{!! !!}` sirf trusted content par; user HTML ko sanitize karo; CSP header.
- **Mass assignment:** `$fillable`, aur `$request->validated()` hi use karo, `$request->all()` nahi.

**Q24. \[Senior\] Retries, timeouts aur failed-job handling wala queue-based system kaise design karenge?** Answer: Job class mein `$tries`, `$backoff = [10, 60, 300]`, `$timeout`, aur `retryUntil()` jab time ke hisaab se retry chahiye. Job idempotent ho (dobara chale to double effect nahi). `failed(Throwable $e)` method mein alert ya compensating action, aur `failed_jobs` table se `php artisan queue:retry`. Control: `WithoutOverlapping`, `RateLimited` middleware, `ShouldBeUnique`, chains aur `Bus::batch()` jab jobs ka silsila ho. Dhyan rakhne ki baat: `retry_after` (queue config) `timeout` se bara hona chahiye, warna ek job do workers ko mil jata hai. Workers ko Horizon ya Supervisor se chalayen, `queue:work --max-jobs --max-time` se recycle, aur queue length aur failed jobs par alerts.

**Q25. \[Senior\] Bari Laravel application ko modular architecture ya microservices mein kaise structure karenge?** Answer: Main pehle **modular monolith** chunta hoon: ek codebase aur ek deploy, lekin clear modules (Ticketing, Tracking, Inspection, Reporting), har ek ke apne routes, models, services, policies aur tests. Modules ek doosre ke internals ko direct touch nahi karte; interfaces ya events se baat karte hain. Microservices tab jab ek hissa alag scale ho (jaise GPS ingestion), alag team ownership ho, ya alag technology chahiye. Microservices ki cost: network failures, distributed transactions, deployment aur monitoring ka overhead. Isi liye pehle boundaries saaf karta hoon, phir zaroorat par ek module ko service banata hoon.

# Senior developer tip: jawab kaise banayein

Sirf definition yaad na karein. Har jawab ke liye in 4 cheezein tayyar rakhein:

1. **Practical example:** apni asli project se (jaise HOLOIN).
2. **Architecture decision:** aap ne ye option kyun chuna aur doosra kyun nahi.
3. **Number:** performance ya time mein kitna farq aaya.
4. **Lesson learned:** production mein kya toota aur kya badla.

**Senior mein asal focus:** scaling aur system ko pressure mein zinda rakhna. Middleware banana ya DI samjhana aap ke dimagh mein pehle se hai; interviewer ye dekhta hai ke agar traffic 10 guna ho jaye to kya sab se pehle tootega, aap ko kaise pata chalega, aur aap kaise sambhaalenge. Is liye Part 1 ke 5 server sawal aur Q16 se Q25 sab se zyada practice karein.

**Zoom par bolne ke liye 30-second template (S4 ke liye):** "Concurrency FPM ke `max_children` se limit hoti hai, jo RAM aur average worker memory se tay hota hai. Throughput taqreeban workers bata response time hota hai, to slow requests sab se bara dushman hain. Jab saare workers busy hon to requests listen queue mein wait karti hain, aur zyada der par 502 ya 504 aata hai. Isliye main slow cause fix karta hoon, heavy kaam queue mein bhejta hoon, aur workers aur queue length monitor karta hoon."
