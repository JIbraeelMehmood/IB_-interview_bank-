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

**Zoom par bolne ke liye 30-second template (S4 ke liye):** "Concurrency FPM ke `max_children` se limit hoti hai, jo RAM aur average worker memory se tay hota hai. Throughput taqreeban workers divided by response time hota hai, to slow requests sab se bara dushman hain. Jab saare workers busy hon to requests listen queue mein wait karti hain, aur zyada der par 502 ya 504 aata hai. Isliye main slow cause fix karta hoon, heavy kaam queue mein bhejta hoon, aur workers aur queue length monitor karta hoon."

# Part 3: Deep dives (andar se kaise kaam karta hai)

Har topic ka format: concept, andar kya hota hai, code, kab use karein, gotchas, aur interview mein bolne ki ek line.

## Deep dive 1: `chunk()`, `chunkById()`, `lazy()`, `cursor()` andar se

### `chunk(1000)`: offset wali pagination

Laravel har batch ke liye ek nayi query chalata hai, aur page ko `OFFSET` se aage barhata hai:

```sql
select * from tickets where status = 'pending' order by id asc limit 1000 offset 0;
select * from tickets where status = 'pending' order by id asc limit 1000 offset 1000;
select * from tickets where status = 'pending' order by id asc limit 1000 offset 2000;
```

Eloquent order na diya ho to primary key par khud `order by` laga deta hai. Memory ek batch ke models jitni rehti hai. Do problems:

1. **Rows skip hoti hain jab loop filter wala column badal deta hai.** Misaal:

```php
Ticket::where('status', 'pending')->chunk(100, function ($rows) {
    foreach ($rows as $t) { $t->update(['status' => 'processed']); }
});
```

Pehle batch ke baad wo 100 rows ab `pending` nahi rahin, magar agli query `offset 100` se shuru hoti hai. Matlab 100 unprocessed rows beech mein se skip ho gayin. Is tarah aadhi rows reh jati hain, aur koi error nahi aata. 2. **Bade offset slow hote hain.** `offset 5000000` par MySQL ko 50 lakh rows walk karni parti hain phir chhorni parti hain.

### `chunkById(1000)`: keyset wali pagination

```sql
select * from tickets where status = 'pending' and id > 0     order by id asc limit 1000;
select * from tickets where status = 'pending' and id > 1000  order by id asc limit 1000;
select * from tickets where status = 'pending' and id > 2000  order by id asc limit 1000;
```

Har batch ke baad Laravel aakhri row ki `id` yaad rakhta hai aur agli query `id > last_id` se chalata hai. Isliye filter wale column ki tabdeeli se page nahi khisakta, aur `id` par index hone se har query fast rehti hai. Rules: column unique aur sortable ho, aur loop ke andar us column ko change na karein. Joins ke saath alias dena parta hai: `chunkById(1000, $cb, 'tickets.id', 'id')`.

### `lazy(1000)` aur `lazyById(1000)`

Andar wohi chunk logic chalta hai (`lazy` offset wala, `lazyById` keyset wala), lekin result ek `LazyCollection` ban kar aata hai jo PHP generator par based hai. Aap ek ek model par seedha `foreach` ya chain (`->filter()->map()->each()`) kar sakte hain, aur memory ek chunk jitni rehti hai:

```php
Ticket::with('train')->lazyById(1000)->each(function ($t) {
    // ek ek ticket, train relation eager loaded per chunk
});
```

Eager loading `with()` chalti hai, kyunke har chunk par model collection ban kar relations load hote hain.

### `cursor()`: ek query, ek ek row

```php
foreach (Ticket::where('status', 'paid')->cursor() as $ticket) { /* ... */ }
```

Ek hi `select` chalta hai aur Laravel PDO se row ba row fetch kar ke ek ek model banata hai (generator). PHP mein hydrated models ka sirf ek hota hai. Lekin teen gotchas:

- MySQL ka PDO default **buffered query** use karta hai, yani driver poora result set pehle PHP memory mein la deta hai (raw rows, models nahi). Phir bhi bade tables par memory badh sakti hai. Unbuffered karne ke liye `config/database.php` ke `options` mein `PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => false`; phir ek connection par result poora parhne se pehle doosri query nahi chal sakti (error "unbuffered queries are active").
- Connection aur statement poore loop tak khule rehte hain, to lambi loop mein timeouts aur locks ka khatra.
- **Eager loading nahi hoti**, to loop mein relation access karoge to N+1 ban jata hai.

### Comparison

| Method | Queries | Memory (PHP) | Update safe? | Eager loading | Note |
| --- | --- | --- | --- | --- | --- |
| `chunk(n)` | ek per batch, OFFSET | n models | Nahi (rows skip) | Haan | bade offset slow |
| `chunkById(n)` | ek per batch, `id >` | n models | Haan | Haan | sab se safe aur fast |
| `lazy(n)` | `chunk` jaisi | n models | Nahi | Haan | simple LazyCollection API |
| `lazyById(n)` | `chunkById` jaisi | n models | Haan | Haan | updates ke liye `lazy` ka version |
| `cursor()` | ek query | 1 model, lekin driver buffer | Dhyan se | Nahi | connection lambi khuli |

**Interview line:** "Updates ho to `chunkById`/`lazyById`, kyunke keyset pagination rows skip nahi karti aur index par chalti hai. `chunk` offset par chalta hai aur filter badalne par rows chhor deta hai. `cursor` ek query stream karta hai lekin driver buffering aur eager loading ki limit hai."

Bonus: bade batch jobs mein sab se achha pattern: `chunkById` se ids ke chhote batches banao aur har batch ko queue job (`Bus::batch`) mein bhej do, taake workers parallel chalein aur ek job ki nakami baqi ko na roke.

## Deep dive 2: Load balancer kaise banate hain

### Concept

Load balancer (LB) app servers ke aage baithta hai aur requests ko unmein baantta hai. Faide: zyada traffic sambhalna, ek server girne par bhi service chalna (high availability), aur zero-downtime deploy (ek server nikalo, update karo, wapas lagao). Algorithms: **round robin** (baari baari), **least connections** (jis par kam active requests), **ip\_hash** (ek client hamesha ek server par, sticky). Aam web apps ke liye least connections ya round robin, aur app ko stateless rakhna.

### Nginx se load balancer (open source)

```nginx
upstream laravel_app {
    least_conn;
    server 10.0.0.11:80 max_fails=3 fail_timeout=10s;
    server 10.0.0.12:80 max_fails=3 fail_timeout=10s;
    server 10.0.0.13:80 backup;      # sirf tab jab baqi down hon
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name app.example.gov.pk;
    ssl_certificate     /etc/ssl/app.crt;
    ssl_certificate_key /etc/ssl/app.key;

    location / {
        proxy_pass http://laravel_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 3s;
        proxy_read_timeout 60s;
        proxy_next_upstream error timeout http_502 http_503;
    }
}
```

Note: open-source Nginx mein sirf **passive** health checks hain (`max_fails`: jab asal requests fail hon to server kuch der ke liye nikal jata hai). **Active** health checks (LB khud bar bar `/health` call kare) Nginx Plus mein hain, ya HAProxy mein:

```haproxy
frontend https_in
    bind *:443 ssl crt /etc/ssl/app.pem
    default_backend laravel

backend laravel
    balance leastconn
    option httpchk GET /up
    http-check expect status 200
    server app1 10.0.0.11:80 check inter 5s fall 3 rise 2
    server app2 10.0.0.12:80 check inter 5s fall 3 rise 2
```

Laravel 11 aur naye versions mein `/up` health route built-in hota hai; purane versions mein apna simple route banayein jo database aur Redis ping kare.

### App ko LB ke peeche chalane ke liye zaroori cheezein

1. **Stateless servers:** sessions, cache aur queue Redis mein (`SESSION_DRIVER=redis`), taake koi bhi server koi bhi request sambhal le.
2. **Shared uploads:** files object storage ya shared storage par, kisi ek server ki disk par nahi.
3. **Same `APP_KEY` aur config** har server par, aur sab par ek hi release deploy.
4. **Real client IP:** LB ke peeche `REMOTE_ADDR` LB ka IP hota hai. Laravel ko LB ka proxy hona batayen (trusted proxies, Laravel 11+ mein `bootstrap/app.php` mein `$middleware->trustProxies(at: '10.0.0.0/24')`), warna client IP, HTTPS detection aur rate limiting ghalat honge.
5. **Scheduler sirf ek server par:** `->onOneServer()` (Redis cache ke saath), warna har server same task chalayega.
6. **Logs aur monitoring central:** warna ek server ka masla nazar nahi aata.
7. **LB khud single point of failure na ho:** do LBs aur floating IP (keepalived/VRRP), ya cloud ka managed LB.

### Zero-downtime deploy ka flow

Ek server ko LB se `drain` karo (naye requests band, chalti requests khatam hone do), deploy aur migrations (backward-compatible), health check pass hone par wapas lagao, phir agla server.

### Test kaise karte hain

`curl` loop mein response header ya hostname dekh kar distribution check, ek backend band kar ke failover check, aur load test (k6) mein 502 aur 504 count. Interview line: "LB sirf traffic baantta hai; asal kaam yeh hai ke app stateless ho: sessions aur cache Redis mein, uploads shared, health checks active, aur LB ka khud redundant hona."

## Deep dive 3: Interface asal mein kya hai (sirf blueprint nahi)

"Interface blueprint hai, us mein code logic nahi" sach hai, lekin yeh interview mein kam hai. Asal baat: **interface wo cheez hai jis par caller depend karta hai, implementation par nahi.** Isse teen faide milte hain:

1. **Polymorphism (badli ho sakna):** ek hi code ke saath alag implementations chal sakti hain.
2. **Decoupling:** business code ko pata hi nahi ke neeche MySQL hai ya MongoDB, Stripe hai ya JazzCash.
3. **Testability:** test mein asli SMS ya payment ki jagah fake implementation.

Interface "kya kar sakta hai" (capability) batata hai; abstract class "kya hai aur kuch shared code" batati hai. Ek class kai interfaces implement kar sakti hai, lekin ek hi class extend.

### Misaal: GPS pings ka store (MySQL ya MongoDB)

```php
interface PingStore {
    public function save(int $trainId, float $lat, float $lng, \DateTimeInterface $at): void;
    public function latestFor(int $trainId): ?array;
}

final class MySqlPingStore implements PingStore {
    public function save(int $trainId, float $lat, float $lng, \DateTimeInterface $at): void {
        DB::table('pings')->insert(['train_id' => $trainId, 'lat' => $lat, 'lng' => $lng, 'pinged_at' => $at]);
    }
    public function latestFor(int $trainId): ?array {
        return (array) DB::table('pings')->where('train_id', $trainId)->latest('pinged_at')->first();
    }
}

final class MongoPingStore implements PingStore { /* collection insertOne / find sort limit 1 */ }
final class FakePingStore implements PingStore { /* array mein rakhta hai, tests ke liye */ }

final class IngestPing {
    public function __construct(private PingStore $store) {}   // interface par depend
    public function handle(array $p): void {
        $this->store->save($p['train'], $p['lat'], $p['lng'], now());
    }
}

// AppServiceProvider::register()
$this->app->bind(PingStore::class, fn () =>
    config('tracking.store') === 'mongo' ? new MongoPingStore : new MySqlPingStore);
```

`IngestPing` ka code ek lafz nahi badalta jab aap MySQL se MongoDB par shift karte hain: sirf binding badalti hai. Tests mein `$this->app->instance(PingStore::class, new FakePingStore)`.

### Laravel khud isi pe bana hai

- **Database layer:** query builder ka code MySQL, PostgreSQL aur SQLite par chalta hai kyunke har database ke liye alag *grammar* class same contract par chalti hai. Isi liye aap tests SQLite in-memory par chala sakte hain aur production MySQL par.
- `Illuminate\Contracts\Cache\Repository`, `Queue`, `Filesystem` (local, S3), `Mail`: driver badal do, code nahi badalta.
- **Marker interface:** `ShouldQueue`. Aap ki job ya listener class ye interface implement kare to framework use khud queue mein bhejta hai, interface ke andar koi method nahi, sirf capability ka ishara.
- `Arrayable`, `Responsable`, `Authenticatable`, `JsonSerializable`, `Countable`, `Stringable`: framework ya PHP aap ki class ko in ke zariye pehchanta hai.

**Interview line:** "Interface contract hai jo caller ke control mein hota hai: caller kehta hai mujhe yeh capability chahiye, kaun dega mujhe farq nahi. Isi se dependency inversion, swappable providers, aur fake ke saath testing mumkin hoti hai."

## Deep dive 4: Facade asal mein kya hai (static class nahi)

Facade ek **static-jaisi syntax wala proxy** hai jo asal mein container ke ek object ko call karta hai. Us mein business logic nahi hoti. Isliye "facade matlab static class" kehna galat hai: `Cache::get('k')` kisi static method ko nahi, ek zinda instance ko call karta hai.

In Laravel, a **Facade** is a class that provides a **"static" interface to services registered inside the application's Service Container**. \[[1](https://laravel.com/framework/docs/5.2/facades), [2](https://dev.to/anashussain284/laravel-facades-explained-why-they-feel-so-clean-and-powerful-1ldj)\]

While they look and feel like traditional static methods, they actually operate as **static proxies**. They dynamically resolve real, instanced objects out of the container behind the scenes and pass your calls to them. \[[1](https://masteryoflaravel.medium.com/the-facade-pattern-in-laravel-a-comprehensive-guide-2a9619e79375), [2](https://laravel.com/framework/docs/5.2/facades), [3](https://dev.to/anashussain284/laravel-facades-explained-why-they-feel-so-clean-and-powerful-1ldj)\]

### Andar kya hota hai

```php
// Illuminate\Support\Facades\Cache (sab se saada rup)
class Cache extends Facade {
    protected static function getFacadeAccessor() { return 'cache'; }
}

// Illuminate\Support\Facades\Facade (asal kaam)
public static function __callStatic($method, $args)
{
    $instance = static::getFacadeRoot();     // container se 'cache' resolve
    return $instance->$method(...$args);     // asal object par call
}
```

Steps: (1) `Cache::get('k')` likha, lekin `Cache` class mein static `get` hai hi nahi. (2) PHP isliye magic method `__callStatic` chalata hai. (3) Facade `getFacadeAccessor()` se naam leta hai (`'cache'` ya interface/class name), (4) container se wo instance resolve karta hai (aur yaad rakhta hai), (5) usi instance par wohi method call kar deta hai. `Cache::getFacadeRoot()` asal `CacheManager` object deta hai.

### Is design se kya milta hai

- **Mocking aur faking:** kyunke asal mein container ka object hai, aap usay badal sakte hain: `Mail::fake()`, `Queue::fake()`, `Http::fake()`, `Storage::fake('s3')`, `Cache::shouldReceive('get')->andReturn(1)`, aur `Facade::swap($fake)`. Asli static class ko mock karna mushkil hota hai.
- **Driver swap:** facade ke peeche config se koi bhi implementation (Redis, file, S3).
- **Short syntax:** constructor mein dependency likhe baghair kahin se bhi call.

### Custom facade banana

```php
// 1) class
final class SmsService { public function send(string $to, string $text): void { /* ... */ } }

// 2) binding (AppServiceProvider::register)
$this->app->singleton('sms', fn () => new SmsService);

// 3) facade
class Sms extends Facade {
    protected static function getFacadeAccessor() { return 'sms'; }
}

Sms::send('0300...', 'Ticket confirmed');   // asal mein (new SmsService)->send(...)
```

**Real-time facade:** koi bhi class bina alag facade class ke: `use Facades\App\Services\SmsService;` phir `SmsService::send(...)`: Laravel us class ke liye khud proxy bana deta hai.

### Facade vs helper vs dependency injection

| Tareeqa | Misaal | Kab |
| --- | --- | --- |
| Facade | `Cache::get()` | framework services, controllers ya routes mein jaldi kaam |
| Helper function | `cache()`, `auth()`, `now()` | wohi, aur bhi chhota |
| Constructor injection | `__construct(private Cache $cache)` | business classes, kyunke dependencies saaf nazar aati hain |

**Gotchas:** classes ki dependencies chhup jati hain (constructor dekh kar pata nahi chalta ke class Cache, Mail aur Queue use karti hai), aur zyada facades se class badi ho jati hai. Octane jaise long-running setups mein facade ki resolve ki hui instance cache hoti hai, to uski state request ke beech leak ho sakti hai (Octane isi liye resolved instances saaf karta hai).

**Interview line:** "Facade static class nahi, container ke object ka static proxy hai. `__callStatic` accessor se instance resolve karke method forward karta hai, isi liye `fake()` aur `swap()` kaam karte hain. Business logic ke liye main constructor injection prefer karta hoon, facade framework helpers ke liye."

## Deep dive 5: Service Container: sirf class resolve karna nahi

Container teen kaam karta hai: (1) **wiring:** kaun si cheez kis ko milegi, (2) **lifetime:** ek object kitni der zinda rahega, (3) **swap:** interface ke peeche kaun si implementation. Class resolve karna us ka sirf ek natija hai.

### Auto-wiring (reflection)

Constructor ke type-hints parh kar container khud dependency graph banata hai, bina kisi binding ke:

```php
class BookingService {
    public function __construct(private PaymentGateway $pay, private SeatRepository $seats) {}
}
// app(BookingService::class) -> container PaymentGateway aur SeatRepository ko khud resolve karega
```

Concrete class ho to binding ki zaroorat nahi. **Interface** ho to binding zaroori hai (container ko pata nahi kaun si class de). Primitive values (string, int) ke liye contextual binding ya default.

### `bind` vs `singleton` vs `scoped` vs `instance`

```php
$this->app->bind(Counter::class, fn () => new Counter);
app(Counter::class) === app(Counter::class);   // false: har baar nayi instance

$this->app->singleton(Counter::class, fn () => new Counter);
app(Counter::class) === app(Counter::class);   // true: ek hi instance
```

| Method | Lifetime | Kab |
| --- | --- | --- |
| `bind` | har resolve par nayi instance | chhote stateful objects, jinhein har baar fresh chahiye |
| `singleton` | application ke lifetime tak ek instance | mehngi to banne wali, stateless ya shared cheez (API client, config reader) |
| `scoped` | ek request ya job ke dauran ek instance, phir saaf | naye versions mein request-specific state (current division, tenant) |
| `instance` | aap ka bana banaya object register | tests mein fake, ya pehle se bana hua object |

**Bara gotcha:** PHP-FPM mein har request ke baad process ki memory saaf, to singleton bhi request tak hi zinda. Lekin **queue workers aur Octane** mein process lamba chalta hai, to singleton mein rakhi hui user, tenant ya request ki state agle job ya request mein leak hoti hai (data ek user ka doosre ko dikhna, security bug). Aise objects ke liye `scoped`, ya state ko object mein rakhne ke bajaye method ke parameter mein dein.

### Contextual binding: jahan jahan alag cheez

```php
$this->app->when(TicketPdfController::class)
    ->needs(Filesystem::class)
    ->give(fn () => Storage::disk('tickets'));

$this->app->when(ReportExporter::class)
    ->needs('$chunkSize')          // primitive value
    ->giveConfig('reports.chunk_size');
```

Ek hi interface (`Filesystem`) alag classes ko alag implementation de sakti hai.

### Tagging: ek interface ki kai implementations ek saath

```php
$this->app->tag([CsvReport::class, PdfReport::class, XlsxReport::class], 'reports');

$this->app->bind(ReportRunner::class, fn ($app) => new ReportRunner($app->tagged('reports')));
```

Strategy ya plugin pattern: nayi report class add karo, sirf tag list mein naam, runner ka code same.

### Extend: decorator laganha

```php
$this->app->extend(PaymentGateway::class, fn ($gateway, $app) => new LoggingGateway($gateway));
```

Asli gateway bina badle logging, caching ya retry ka layer lag jata hai.

### Runtime parameters aur method injection

```php
app()->makeWith(ReportExporter::class, ['from' => $from, 'to' => $to]);   // runtime values ke saath
app()->call([$job, 'handle']);                                           // method ki dependencies bhi inject
```

Controller methods, jobs ke `handle()`, aur route model binding isi mechanism se chalte hain.

### Container aur testing

```php
$this->app->instance(SmsGateway::class, new FakeSmsGateway);   // pura app fake use karega
$this->mock(PaymentGateway::class, fn ($m) => $m->shouldReceive('charge')->andReturnTrue());
```

**Interview line:** "Container wiring, lifetime aur swap sambhalta hai: auto-wiring reflection se, `singleton` shared objects ke liye, `scoped` request-specific state ke liye taake workers aur Octane mein leak na ho, contextual binding aur tagging se alag alag implementations, aur tests mein `instance` ya `mock` se fake."

## Deep dive 6: Subqueries: MySQL aur Laravel mein kaise likhein aur kyun

Subquery ek query ke andar doosri query hai. Kyun: "har row ke liye ek value dhoondo", "ek derived set se filter karo", ya "pehle summarize phir us par query", sab ek hi database round trip mein, PHP mein data la kar loop kiye baghair (isi se N+1 bhi rukta hai).

### Types aur examples (trains, pings, tickets)

**1) Scalar (correlated) subquery in SELECT: har train ka last speed**

```sql
SELECT t.id, t.name,
       (SELECT p.speed FROM pings p
         WHERE p.train_id = t.id
         ORDER BY p.pinged_at DESC LIMIT 1) AS last_speed
FROM trains t;
```

```php
Train::addSelect([
    'last_speed' => Ping::select('speed')
        ->whereColumn('train_id', 'trains.id')
        ->latest('pinged_at')->limit(1),
])->get();
```

"Correlated" ka matlab andar wali query bahar ki row (`t.id`) par depend karti hai, to har row ke liye chalti hai. Index `(train_id, pinged_at)` ho to har lookup ek seek hai.

**2) `IN` subquery: jin trains ne pichle 5 minute mein ping bheji**

```sql
SELECT * FROM trains
WHERE id IN (SELECT train_id FROM pings WHERE pinged_at > NOW() - INTERVAL 5 MINUTE);
```

```php
Train::whereIn('id', Ping::select('train_id')->where('pinged_at', '>', now()->subMinutes(5)))->get();
```

**3) `EXISTS`: kam se kam ek ping wali trains**

```sql
SELECT * FROM trains t
WHERE EXISTS (SELECT 1 FROM pings p WHERE p.train_id = t.id);
```

```php
Train::whereExists(fn ($q) => $q->select(DB::raw(1))->from('pings')->whereColumn('pings.train_id', 'trains.id'))->get();

Train::whereHas('pings')->get();   // Eloquent: andar yehi EXISTS bantaa hai
Train::withExists('pings')->get(); // pings_exists ka boolean column
Train::withCount('pings')->get();  // (select count(*) from pings ...) as pings_count
```

`whereHas`, `withCount` aur `withExists` andar subquery hi banate hain.

**4) Derived table (FROM mein subquery): roz ki revenue ka average**

```sql
SELECT AVG(d.revenue)
FROM (SELECT DATE(created_at) AS day, SUM(amount) AS revenue
      FROM tickets GROUP BY DATE(created_at)) AS d;
```

```php
DB::query()->fromSub(
    DB::table('tickets')->selectRaw('DATE(created_at) as day, SUM(amount) as revenue')->groupByRaw('DATE(created_at)'),
    'd'
)->avg('d.revenue');
```

**5) Join with subquery (`joinSub`): har train ki latest ping time ke saath**

```php
$latest = Ping::select('train_id', DB::raw('MAX(pinged_at) as last_at'))->groupBy('train_id');

Train::joinSub($latest, 'lp', 'lp.train_id', '=', 'trains.id')
     ->select('trains.*', 'lp.last_at')->get();
```

### Kab kya (aur performance)

- **Correlated subquery** har row par chalti hai. Choti ya filtered outer set aur sahi index (correlation column par) ho to bohat fast; bade outer set aur bina index ho to slow.
- MySQL 8 optimizer `IN` aur `EXISTS` ko aksar semijoin mein badal deta hai aur derived tables ko merge kar deta hai, lekin pakka karne ke liye hamesha `EXPLAIN`.
- **`NOT IN (subquery)` ka jaal:** agar subquery mein ek bhi `NULL` aaye to poora `NOT IN` kuch return nahi karta. `NOT EXISTS` use karein.
- **Latest-per-group bade scale par:** correlated subquery ya window function (`ROW_NUMBER`) bohat badi `pings` table par bhaari ho sakte hain. Wahan alag `train_latest` summary table (Q34) behtar hai, aur subquery ya window function sirf chhote ya filtered data par.
- Subquery ya join ka faisla sirf padh kar nahi, measure karke.

### EXPLAIN: MySQL aur Laravel mein plan kaise dekhein

```sql
EXPLAIN SELECT t.id FROM trains t WHERE EXISTS (SELECT 1 FROM pings p WHERE p.train_id = t.id);
EXPLAIN ANALYZE SELECT ...;   -- MySQL 8.0.18+: query asal mein chalata hai aur real timing deta hai
```

Dekhne ki cheezein: har table ka `type` (`ALL` matlab full scan), `key` (kaun sa index), `rows` (andaza), `Extra` (`Using filesort`, `Using temporary`, `Using index`), aur subquery wali rows par `select_type` (`DEPENDENT SUBQUERY` matlab correlated, har row par chalti hai).

Laravel mein:

```php
$query = Train::whereHas('pings');

$query->toSql();                 // placeholders ke saath SQL
$query->getBindings();           // un ki values
$query->toRawSql();              // values ke saath poori SQL (naye Laravel versions)
$query->explain();               // EXPLAIN ka natija (query builder par maujood)
DB::select('EXPLAIN ANALYZE ' . $query->toRawSql());   // asal timing ke liye
```

Ya development mein `DB::listen(fn ($q) => logger($q->sql, ['ms' => $q->time]))` se har query ka waqt log karein, aur Telescope ya Debugbar se slow queries pakdein.

**Interview line:** "Subquery se main per-row value, derived set ya existence check ek hi query mein nikalta hoon, jo PHP loop aur N+1 se behtar hai. Correlated subquery ke liye correlation column par index lagata hoon, `NOT EXISTS` ko `NOT IN` par tarjeeh deta hoon, bade latest-per-group ke liye summary table, aur har faisla `EXPLAIN` se verify karta hoon."

## Quick revision table

| Topic | Ek line mein |
| --- | --- |
| `chunk` | OFFSET par pages: updates mein rows skip, bade offset slow |
| `chunkById` | `id >` par pages: safe aur fast |
| `lazy`/`lazyById` | chunks ka LazyCollection API; memory ek chunk |
| `cursor` | ek query, ek row; driver buffer, eager loading nahi |
| Load balancer | traffic baantta hai; app stateless, active health checks, LB redundant |
| Interface | caller ka contract: swap, decouple, fake ke saath test |
| Facade | container ke object ka static proxy (`__callStatic`) |
| Container | wiring + lifetime + swap: auto-wiring, `singleton`/`scoped`, contextual, tags |
| Subquery | per-row value, `IN`, `EXISTS`, derived table; correlated ko index chahiye |
| EXPLAIN | `type`, `key`, `rows`, `Extra`; Laravel mein `explain()` ya `EXPLAIN ANALYZE` |

# Part 4: MySQL deep dives (joins, group by aur baqi terms)

Sab examples in tables par hain: `stations(id, name, division_id)`, `trains(id, name, zone)`, `tickets(id, train_id, station_id, user_id, amount, status, created_at)`, `pings(id, train_id, speed, pinged_at)`. Har topic mein pehle MySQL, phir Laravel, phir gotchas aur interview line.

## Deep dive 7: Joins

Join do (ya zyada) tables ki rows ko ek condition (`ON`) par jorta hai. Normalized database mein data alag tables mein hota hai (trains alag, tickets alag), aur report ke liye unhein jorna parta hai.

### Types

```sql
-- INNER JOIN: sirf wo rows jahan dono taraf match mile
SELECT t.name, k.id, k.amount
FROM trains t
INNER JOIN tickets k ON k.train_id = t.id;

-- LEFT JOIN: left table ki SAARI rows; match na ho to right ke columns NULL
SELECT t.name, k.id
FROM trains t
LEFT JOIN tickets k ON k.train_id = t.id;

-- Anti-join: wo trains jin ka ek bhi ticket nahi
SELECT t.*
FROM trains t
LEFT JOIN tickets k ON k.train_id = t.id
WHERE k.id IS NULL;                       -- ya NOT EXISTS (subquery)

-- RIGHT JOIN: LEFT ka ulta (aksar tables ulta kar ke LEFT hi likhte hain)

-- FULL OUTER JOIN: MySQL mein nahi; LEFT aur RIGHT ka UNION
SELECT ... FROM a LEFT JOIN b ON ... UNION SELECT ... FROM a RIGHT JOIN b ON ...;

-- CROSS JOIN: har row x har row (cartesian), jaise dates x stations ka grid
SELECT d.day, s.id FROM calendar d CROSS JOIN stations s;

-- SELF JOIN: table apne aap se, jaise staff aur uska manager
SELECT e.name, m.name AS manager
FROM staff e LEFT JOIN staff m ON m.id = e.manager_id;
```

Yaad rakhne ka tareeqa: **INNER** = intersection, **LEFT** = left sab plus match, **anti-join** = LEFT plus `IS NULL`, **CROSS** = har combination.

### Join andar se kaise chalta hai

- MySQL aam tor par **nested loop** karta hai: pehli table ki har row ke liye doosri table mein index se match dhoondta hai. Isliye **join column par index lazmi** hai, khaas kar foreign key wali column par (`tickets.train_id`).
- Jahan index na ho wahan MySQL 8.0.18 ke baad **hash join** use kar sakta hai (chhoti table ko memory mein hash bana kar bari table se match), jo bina index ke nested loop se kaafi behtar hai, lekin sahi index phir bhi behtar.
- Join columns ka **data type same** ho (int ke saath int, same charset ke strings), warna index use nahi hota.
- Check kaise: `EXPLAIN`. Joined table par `type = ALL` ka matlab har row par full scan, yani index missing. `eq_ref` ya `ref` achhe signs hain.

### Chaar bade gotchas

**1) LEFT JOIN ke baad WHERE right table par, join ko INNER bana deta hai**

```sql
-- galat: NULL wali rows WHERE se nikal jati hain, LEFT ka faida khatam
SELECT t.name, k.id FROM trains t
LEFT JOIN tickets k ON k.train_id = t.id
WHERE k.status = 'paid';

-- sahi: right table ki condition ON mein
SELECT t.name, k.id FROM trains t
LEFT JOIN tickets k ON k.train_id = t.id AND k.status = 'paid';
```

**2) Fan-out: one-to-many join se totals double ho jate hain**

`trains JOIN tickets JOIN refunds` mein agar ek ticket ke 2 refunds hon, to ticket ki row 2 baar aati hai aur `SUM(amount)` double ho jata hai. Fix: pehle har table ko apni level par aggregate karo (subquery ya `joinSub`), phir join karo; ya `COUNT(DISTINCT k.id)`.

**3) Same naam ke columns (`id`)** do tables mein: select mein alias dein (`t.id AS train_id`), warna ek `id` doosri ko overwrite kar deta hai.

**4) Bade join mein filter pehle:** WHERE conditions jo ek table par hon unhein aisa likho ke index use ho, taake join se pehle rows kam ho jayen.

### Laravel mein

```php
DB::table('tickets as k')
    ->join('trains as t', 't.id', '=', 'k.train_id')           // INNER
    ->leftJoin('stations as s', 's.id', '=', 'k.station_id')   // LEFT
    ->select('k.id', 't.name as train', 's.name as station', 'k.amount')
    ->where('k.status', 'paid')
    ->get();

// LEFT JOIN mein extra ON condition
DB::table('trains as t')->leftJoin('tickets as k', function ($join) {
    $join->on('k.train_id', '=', 't.id')->where('k.status', '=', 'paid');
})->get();

// aur: rightJoin, crossJoin('calendar'), joinSub, leftJoinSub
```

**Important: Eloquent ka `with()` join NAHI hai.**

```php
Ticket::with('train')->get();
// select * from tickets;
// select * from trains where id in (1, 2, 3, ...);     <- doosri alag query
```

| Tareeqa | Kab |
| --- | --- |
| `with()` | models aur relations chahiye, rows duplicate na hon (2 queries, N+1 nahi) |
| `join()` | related column par filter, sort ya report ke columns chahiye (ek query) |
| `whereHas()` | sirf "kisi related row ka hona" check karna hai (EXISTS) |

Join ke saath Eloquent models lein to `select('tickets.*')` zaroor, warna related table ke columns model ke attributes ko overwrite kar dete hain:

```php
Ticket::join('trains', 'trains.id', '=', 'tickets.train_id')
    ->orderBy('trains.name')          // related column par sort
    ->select('tickets.*')
    ->get();
```

**Interview line:** "INNER sirf matches deta hai, LEFT left ki saari rows. LEFT JOIN mein right table ki condition ON mein rakhta hoon, warna wo INNER ban jata hai. One-to-many join mein totals double na hon isliye pehle aggregate phir join. Aur join columns par index aur EXPLAIN se verify."

## Deep dive 8: GROUP BY, aggregates aur HAVING

GROUP BY rows ko ek ya zyada columns ki value ke hisaab se groups mein samet deta hai, aur har group par aggregate function (COUNT, SUM, AVG, MIN, MAX) chalta hai. Result mein har group ki ek row aati hai.

### Aggregate functions

| Function | Kya karta hai |
| --- | --- |
| `COUNT(*)` | rows ki tadaad (NULL wali bhi) |
| `COUNT(col)` | sirf un rows jahan `col` NULL nahi |
| `COUNT(DISTINCT col)` | alag alag non-NULL values |
| `SUM(col)`, `AVG(col)` | NULL ignore karte hain. Sab NULL hon to result NULL, to `COALESCE(SUM(x), 0)` |
| `MIN`, `MAX` | chhota aur bara |
| `GROUP_CONCAT(col ORDER BY col SEPARATOR ', ')` | group ki values ek string mein (limit `group_concat_max_len`, default 1024) |

### Misaal: station aur din ke hisaab se revenue

```sql
SELECT station_id,
       DATE(created_at) AS day,
       COUNT(*)         AS tickets,
       SUM(amount)      AS revenue
FROM tickets
WHERE status = 'paid'
  AND created_at >= '2026-10-01' AND created_at < '2026-11-01'
GROUP BY station_id, DATE(created_at)
HAVING SUM(amount) > 100000
ORDER BY revenue DESC;
```

### WHERE vs HAVING

- **WHERE** grouping se **pehle** rows filter karta hai (aggregate use nahi kar sakta, lekin index use karta hai).
- **HAVING** grouping ke **baad** groups filter karta hai (aggregate use kar sakta hai).
- Rule: jo condition row par ho wo WHERE mein, sirf aggregate wali condition HAVING mein. Isse database kam rows group karta hai.
- Date range ko hamesha `created_at >= ... AND created_at < ...` likho, `WHERE DATE(created_at) = ...` nahi: function lagane se index use nahi hota.

### Conditional aggregation (ek query mein kai counts)

```sql
SELECT station_id,
       SUM(status = 'paid')      AS paid,
       SUM(status = 'cancelled') AS cancelled,
       SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid_amount
FROM tickets
GROUP BY station_id;
```

MySQL mein `status = 'paid'` 1 ya 0 deta hai, isliye `SUM(...)` seedha count ban jata hai. Yeh dashboards ke liye bohat kaam ka pattern hai: ek query, kai metrics.

### Subtotals: `WITH ROLLUP`

```sql
SELECT station_id, DATE(created_at) AS day, SUM(amount) AS revenue
FROM tickets WHERE status = 'paid'
GROUP BY station_id, DATE(created_at) WITH ROLLUP;
-- extra rows: har station ka subtotal (day = NULL) aur grand total (dono NULL)
```

### `ONLY_FULL_GROUP_BY`

MySQL 5.7 ke baad default mode mein agar SELECT mein aisa column ho jo na GROUP BY mein hai na aggregate hai, to error aata hai: *"this is incompatible with sql\_mode=only\_full\_group\_by"*. Laravel ka `'strict' => true` (MySQL connection config) isay on rakhta hai. Fix: column ko GROUP BY mein daalo, ya aggregate lagao (`MAX(name)`), ya functionally dependent column ho to `ANY_VALUE()`. Mode band karna fix nahi, sirf masla chhupana hai.

### Laravel mein

```php
DB::table('tickets')
    ->selectRaw('station_id, DATE(created_at) as day, COUNT(*) as tickets, SUM(amount) as revenue')
    ->where('status', 'paid')
    ->where('created_at', '>=', $from)->where('created_at', '<', $to)
    ->groupBy('station_id', DB::raw('DATE(created_at)'))
    ->having('revenue', '>', 100000)       // ya havingRaw('SUM(amount) > ?', [100000])
    ->orderByDesc('revenue')
    ->get();

// Eloquent: relations par aggregates (andar subquery)
Train::withCount('tickets')
     ->withSum('tickets as revenue', 'amount')
     ->withCount(['tickets as paid_tickets' => fn ($q) => $q->where('status', 'paid')])
     ->get();
```

### Gotchas

- Join ke baad `COUNT(*)` rows double kar sakta hai (fan-out): `COUNT(DISTINCT k.id)`.
- `DATE(created_at)` UTC aur Pakistan time ka farq: din ki boundaries ghalat ho sakti hain, time zone convert karke group karein.
- GROUP BY **rows collapse** karta hai; agar har row bhi chahiye aur saath mein aggregate, to **window function** (`SUM(amount) OVER (PARTITION BY station_id)`).
- `GROUP BY` ke liye index (jo WHERE aur GROUP BY columns ko cover kare) temporary table aur filesort bacha sakta hai: `EXPLAIN` mein `Using temporary` dekhein.

**Interview line:** "WHERE rows ko grouping se pehle filter karta hai aur index use karta hai, HAVING groups ko baad mein. COUNT(\*) sab rows ginta hai, COUNT(col) sirf non-NULL. Conditional aggregation se ek query mein kai metrics, aur date range ko raw column par likhta hoon taake index chale."

## Deep dive 9: SQL ka logical execution order (bohat important)

Aap jo likhte hain (SELECT pehle) aur MySQL jis tarteeb mein sochta hai wo alag hai:

```
1. FROM / JOIN     (tables aur joins)
2. WHERE           (rows filter)
3. GROUP BY        (groups banao)
4. HAVING          (groups filter)
5. SELECT          (columns aur aliases compute)
6. DISTINCT
7. Window functions (OVER ...)
8. ORDER BY
9. LIMIT / OFFSET
```

(Window functions logically `SELECT` ke saath, `GROUP BY` aur `HAVING` ke baad chalte hain.)

**Is ke natije:**

- **WHERE mein SELECT ka alias nahi chalta**, kyunke SELECT baad mein hota hai:

```sql
SELECT amount * 1.17 AS total FROM tickets WHERE total > 1000;   -- ERROR
SELECT amount * 1.17 AS total FROM tickets WHERE amount * 1.17 > 1000;   -- theek
```

MySQL GROUP BY, HAVING aur ORDER BY mein alias allow karta hai (extension), WHERE mein nahi.

- **Window function ke result par WHERE nahi lag sakta:** `WHERE rn = 1` ke liye subquery ya CTE mein lapetna parta hai (Deep dive 6 ka latest-per-train).
- **LIMIT sab se aakhir mein** lagta hai: `ORDER BY` ke saath na ho to konsi rows milengi pakka nahi.
- **WHERE sab se pehle** rows kam karta hai, isliye heavy filters wahin lagao.

**Interview line:** "Logical order hai FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT. Isi liye WHERE mein alias nahi chalta aur window function ke result par filter ke liye CTE ya subquery chahiye."

## Deep dive 10: NULL, DISTINCT, UNION, CASE aur handy functions

### NULL ka matlab "maloom nahi"

NULL zero ya khali string nahi, "unknown" hai. Is liye:

- `NULL = NULL` true nahi hota (result NULL). Check ke liye `IS NULL` / `IS NOT NULL`. Null-safe barabari ke liye `<=>`.
- `COUNT(col)`, `SUM`, `AVG` NULL ignore karte hain. `COUNT(*)` NULL wali rows bhi ginta hai.
- `SUM` ka sab NULL par result NULL: `COALESCE(SUM(amount), 0)`.
- `NOT IN (subquery)` mein ek NULL aaye to koi row nahi milti: `NOT EXISTS` use karein.
- Division by zero se bachne ke liye: `amount / NULLIF(count, 0)` (zero ko NULL bana deta hai, to result NULL aata hai, error nahi).
- UNIQUE index mein kai NULL values allowed hain.

```sql
SELECT COALESCE(SUM(amount), 0) AS revenue FROM tickets WHERE station_id = 99;   -- 0, NULL nahi
SELECT IFNULL(phone, 'N/A') FROM users;
```

Laravel: `whereNull('col')`, `whereNotNull('col')`, `selectRaw('COALESCE(SUM(amount), 0) as revenue')`.

### DISTINCT vs GROUP BY

`SELECT DISTINCT station_id FROM tickets` sirf duplicates hataata hai. `GROUP BY` duplicates hataata hai aur saath mein aggregate nikalne deta hai. Sirf unique list chahiye to DISTINCT, aggregate chahiye to GROUP BY. `COUNT(DISTINCT user_id)` unique users ginta hai. Laravel: `->distinct()`, `->select('station_id')->distinct()`.

### UNION vs UNION ALL

`UNION` do queries ke results jorta hai **aur duplicates hata deta hai** (is ke liye extra sort ya temporary table). `UNION ALL` sab rakhta hai aur tez hai. Jab duplicates ka masla na ho (ya na ho sakta ho) to `UNION ALL`. Dono queries ke columns ki tadaad aur types barabar hon. Laravel: `$a->union($b)`, `$a->unionAll($b)`.

### CASE WHEN aur IF

```sql
SELECT id,
       CASE WHEN amount >= 5000 THEN 'high'
            WHEN amount >= 1000 THEN 'medium'
            ELSE 'low' END AS band
FROM tickets;

SELECT IF(status = 'paid', 1, 0) AS is_paid FROM tickets;
```

### Dates (reports mein sab se zyada)

```sql
WHERE created_at >= NOW() - INTERVAL 7 DAY
SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) FROM tickets GROUP BY month;
SELECT TIMESTAMPDIFF(MINUTE, started_at, ended_at) AS minutes FROM trips;
SELECT CONVERT_TZ(created_at, '+00:00', '+05:00') FROM tickets;   -- UTC se Pakistan
```

Rule: range ko hamesha column par rakho (`created_at >= ...`), function column par nahi, taake index chale.

### BETWEEN ka jaal

`BETWEEN` dono sirey shamil karta hai. `created_at BETWEEN '2026-10-01' AND '2026-10-31'` 31 October ki 00:00:00 ke baad ki rows chhor deta hai. Behtar: `created_at >= '2026-10-01' AND created_at < '2026-11-01'`. Laravel mein `whereBetween` mein bhi yehi dhyan.

### Search

- `LIKE 'abc%'` index use kar sakta hai, `LIKE '%abc'` ya `'%abc%'` nahi.
- Poore text ke liye **FULLTEXT** index: `MATCH(name) AGAINST('lahore' IN NATURAL LANGUAGE MODE)`. Laravel: `$table->fullText('name')` aur `whereFullText('name', 'lahore')`.
- `ORDER BY RAND()` bari table par bohat slow (poori table sort). Alternative: random id range ya precomputed list.

## Deep dive 11: Data likhna: INSERT, UPDATE, DELETE ke variants

```sql
-- multi-row insert (tez, ek round trip)
INSERT INTO tickets (train_id, station_id, amount) VALUES (1, 2, 500), (1, 3, 700);

-- upsert: nahi hai to insert, hai to update (unique key par)
INSERT INTO train_latest (train_id, lat, lng, pinged_at) VALUES (7, 31.5, 74.3, NOW())
ON DUPLICATE KEY UPDATE lat = VALUES(lat), lng = VALUES(lng), pinged_at = VALUES(pinged_at);

-- INSERT IGNORE: duplicate par error ko warning bana kar chhor deta hai (khatarnak: baqi errors bhi chhup sakte hain)
INSERT IGNORE INTO tickets_import ...;

-- REPLACE INTO: duplicate par purani row DELETE phir naya INSERT: id badal jati hai, foreign keys aur triggers par asar. Aam tor par avoid.

-- UPDATE with JOIN
UPDATE tickets k
JOIN trains t ON t.id = k.train_id
SET k.zone = t.zone
WHERE k.zone IS NULL;

-- DELETE with JOIN, aur bade delete batches mein
DELETE k FROM tickets k JOIN trains t ON t.id = k.train_id WHERE t.name = 'Retired';
DELETE FROM pings WHERE pinged_at < NOW() - INTERVAL 90 DAY LIMIT 10000;   -- baar baar chalao jab tak 0 rows
```

### DELETE vs TRUNCATE vs DROP

| Command | Kya karta hai | Rollback? | Note |
| --- | --- | --- | --- |
| `DELETE` | row ba row delete, `WHERE` chal sakta hai | haan (transaction mein) | slow, triggers chalte hain, AUTO\_INCREMENT wahin rehta hai |
| `TRUNCATE` | poori table khali, tez | nahi (implicit commit) | AUTO\_INCREMENT reset, foreign key wali table par masla |
| `DROP` | table hi khatam | nahi | structure bhi gaya |

### Laravel equivalents

```php
Ticket::insert($rows);                                             // multi-row
TrainLatest::upsert($rows, ['train_id'], ['lat', 'lng', 'pinged_at']);   // upsert
DB::table('tickets_import')->insertOrIgnore($rows);                // INSERT IGNORE
DB::table('tickets as k')->join('trains as t', 't.id', '=', 'k.train_id')
    ->whereNull('k.zone')->update(['k.zone' => DB::raw('t.zone')]);   // UPDATE with JOIN
DB::table('pings')->where('pinged_at', '<', now()->subDays(90))->limit(10000)->delete();   // naye versions mein limit with delete ka khayal rakhein
Schema::disableForeignKeyConstraints(); DB::table('x')->truncate(); Schema::enableForeignKeyConstraints();
```

### Safety rules (production mein)

1. UPDATE ya DELETE se pehle wohi WHERE ek `SELECT COUNT(*)` mein chala kar dekho.
2. Transaction mein chalao, result dekho, phir `COMMIT`.
3. Bade delete aur update batches mein (ek baar mein 1 crore rows lock aur replication lag banate hain).
4. Manual sessions mein `--safe-updates` (WHERE ya LIMIT ke baghair UPDATE/DELETE band).
5. Backup ya point-in-time recovery ready.

## Deep dive 12: Keys, constraints, index types, engine, charset

### Constraints (data ki hifazat database ke andar)

| Constraint | Kaam |
| --- | --- |
| `PRIMARY KEY` | har row ki unique pehchan (NOT NULL), InnoDB mein clustered index |
| `FOREIGN KEY` | child row ka parent mein hona zaroori; `ON DELETE RESTRICT / CASCADE / SET NULL` |
| `UNIQUE` | value duplicate na ho (jaise `(train_id, seat_no, travel_date)`) |
| `NOT NULL`, `DEFAULT` | khali na ho, aur default value |
| `CHECK` | condition (jaise `amount >= 0`); MySQL 8.0.16 se enforce hota hai |
| `AUTO_INCREMENT` | khud barhne wala number |

```php
Schema::create('bookings', function (Blueprint $table) {
    $table->id();
    $table->foreignId('train_id')->constrained()->restrictOnDelete();
    $table->unsignedSmallInteger('seat_no');
    $table->date('travel_date');
    $table->unique(['train_id', 'seat_no', 'travel_date']);   // double booking ka asli ilaaj
    $table->index(['travel_date', 'train_id']);
});
```

FK actions: `CASCADE` parent delete par bachche bhi delete (khatarnak, audit data ke saath mat); `RESTRICT` delete rok deta hai; `SET NULL` link tor deta hai.

### Index ki qismein

| Type | Kab |
| --- | --- |
| `PRIMARY`, `UNIQUE` | pehchan aur uniqueness |
| Normal / composite | filter, join, sort (leftmost-prefix rule) |
| **Covering index** | query ke saare columns index mein hon to table touch nahi hoti (`Using index`) |
| `FULLTEXT` | text search |
| `SPATIAL` | location data |
| Prefix index | lambi string ke pehle N characters (`name(20)`) |
| Functional index (8.0.13+) | expression par (`(DATE(created_at))`) |
| Descending / invisible index (8.0) | sort order ya index ko hataye baghair test karna |

### Engine, charset, collation

- **InnoDB:** transactions, row-level locks, foreign keys, crash recovery. Aaj ka default aur lagbhag hamesha sahi. **MyISAM:** table-level locks, transactions nahi, crash mein kharab: avoid.
- **`utf8mb4`** hamesha (poora Unicode, emoji aur Urdu). Purana `utf8` sirf 3 bytes hota hai.
- **Collation** compare aur sort ke qaide tay karta hai (`utf8mb4_unicode_ci`, `utf8mb4_0900_ai_ci`): `ci` matlab case-insensitive, to unique index mein `Ali` aur `ali` takra sakte hain.

### SQL ke hisse (interview mein puchhte hain)

**DDL** (structure): CREATE, ALTER, DROP, TRUNCATE. **DML** (data): SELECT, INSERT, UPDATE, DELETE. **DCL** (access): GRANT, REVOKE. **TCL** (transactions): COMMIT, ROLLBACK, SAVEPOINT.

## Deep dive 13: Kaam ke admin commands

```sql
SHOW CREATE TABLE tickets;                 -- poori definition (columns, indexes, FKs, engine)
SHOW INDEX FROM tickets;                   -- indexes aur cardinality
SHOW FULL PROCESSLIST;                     -- abhi chal rahi queries (aur lambi atki hui)
KILL 12345;                                -- ek query ya connection band
SHOW ENGINE INNODB STATUS;                 -- latest deadlock, locks
ANALYZE TABLE tickets;                     -- statistics refresh (optimizer ke liye)
SELECT @@sql_mode, @@transaction_isolation;   -- mode aur isolation level
SHOW VARIABLES LIKE 'slow_query_log%';
SET GLOBAL slow_query_log = 1; SET GLOBAL long_query_time = 1;   -- 1 second se slow queries log

-- sab se bari tables
SELECT table_name, ROUND((data_length + index_length) / 1024 / 1024) AS mb
FROM information_schema.tables
WHERE table_schema = DATABASE()
ORDER BY mb DESC LIMIT 10;

-- sys schema: full table scan karne wali queries, aur unused indexes
SELECT * FROM sys.statements_with_full_table_scans LIMIT 10;
SELECT * FROM sys.schema_unused_indexes;
```

`OPTIMIZE TABLE` badi table se khali jagah wapas leta hai lekin table ko rebuild karta hai (bhaari), isliye production mein soch kar. Slow query log ke liye `pt-query-digest` se top slow queries ki list banti hai.

## Rapid-fire MySQL (bol kar practice)

- **INNER vs LEFT JOIN?** INNER sirf matches, LEFT left ki saari rows aur match na ho to NULL.
- **LEFT JOIN mein WHERE se kya hota hai?** Right table par WHERE NULL rows nikaal ke INNER bana deta hai; condition ON mein rakho.
- **WHERE vs HAVING?** WHERE grouping se pehle rows filter, HAVING baad mein groups.
- **COUNT(\*) vs COUNT(col)?** Pehla sab rows, doosra sirf non-NULL.
- **UNION vs UNION ALL?** UNION duplicates hata deta hai (slow), UNION ALL sab rakhta hai (fast).
- **DELETE vs TRUNCATE vs DROP?** Row-wise (rollback), poori table khali (implicit commit), table khatam.
- **PRIMARY vs UNIQUE?** Primary: ek hi, NOT NULL, clustered. Unique: kai ho sakte hain, NULL allowed.
- **Clustered vs secondary index?** Clustered mein table khud PK order mein; secondary mein PK ki value saath hoti hai.
- **NULL = NULL?** NULL, true nahi: `IS NULL` use karo.
- **Execution order?** FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT.
- **Join slow kyun?** Join column par index nahi, type mismatch, ya fan-out: EXPLAIN dekho.
- **Duplicates kaise dhoondte hain?** `GROUP BY col HAVING COUNT(*) > 1`.
- **Eloquent `with()` aur join mein farq?** `with()` do alag queries hain (models plus relations), join ek query hai (columns, filter, sort ke liye).
