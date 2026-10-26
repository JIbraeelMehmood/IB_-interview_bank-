# Senior Laravel Production Scenarios (Part 1) + Laravel Data + Docker for Laravel

Questions English mein (jaise interview mein), answers Roman Urdu dev-style mein. Yeh asli production masail par hain, to har answer ka pattern: **pehle confirm/measure, phir cause, phir safe fix (bina downtime), phir verify, phir prevent.** Aakhir mein Laravel Data (Spatie) aur Docker image optimization ka Laravel version hai, kyunke un dono posts ke topics senior interviews mein aate hain. Note: jahan (F3), (F39), (F109) jaise numbers likhe hain wo "Failure-First Backend Interview" doc ke sawal hain, jahan wohi topic aur detail mein hai.

# Scenario 1: API production mein slow, locally theek, logs mein koi error nahi, DB CPU high

**Q1. How do you systematically debug and fix this without downtime?**

**Pehle yeh samjhein ke locally kyun theek chalta hai:** local mein data chhota hota hai (hazaron rows, production mein karoron), koi concurrency nahi, cache warm, aur indexes ka farq nazar nahi aata. Isi liye masla sirf production data par dikhta hai.

**Step 1: Scope confirm karo.** Kaun se endpoints slow hain (sab ya kuch), kab se (abhi ek deploy hua? koi naya feature? data ek limit paar kar gaya?), aur kitna (p95 latency, error rate nahi). Monitoring mein dekho latency kab barhi.

**Step 2: DB mein dekho kaun si queries CPU kha rahi hain.** Andaza nahi, data se:

```sql
-- sab se zyada waqt lene wali queries (performance_schema)
SELECT DIGEST_TEXT, COUNT_STAR,
       ROUND(SUM_TIMER_WAIT/1e12, 1) AS total_s,
       ROUND(AVG_TIMER_WAIT/1e9, 1)  AS avg_ms,
       SUM_ROWS_EXAMINED
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC LIMIT 10;

SHOW FULL PROCESSLIST;   -- abhi kya chal raha hai, kaun atka hua hai
```

Saath mein slow query log (`pt-query-digest`), aur app side par Telescope ya Pulse ya APM jo batayein ke kaun se endpoint kitni queries chalata hai.

**Step 3: Top query ko `EXPLAIN` karo (production-size data par, replica ya clone par).** `type = ALL`, bara `rows`, `Using filesort` ya `Using temporary` dekho. Aam wajahein:

- **Missing ya ghalat index** (data barha to scan mehnga hua).
- **N+1** (ek endpoint par saikron queries).
- **Heavy `whereHas`, `select *`, ya bina limit ke query.**
- **Plan badal gaya** (purani statistics, `ANALYZE TABLE` se refresh).
- **Cache miss ya stampede** (cache expire hua aur sab DB par).
- **Lock contention** (lambi transactions, `information_schema.innodb_trx`).
- **Naya report ya cron** jo heavy query chala raha hai.

**Step 4: Bina downtime fix.**

- Index: online, `ALTER TABLE ... ADD INDEX ..., ALGORITHM=INPLACE, LOCK=NONE` ya gh-ost (bari table par), kam traffic waqt, replication lag dekh kar.
- Query rewrite: `with()`, zaroori columns, composite index ke mutabiq filter, keyset pagination.
- Cache (Redis) read-heavy endpoint par, stampede se bachne ke liye lock.
- Heavy reads read replica par, aur agar zaroori ho to temporarily rate limiting ya feature band (load shedding).
- Har change ek ek karke, taake pata chale kisne asar kiya.

**Step 5: Verify aur rollback plan.** Fix ke baad p95, DB CPU aur slow query counts ka before/after number. Rollback: index drop ho sakta hai, feature flag wapas.

**Step 6: Prevent.** Slow query alerts, production jaisa data staging par, load tests (k6), query count assertions tests mein (N+1 par fail), aur `Model::preventLazyLoading()` non-production mein.

**Interview line:** "Locally data chhota hota hai, isliye masla chhupa rehta hai. Main pehle DB se top queries nikaalta hoon, EXPLAIN production-size data par karta hoon, phir online index ya query fix, aur before/after metrics se verify."

# Scenario 2: Soft deletes kuch tables mein, kuch mein nahi; ab historical reporting mein deleted records bhi chahiye

**Q2. How would you redesign queries and models without breaking existing APIs?**

**Asal masla:** jin tables mein soft delete nahi, wahan deleted rows **hain hi nahi** (hard delete ho chuki). Jin mein hai, wahan `deleted_at` se mil jati hain. To do alag situations hain.

**Principle: maujooda API ka behavior kabhi nahi badalna.** Default queries wohi rahen (deleted rows chhupi). Naye reporting ke liye alag, opt-in raasta.

**1) Jin tables mein `SoftDeletes` hai:**

```php
// reporting query ya service mein
Ticket::withTrashed()->whereBetween('created_at', [$from, $to])->get();   // sab (deleted bhi)
Ticket::onlyTrashed()->count();                                           // sirf deleted

// relations mein bhi: report ke liye trashed parent ya child chahiye
public function trainWithTrashed() { return $this->belongsTo(Train::class, 'train_id')->withTrashed(); }
```

Reports ke liye ek alag **query class ya reporting service** jo hamesha `withTrashed()` use kare, taake controllers aur purani APIs ko na chhedna pare. API mein agar zaroorat ho to ek optional parameter `?include_deleted=1`, sirf authorized roles ke liye.

**2) Jin tables mein soft delete nahi:**

- Naya column `deleted_at` (nullable) aur index, migration se (bari table par online, F109 ka khayal).
- Delete ko soft delete mein badlo (`use SoftDeletes`), lekin **purani hard-deleted rows wapas nahi aati**. Unke liye agar audit log, binary logs ya backups hain to wahan se backfill (ek baar ka kaam), warna maan lo ke history sirf aaj se shuru hogi, aur business ko saaf batao.
- Alternative: delete se pehle row ko `*_archive` table mein copy (trigger ya observer), ya audit log (activitylog) mein snapshot.

**3) Baqi design ke nukte:**

- **Unique constraints:** soft-deleted row bhi unique value pakre rehti hai. Unique key mein `deleted_at` shamil karo ya restore ka flow rakho.
- **Foreign keys aur cascade:** soft delete mein cascade nahi chalta, to child records ka behavior tay karo (Eloquent `cascadeDeletes` ya events).
- **Reporting ke liye alag read model:** summary tables ya view jis mein `is_deleted` flag ho, taake bade reports `withTrashed` scans par na chalen.
- **Consistency:** ek trait ya convention (sab business tables par soft delete) aur ek test jo check kare ke naye tables mein bhi wohi ho.
- **Tests:** purani API ke tests badle bina pass hon (backward compatibility ka saboot), naye reports ke tests deleted rows ke saath.
- **Access control:** deleted data dekhna ek alag permission, aur `forceDelete` sirf restricted role.

**Interview line:** "Default behavior nahi badalta. Reporting ke liye opt-in `withTrashed()` alag service mein. Jahan soft delete nahi wahan `deleted_at` add karta hoon, lekin purani hard-deleted history audit ya backup se hi aa sakti hai, aur business ko yeh pehle batata hoon."

# Scenario 3: Queue worker ek hi job kai baar chala raha hai, duplicate payments

**Q3. What Laravel features would you use to guarantee idempotency, and why?**

**Pehle sach:** koi bhi ek feature "guarantee" nahi deta. Queues at-least-once hain. Guarantee ek se zyada darjon ka mel hai, aur aakhri guarantee **database ya provider** deta hai.

**Pehle wajah dhoondo (duplicates kyun chale):** `retry_after` job `timeout` se chhota (F3), worker crash ya deploy beech mein, job ko do baar dispatch kiya gaya, ya payment call ka timeout aur blind retry.

**Layers (andar se bahar):**

1. **Payment provider ka idempotency key** (jaise `Idempotency-Key` header): har payment attempt ki ek key (`order-{id}-attempt-{n}`). Retry par provider wohi result deta hai, naya charge nahi. Sab se mazboot layer kyunke paisa wahan katta hai.
2. **Database unique constraint:** `payments` table par `provider_reference` ya `(order_id, kind)` unique. Dusri koshish par duplicate-key error, jo sab se pakki rok hai.
3. **State transition with conditional update:** `UPDATE orders SET status='paid' WHERE id=? AND status='pending'` aur affected rows check (0 matlab pehle hi ho chuka).
4. **`ShouldBeUnique` (+ `uniqueId()`, `uniqueFor`):** ek hi key ki job queue mein dobara dispatch hone se rokta hai. Yeh **dispatch-level** rok hai, processing ke dauran lock jab tak job khatam ya sab attempts fail na hon. Variant `ShouldBeUniqueUntilProcessing` processing shuru hote hi lock chhor deta hai. Lock expire ho sakta hai, isliye akela kaafi nahi.
5. **`WithoutOverlapping` job middleware:** ek hi key par ek waqt mein ek hi job chale (`new WithoutOverlapping($orderId)`), race ke dauran do workers ko rokta hai.
6. **Retry config:** `$tries`, `$backoff`, `$timeout`, aur `retry_after` > timeout, `$failOnTimeout`. Payment jobs ke liye `tries` kam (ya 1) aur failure par reconciliation.
7. **`afterCommit()`:** job tab dispatch ho jab order commit ho chuka ho.
8. **Transaction + `lockForUpdate()`:** order row lock kar ke state check, phir kaam.
9. **Reconciliation job:** provider se asal status mila kar `unknown` aur `pending` ko theek karna.

```php
class ChargeOrder implements ShouldQueue, ShouldBeUnique {
    use Queueable;
    public int $tries = 3;
    public array $backoff = [30, 120];
    public int $timeout = 30;                 // retry_after config mein isse bara
    public int $uniqueFor = 3600;

    public function __construct(public int $orderId) {}
    public function uniqueId(): string { return (string) $this->orderId; }
    public function middleware(): array { return [new WithoutOverlapping($this->orderId)]; }

    public function handle(PaymentGateway $gateway): void {
        DB::transaction(function () use ($gateway) {
            $order = Order::lockForUpdate()->findOrFail($this->orderId);
            if ($order->status !== 'pending') { return; }              // pehle hi ho chuka
            $result = $gateway->charge($order, idempotencyKey: "order-{$order->id}-charge");
            $order->update(['status' => 'paid', 'provider_ref' => $result->reference]);
        });
    }
}

ChargeOrder::dispatch($order->id)->afterCommit();
```

(Transaction ke andar external call ka nuqsan: DB lock lambi der; behtar: pehle `charging` state commit, phir call, phir `paid`. Is trade-off ka zikr karna senior jawab hai.)

**Interview line:** "Queues at-least-once hain, to idempotency layers se banti hai: provider ka idempotency key, DB ka unique constraint, conditional state update, aur upar se ShouldBeUnique aur WithoutOverlapping. Aakhri guarantee DB aur provider dete hain, Redis lock nahi."

# Scenario 4: 50 million rows ki table ka column type badalna, downtime allowed nahi

**Q4. What migration strategy would you follow in Laravel + MySQL?**

**Pehle yeh samjho ke seedha `ALTER ... MODIFY` kyun nahi:** MySQL mein column ka **data type badalna in-place nahi hota**, poori table rebuild (copy) hoti hai aur is dauran writes block ho jati hain. 5 crore rows par yeh ghanton ki outage ho sakti hai. (Kuch changes online hote hain: naya column add (INSTANT), index add (INPLACE), VARCHAR ki length ek hadd ke andar barhana; lekin type change nahi.) Safety trick: `ALTER ... ALGORITHM=INPLACE, LOCK=NONE` likho. Agar MySQL is tarah nahi kar sakta to wo **error de deta hai**, chup chaap table lock nahi karta.

**Do raaste:**

**A) Online schema-change tool:** `gh-ost` (binary log se, triggers ke baghair) ya `pt-online-schema-change` (triggers se). Wo nayi shadow table banate hain, rows chhote chunks mein copy karte hain, chalte changes ko saath apply karte hain, aur aakhir mein atomic rename (cut-over). Zaroorat: table jitni extra disk, replication lag ki nigrani, throttling, aur pehle staging clone par test.

**B) Expand, migrate, contract (app ke andar, Laravel mein):**

1. **Expand:** naya column nullable, naye type ke saath add karo (instant ya online).

```php
// migration (sirf add, koi rebuild nahi)
Schema::table('payments', function (Blueprint $table) {
    $table->decimal('amount_new', 14, 2)->nullable()->after('amount');
});
```

2. **Dual-write:** naya code deploy jo naye aur purane dono columns likhta hai (observer ya model mutator), taake nayi rows consistent hon.

```php
class PaymentObserver {
    public function saving(Payment $p): void {
        $p->amount_new = $p->amount;            // dono sync
    }
}
```

3. **Backfill:** purani rows chhote batches mein, idempotent, replication lag dekhte hue ruk ruk kar.

```php
DB::table('payments')->whereNull('amount_new')->orderBy('id')
    ->chunkById(5000, function ($rows) {
        DB::table('payments')->whereIn('id', $rows->pluck('id'))
            ->update(['amount_new' => DB::raw('amount')]);
        usleep(200_000);                        // replicas ko saans lene do
    });
```

4. **Verify:** `SELECT COUNT(*) FROM payments WHERE amount_new IS NULL OR amount_new <> amount` ka 0 hona, checksum ya sample comparison.
5. **Switch reads:** feature flag se nayi column par padhna (pehle chhote hisse par), phir sab par.
6. **Contract:** purani column par likhna band, kuch din rollback window, phir **alag release** mein drop (destructive step kabhi usi release mein nahi, F47). Naam badalna ho to `RENAME COLUMN` MySQL 8 mein online hai lekin app code ke saath coordinate.

**Dhyan rakhne ki baatein:**

- Backfill ke dauran replication lag, binlog size aur disk ka alert; kam traffic waqt; kill switch (job rok sakein).
- Naye column par index backfill ke baad (ya cut-over se pehle), taake backfill ke dauran writes slow na hon.
- Foreign keys, triggers aur views jo is column par depend hon unhein check.
- **Heavy ALTER ko normal `php artisan migrate` deploy mein mat chalao** (deploy timeout ya lamba block). Alag, control wali process ya tool se chalao.
- Production-size clone par pehle test aur time naapo.
- Rollback plan: purani column cut-over tak chhui nahi hoti, to wapas jana aasan.

**Interview line:** "MySQL mein type change rebuild hota hai aur writes rokta hai, to main ya gh-ost chalata hoon, ya expand-migrate-contract: nayi column, dual-write, batches mein backfill, verify, reads switch, aur purani column alag release mein drop."

# Scenario 5: Slow aur kabhi kabhi fail hone wali third-party API, users ko random delays

**Q5. How would you design a resilient Laravel integration? (timeouts, retries, fallbacks)**

**Asal wajah delays ki:** slow API har request ka FPM worker pakad leti hai (F39). Isliye maqsad: **provider ki slowness user tak na pohnche aur hamare workers na phanse.**

**Design ke hisse:**

1. **Timeouts (sab se pehle):** connect 1 se 2 second, total user-facing path par 3 se 5 second. Bina timeout ke ek slow call poori site slow kar sakti hai.
2. **Selective retries:** sirf idempotent calls (GET, ya idempotency key ke saath POST) aur sirf transient errors (connection, 5xx), exponential backoff plus jitter, aur total waqt par hadd. 4xx par retry nahi.
3. **Circuit breaker:** lagataar failures par kuch der call hi band (fail fast), provider ko recover hone ka moqa.
4. **Fallback:** aakhri theek jawab (stale cache), flat rate ya default, doosra provider, ya "baad mein confirm hoga" wali degraded service.
5. **Async jahan mumkin:** call queue job mein, user ko "processing" aur status endpoint (202). User-facing request ko provider par bandhna nahi.
6. **Bulkhead:** is provider ke jobs alag queue aur limited concurrency, taake wo baqi kaam na roke.
7. **Rate limiting:** provider ki limits ke andar (`RateLimited` job middleware, `Http::pool` mein concurrency).
8. **Adapter plus validation:** provider ki response ko apni DTO mein, shape validate (F45).
9. **Observability:** har call ki duration, status, error rate log aur metrics, aur alert (error rate ya p95 latency).

```php
// Adapter: timeouts aur selective retry
$response = Http::timeout(3)->connectTimeout(1)
    ->retry(2, 200, fn ($e) => $e instanceof ConnectionException, throw: false)
    ->get($url);
if ($response->failed()) { throw new ProviderUnavailable($response->status()); }
```

```php
// Service: circuit breaker (cache mein) aur fallback
final class ShippingRates {
    public function __construct(private ShippingApi $api) {}

    public function quote(Cart $cart): Quote {
        if (Cache::get('shipping:circuit') === 'open') {
            return $this->fallback($cart);                          // breaker open: seedha fallback
        }
        try {
            $quote = $this->api->quote($cart);
            Cache::put("shipping:last:{$cart->zone}", $quote, now()->addHours(6));
            Cache::forget('shipping:failures');
            return $quote;
        } catch (Throwable $e) {
            report($e);
            Cache::add('shipping:failures', 0, 60);                 // counter ki 60 second ki umar
            if (Cache::increment('shipping:failures') >= 5) {
                Cache::put('shipping:circuit', 'open', now()->addSeconds(30));   // 30 second breaker open
            }
            return $this->fallback($cart);
        }
    }

    private function fallback(Cart $cart): Quote {
        return Cache::get("shipping:last:{$cart->zone}") ?? Quote::flatRate($cart);   // last good ya flat rate
    }
}
```

Queue jobs ke liye Laravel ka `ThrottlesExceptions` job middleware: baar baar exception par job ko kuch der rok deta hai (ek tarah ka job-level breaker):

```php
public function middleware(): array {
    return [(new ThrottlesExceptions($maxExceptions, $decay))->backoff(5)];
    // $decay ki unit apne Laravel version ki docs se confirm karein
}
```

**Interview line:** "Provider slow ho to hamare workers nahi phansne chahiyein: chhote timeouts, sirf idempotent retries backoff ke saath, circuit breaker, stale-cache ya default fallback, aur jahan ho sake call queue mein. Aur har call ki latency aur error rate par alert."

# Laravel Data (Spatie): arrays ki jagah typed DTOs

LinkedIn post ka naam "hidden gem" theek hai, lekin interview mein isay balanced tareeqe se bolna chahiye: faide aur qeemat dono.

## Kya hai aur kyun

DTO (Data Transfer Object) ek typed object hai jo layers ke beech data le jata hai, array ki jagah. Arrays mein andar kya hai pata nahi hota (typo ka key, ghalat type, missing field). `spatie/laravel-data` ek hi class se request mapping, validation aur API response banata hai.

```bash
composer require spatie/laravel-data
```

```php
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Attributes\Validation\{Email, Max};

final class BookingData extends Data
{
    public function __construct(
        public readonly int $train_id,
        #[Max(50)] public readonly string $passenger_name,
        #[Email] public readonly ?string $email,
        #[MapInputName('travel_date')] public readonly \Carbon\CarbonImmutable $date,
        public readonly TicketStatus $status = TicketStatus::Pending,   // PHP enum
    ) {}
}

// Controller: request -> data (mapping aur validation khud ba khud)
public function store(BookingData $data, BookingService $service)
{
    $booking = $service->book($data);          // service ko array nahi, typed object
    return BookingData::from($booking);        // model -> data -> JSON response
}

// Collections aur arrays
BookingData::collect($bookings);
$data->toArray(); $data->only('train_id');
```

## Kya milta hai

- **Typed properties:** IDE autocomplete aur safe refactoring (property ka naam badlo, har jagah nazar aata hai).
- **Request se mapping:** controller method mein type-hint karo, Laravel Data request se object banata hai.
- **Validation:** property ke type aur attributes se rules khud ban jate hain (nullable matlab optional), custom rules bhi.
- **Transformation:** model ya array se `::from()`, response ke liye `toArray()`/`toJson()`, input/output ke naam alag (`MapInputName`, `MapOutputName`).
- **Extras:** casts (date, enum), lazy properties, nested data aur collections, aur TypeScript types ka generation.
- **Layers ke beech:** controller, service/action, queue job aur API response sab ek hi class bolte hain.

## Honest notes (interview mein)

- Post kehta hai "immutable": Data classes **khud immutable nahi hoti**. Immutability ke liye `public readonly` properties (PHP 8.1+) lagani parti hain, jaisa upar ke example mein.
- **Cost:** ek aur layer (boilerplate), seekhne ka waqt, aur chhote project ke liye overkill. Validation `FormRequest` ke saath duplicate na ho, ek jagah rakho.
- Version compatibility: package ka Laravel aur PHP support Packagist par check karo.

| Cheez | Kaam |
| --- | --- |
| `FormRequest` | HTTP input ki validation aur authorization |
| DTO (`Data`) | layers ke beech typed data (validation ke saath ya baghair) |
| API Resource | model ko JSON response mein badalna |
| Laravel Data | upar ki teeno ka kaam ek class mein kar sakta hai |

**Kab use karein:** APIs, complex payloads, data jo controllers, actions aur jobs ke beech jata hai. **Kab nahi:** chhote CRUD jahan `FormRequest` plus model kaafi hai.

**Interview line:** "Arrays mein shape ka pata nahi hota. DTO se mapping, validation aur response typed hote hain, IDE aur refactoring behtar. Lekin ye ek extra layer hai, to complex payloads aur layers ke beech data ke liye use karta hoon, chhote CRUD ke liye nahi."

# Docker: image chhoti aur CI tez (Laravel version)

Post mein Node.js API ka 1.37 GB se 168 MB aur 9 minute se 3 minute ka natija hai. **Yeh unke Node app ke numbers hain.** Laravel image ka size alag hoga (PHP extensions, Composer vendor), aur aap ko apne numbers khud naapne chahiyein (`docker images`, CI ka build time). Dusron ke numbers apne naam se mat bolein. Techniques wohi chalti hain.

## Wajahein jo image ko moti banati hain

- Dev dependencies aur build tools production image mein (Composer, Node, compilers).
- Layer caching ki ghalat tarteeb (`COPY . .` pehle, phir install: har code change par dependencies dobara install).
- Multi-stage build nahi, ek hi image mein sab.
- Bhaari base image, aur `.dockerignore` na hona (`.git`, `node_modules`, logs sab image mein).

## Multi-stage Dockerfile (PHP-FPM, Laravel)

```dockerfile
# syntax=docker/dockerfile:1

# 1) Composer dependencies (sirf production)
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN --mount=type=cache,target=/tmp/cache \
    composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY . .
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev

# 2) Frontend build (Node sirf build ke liye, final image mein nahi)
FROM node:lts-alpine AS assets            # apne project ka LTS version pin karein
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 3) Runtime (chhoti image: sirf PHP-FPM aur zaroori extensions)
FROM php:8.3-fpm-alpine AS app            # apne project ke PHP version ke mutabiq
RUN apk add --no-cache icu-libs libzip \
 && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS icu-dev libzip-dev \
 && docker-php-ext-install -j"$(nproc)" pdo_mysql intl zip opcache pcntl \
 && apk del .build-deps                   # build tools usi layer mein hata do
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
WORKDIR /var/www/html
COPY --from=vendor /app /var/www/html
COPY --from=assets /app/public/build ./public/build
RUN chown -R www-data:www-data storage bootstrap/cache
USER www-data
EXPOSE 9000
CMD ["php-fpm"]
```

`docker/php/opcache.ini` (image immutable hai, isliye timestamps check band):

```ini
opcache.enable=1
opcache.memory_consumption=192
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
```

`.dockerignore`:

```
.git
node_modules
vendor
.env
storage/logs/*
storage/framework/cache/*
tests
```

## Jo cheezein runtime par chhoti ya theek honi chahiyein

- **`.env` image mein nahi.** Config aur secrets runtime par (env ya secrets). Isliye `php artisan config:cache route:cache event:cache view:cache` ko container start par (entrypoint) chalayen jab env maujood ho.
- **Migrations har replica ke start par nahi.** Ek alag deploy step ya one-off job (warna kai replicas ek saath migrate karenge).
- **Nginx alag container** (`nginx:alpine`, `fastcgi_pass app:9000`). Static files (`public/build`) ko nginx image mein copy karna ya shared volume.
- **`storage` aur uploads:** named volume ya object storage (S3), container ke andar nahi (F135).
- **Queue worker aur scheduler:** wohi image, alag command (`php artisan queue:work`, `schedule:work`). `pcntl` extension taake worker graceful band ho (F138).
- **Non-root user** (`USER www-data`).

## Build tez karne ke tareeqe (CI)

1. **COPY ki tarteeb:** pehle `composer.json` aur `composer.lock`, install, phir baqi code. Code change par dependency layer cache se aati hai.
2. **BuildKit cache mounts** (`RUN --mount=type=cache`) Composer aur npm caches ke liye.
3. **CI mein layer cache:** `--cache-from` ya registry cache ya CI ka cache (har run par scratch se build nahi).
4. **Parallel jobs:** lint, static analysis, tests aur image build alag alag jobs, saath saath.
5. **Ek baar build, kai jagah deploy:** wohi image staging aur production.
6. **Chhoti image:** push aur pull tez, deploy tez. `docker history` aur `dive` se dekhein kaun si layer bhaari hai.
7. **`.dockerignore`:** build context chhota, to build shuru hone mein kam waqt.

## Alpine vs Debian-slim

Alpine chhota hai lekin `musl` libc use karta hai (glibc nahi): kuch extensions, binaries ya DNS behavior mein farq ho sakta hai. Agar masla aaye to `php:8.3-fpm` (Debian slim jaisi) ek jaana-pehchana option hai. Pehle apni app ke tests us base par chalao, size ke peeche bhaag kar stability na khoo.

## Docker ke interview sawal

**D1. Why multi-stage builds?** Answer: Build tools (Composer, Node, compilers) aur dev dependencies sirf build ke liye chahiye. Multi-stage mein unhein pehle stages mein rakh kar sirf nateeja (vendor, built assets) runtime image mein copy karte hain, to image chhoti, tez pull aur kam attack surface.

**D2. What should never be in a production image?** Answer: `.env` aur secrets, `.git`, tests, dev dependencies, build tools, SSH keys, aur debug tools. Secret ek baar layer mein gaya to history mein hamesha (F139).

**D3. How do you speed up Docker builds in CI?** Answer: COPY ki tarteeb (dependencies pehle), BuildKit cache mounts, CI mein layer cache (`--cache-from`), parallel jobs, `.dockerignore`, aur ek baar build kai jagah deploy.

**D4. Alpine or Debian-slim?** Answer: Alpine chhota lekin musl ki wajah se kabhi kabhi compatibility ke masle. Main app ke tests us image par chalata hoon; masla aaye to Debian-slim par. Size ek goal hai, stability pehle.

**D5. Where do you run migrations in a containerized deployment?** Answer: Ek alag one-off step ya job deploy pipeline mein (replicas ke start par nahi), backward-compatible migrations (expand-contract) taake purana aur naya code dono chal saken (F52).

**D6. How do you measure that your optimization worked?** Answer: Before aur after: image size (`docker images`), CI ka total aur har step ka waqt, pull aur deploy time. Number apne project ke, aur ek hi cheez badal kar naapna taake pata chale kisne asar kiya.

**Interview line:** "Multi-stage build se Composer aur Node sirf build mein, runtime mein sirf PHP-FPM aur vendor. COPY ki sahi tarteeb aur CI layer cache se build tez, aur main apne numbers khud naapta hoon, kisi aur ke nahi."
