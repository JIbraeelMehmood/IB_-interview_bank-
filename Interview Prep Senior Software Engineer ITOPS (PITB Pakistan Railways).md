# Interview Prep: Senior Software Engineer, IT Operations (PITB / Pakistan Railways)

Easy-wording Q&A with cross-questions, scenarios and quick checks. Answers are written in first person so you can say them naturally. Where an answer uses your real work (HOLOIN, AI-BDM, University Seekers, Shopify app), it is marked as your story. Change the details so they match what really happened.

## 0. What this job is really testing

The JD is short, but it hides three big tests:

1. **Delivery owner:** "all development targets", "deadlines not compromised". They want someone who plans, tracks and finishes work, not only someone who codes.
2. **Quality owner:** "Quality Assurance", "free from bugs and error". They want testing, code review, CI checks and safe releases.
3. **Government-scale system:** a PITB and Pakistan Railways digital transformation program for 3 years. Think many users at the same time (tickets, bookings, freight, schedules), strict security, audit trails, long-term maintenance and many teams.

The JD does not name the stack. Ask early: "Which stack is the program using?" Your lists suggest PHP, Laravel and MySQL, so this guide leans there, plus design, data, CI/CD, Docker, security and architecture.

**Honest gaps to prepare for:** formal testing habits (PHPUnit/Pest), named BI tools (Power BI, Metabase etc.), and anything Railways-specific. Do not hide these. Say what you do know and how you would learn fast.

## A. Role, delivery and HR-style questions

**Q1. Tell me about yourself.** A: I am a Senior Laravel and backend engineer with 5+ years of PHP experience across CWS, ESparks, CynoSure and now ChirpTech, where I am a team lead. My recent work is a multi-tenant IoT SaaS platform (HOLOIN) with high-volume data, queues, Docker and an AI service layer. I also lead juniors, review code and handle production issues.

**Q2. Why this role?** A: It is a large, long program where software quality and on-time delivery matter for real citizens. I like owning delivery and quality, and I have done that as a team lead. A 3-year program also lets me build things properly instead of rushing.

**Q3. How do you make sure deadlines are not missed?** A: I break work into small tasks with clear "done" rules, estimate with a buffer, and track progress daily. I raise risks early (blocked API, unclear requirement) instead of at the last day. I cut scope before I cut quality: the must-have features ship first, the rest move to the next sprint. *Cross-question: What if the client keeps adding requirements?* A: I write the change down, show its effect on time, and ask the owner to choose: drop something, move the date, or add people. I do not silently absorb it.

**Q4. How do you make sure software is free from bugs?** A: Honestly, no software is bug-free. My goal is to catch bugs early and make them cheap to fix. I use code review, automated tests on critical paths, a staging environment, CI checks, and a safe release with rollback. After release I watch logs and errors. *Cross-question: So you cannot promise zero bugs?* A: Right. I promise a process that keeps serious bugs from reaching users and fixes them fast when they do.

**Q5. Describe a time you missed a target. What did you do?** A: Use a real story: what slipped, the root cause (unclear requirement, hidden dependency), what you told the stakeholders and when, and what you changed afterward (earlier demos, smaller tasks).

**Q6. How do you handle a production bug at night?** A: First stop the damage (rollback, feature switch, or a quick safe fix). Then find the cause from logs and data, fix it properly, add a test so it cannot come back, and write a short report: what happened, why, what we changed.

**Q7. How do you handle a teammate who writes poor-quality code?** A: I review the code kindly and specifically, explain why, share a checklist, and pair with them on one task. If the same problem repeats, I raise it with the manager with examples.

**Q8. Your CV shows several kinds of projects. Which one are you proudest of?** A (your story): HOLOIN. Some queries on device data took 10 to 20 minutes. I found missing indexes and heavy work done in application code, moved the heavy parts into the database, added indexes, and used latest-value caching so dashboards stop scanning raw history. That made the dashboard usable.

## B. PHP fundamentals (how it really works)

**Q9. How does a PHP request work?** A: The web server (Nginx) receives the request and passes it to PHP-FPM. A worker starts the script, runs it, sends the output back, and the request memory is cleared. PHP does not keep state between requests, so state must live in sessions, cache or a database. *Cross-question: Why does that matter at scale?* A: Because each request is independent, I can add more PHP workers or servers easily. But shared things (sessions, cache, uploads) must sit outside one server, such as Redis or object storage.

**Q10. What is OPcache?** A: PHP compiles scripts into opcodes. OPcache saves those opcodes in memory so PHP does not re-compile files on every request. It is a big free speed gain in production.

**Q11. `==` vs `===`?** A: `==` compares values after type juggling (`"0" == false` is true). `===` compares value and type. I use `===` almost always, because loose comparison causes surprising bugs, even security bugs.

**Q12. What are `include`, `require`, `require_once`?** A: `include` warns if the file is missing, `require` stops the script with a fatal error, and `_once` loads the file only one time. In modern apps Composer autoloading replaces most of this.

**Q13. What are traits, interfaces and abstract classes?** A: An interface is a contract (what methods must exist). An abstract class is a partial base class with some shared code. A trait is reusable code copied into classes, a way to share behavior without inheritance. *Cross-question: When do you use an interface over an abstract class?* A: When different classes only need to promise the same methods (for example `PaymentGateway`). I use an abstract class when there is real shared code and a clear "is-a" relationship.

**Q14. What are `public`, `protected`, `private`, `static`, `final`, `readonly`?** A: Public: anyone. Protected: the class and children. Private: the class only. Static belongs to the class, not an object. Final stops extending or overriding. Readonly properties can be set once, which makes objects safer.

**Q15. What is dependency injection?** A: Instead of a class creating the things it needs inside (`new Mailer()`), they are passed in from outside (constructor). This makes code easy to test (you can pass a fake mailer) and easy to change.

**Q16. What are PSR standards?** A: Agreed PHP rules. PSR-4 is autoloading, PSR-12 is code style, PSR-7 is HTTP messages, PSR-3 is logging. They keep code consistent across teams.

**Q17. How does PHP handle memory and garbage?** A: PHP counts references to values and frees them when the count reaches zero. A cycle collector cleans circular references. In long scripts (queue workers, big imports) I process data in chunks or with generators to avoid memory growth.

**Q18. What is a generator and why use it?** A: A function using `yield` that gives values one by one without building the whole array. Good for reading big files or large database results with low memory.

**Q19. What are the PHP 8 features you use?** A: Typed properties, union types, enums, `match`, named arguments, nullsafe operator `?->`, constructor property promotion, attributes, readonly properties and fibers (rare).

**Q20. How do you handle errors in PHP?** A: Use exceptions with try/catch for expected failures, a global exception handler for the rest, log with context (user, request id), and never show raw errors to users in production.

**Scenario check:** A script that exports 500,000 rows runs out of memory. What do you change? A: Stop loading all rows into an array. Use `chunk` or `cursor` in Laravel (or a generator), write to the file as you go, and run the export as a queued job, not inside the web request.

## C. Laravel (how it really works)

**Q21. Explain the Laravel request lifecycle.** A: `public/index.php` starts the app, the HTTP kernel runs global middleware, the router finds the route, route middleware runs, the controller (or closure) runs, a response is made and sent back through middleware. Service providers register and boot the framework pieces before that.

**Q22. What is the service container?** A: It is Laravel's object factory. It creates classes and injects their dependencies automatically, and you can bind an interface to a real class. It is how dependency injection works in Laravel. *Cross-question: What is the difference between `bind` and `singleton`?* A: `bind` makes a new object every time. `singleton` makes one object and reuses it for the whole request.

**Q23. What are service providers?** A: The place where you register bindings and boot services. Almost everything in Laravel is set up through a provider.

**Q24. Middleware: what is it and give a real use.** A: A layer a request passes through before and after the controller. Uses: authentication, roles, rate limiting, logging, forcing JSON. In a multi-tenant system I used middleware to resolve the tenant or domain and limit data access.

**Q25. Eloquent relationships and the N+1 problem.** A: Relationships: hasOne, hasMany, belongsTo, belongsToMany, hasManyThrough, morph relations. N+1 means one query for the list plus one query per row for the relation. Fix it with eager loading: `with('relation')`. I check queries with Debugbar, Telescope or query logging. *Cross-question: When is eager loading a bad idea?* A: When the relation is huge and you only need a count or a few columns. Then I use `withCount`, select only needed columns, or a separate query.

**Q26. `chunk` vs `cursor` vs `lazy`?** A: `chunk` loads fixed batches, so memory is bounded. `cursor` streams rows one by one using a generator and one query. `lazy` is a chunk-based lazy collection. All avoid loading everything at once.

**Q27. Query scopes.** A: Reusable query pieces on a model (`scopeActive`). Global scopes apply to every query on the model. In multi-tenant systems a global scope can enforce the tenant filter, but I must remember it can be bypassed with `withoutGlobalScopes`, so I also test it.

**Q28. Queues: why and how?** A: Slow work (emails, PDFs, imports, third-party API calls) should not block the user. Dispatch a job, a worker runs it later. I use Redis with Horizon. Important points: retries, backoff, timeouts, failed-jobs table, and **idempotent jobs** (running twice must not double-charge or double-send). *Cross-question: A job failed 3 times. What now?* A: It goes to `failed_jobs`. I read the error, fix the cause, then `queue:retry`. For third-party outages I use backoff so retries do not hammer the API.

**Q29. Events, listeners, observers.** A: Events announce that something happened (`TicketBooked`). Listeners react (send SMS, update stats). Observers watch model events (created, updated). They keep controllers thin, but too many hidden listeners make flow hard to follow, so I keep them documented.

**Q30. Validation and Form Requests.** A: Put rules in a Form Request class so controllers stay clean. Validate on the server always, even if the front end also validates.

**Q31. Authentication vs authorization in Laravel.** A: Authentication is who you are (sessions, Sanctum tokens, Passport/OAuth, JWT). Authorization is what you may do (Gates, Policies, roles/permissions). Check ownership too: a logged-in user must not open another user's record by changing an ID (IDOR).

**Q32. Caching in Laravel.** A: `Cache::remember` for expensive results, with a sensible expiry and a way to clear it when data changes. Also route, config and view caching in production (`php artisan optimize`). Cache problems: stale data and cache stampede (many requests rebuild at once), solved with locks or short staggered expiry.

**Q33. Transactions.** A: `DB::transaction` makes several writes succeed or fail together. A booking that reserves a seat and creates a payment record must be in one transaction. *Cross-question: Two users book the last seat at the same time. How do you stop a double booking?* A: Inside a transaction, lock the row (`lockForUpdate`) or use a unique constraint plus a conditional update (`UPDATE ... WHERE available > 0`) and check the affected rows. The database is the final judge, not PHP code.

**Q34. API Resources, pagination, versioning.** A: Resources control the JSON shape. Paginate every list (cursor pagination for large tables). Version APIs (`/api/v1`) so changing one does not break older clients.

**Q35. Rate limiting and throttling.** A: `throttle` middleware limits requests per user or IP. It protects login pages and public APIs from abuse and accidental overload.

**Q36. Which Laravel commands do you use in deployment?** A: `composer install --no-dev --optimize-autoloader`, `php artisan migrate --force`, `config:cache`, `route:cache`, `view:cache`, `queue:restart`, and a cache clear when needed.

**Scenario check:** After a deploy, jobs behave like the old code. Why? A: Queue workers are long-running and keep old code in memory. Run `php artisan queue:restart` (or restart Horizon) on every deploy.

## D. MySQL, indexes and performance

**Q37. How does an index work?** A: Usually a B-tree: a sorted structure that lets MySQL jump to rows instead of scanning the whole table. It speeds reads but slows writes a little and uses space.

**Q38. Composite index and the leftmost-prefix rule.** A: An index on `(station_id, date, status)` can serve filters on `station_id`, or `station_id + date`, but not `date` alone. Put the most selective, most-used equality columns first, and range columns last.

**Q39. Why does my indexed query still run slow?** A: Common reasons: a function on the column (`WHERE DATE(created_at)=...`), a leading wildcard (`LIKE '%abc'`), a type mismatch (string vs number), low selectivity (most rows match), `OR` across columns, or sorting a huge result with no matching index. Use `EXPLAIN` and read `type`, `key`, `rows`, and `Extra` (watch for `Using filesort` and `Using temporary`).

**Q40. What is a covering index?** A: An index that contains every column the query needs, so MySQL never reads the table row. Very fast for hot read queries.

**Q41. InnoDB vs MyISAM.** A: InnoDB supports transactions, row-level locks and foreign keys, and recovers after a crash. MyISAM does not. Use InnoDB.

**Q42. ACID and isolation levels.** A: Atomic, Consistent, Isolated, Durable. MySQL's default is REPEATABLE READ. Lower levels allow dirty or non-repeatable reads, higher levels reduce them but cost concurrency. Deadlocks happen when two transactions wait for each other's locks, so keep transactions short and lock rows in the same order.

**Q43. Normalization vs denormalization.** A: Normalize to avoid duplicate and inconsistent data. Denormalize on purpose for read speed, such as summary tables or storing the latest value on a device record (I did this on HOLOIN as latest-packet caching). The cost is keeping the copies in sync.

**Q44. How do you speed up a slow report?** A: Find the exact slow query with the slow query log or `EXPLAIN`. Add or fix indexes, select fewer columns, remove per-row queries, move calculations into SQL, and pre-calculate with summary tables updated by a scheduled job. For very heavy reports use a read replica so reporting does not slow live traffic.

**Q45. Joins, subqueries, group by, having.** A: Be able to write: inner vs left join, the Nth highest value (`ORDER BY ... LIMIT 1 OFFSET N-1` or `DENSE_RANK()`), duplicates (`GROUP BY ... HAVING COUNT(*) > 1`), and the difference between `WHERE` (before grouping) and `HAVING` (after).

**Q46. Pagination on huge tables.** A: `OFFSET 1000000` is slow because MySQL still walks past the skipped rows. Use keyset (cursor) pagination: `WHERE id > last_id ORDER BY id LIMIT 50`.

**Q47. Migrations on a big live table.** A: A plain `ALTER TABLE` can lock or slow a huge table. Use online schema change tools (pt-online-schema-change or gh-ost), or add nullable columns first, backfill in batches, then add constraints. Always have a rollback plan and test on a copy of production-size data.

## E. BI, reporting and data questions

The JD says "Digital Transformation Program", so expect dashboards and reports (ticket sales, passenger counts, delays, revenue). You do not need to claim BI-tool experience. Explain the data side you have done and how you would learn the rest.

**Q48. OLTP vs OLAP?** A: OLTP is the live system: many small reads and writes (book a ticket). OLAP is analysis: fewer, heavier queries over lots of history (sales by station per month). They want different designs, so heavy reports should not run on the live database.

**Q49. How would you build a reporting layer without slowing the live system?** A: Options, from simple to bigger: (1) summary tables updated by scheduled jobs, (2) a read replica for reports, (3) a separate reporting database filled by a nightly or near-real-time ETL job. I start with the simplest that meets the need.

**Q50. What is ETL?** A: Extract data from sources, Transform it (clean, join, calculate), Load it into a reporting store. Key risks: duplicates, late data and bad data, so I make jobs repeatable (running twice gives the same result) and log row counts.

**Q51. Star schema: fact and dimension tables.** A: A fact table stores events or numbers (one row per ticket sale: amount, time, station id). Dimension tables describe them (station, train, date, passenger type). Reports join one fact table to a few dimensions, which is simple and fast.

**Q52. How do you make a dashboard load fast?** A: Do not scan raw rows on every load. Pre-aggregate (daily totals), cache results for a short time, index the filter columns, and load charts separately so one slow chart does not block the page. On HOLOIN, I stored the latest value per device so the dashboard never scanned days of raw readings.

**Q53. How do you check that report numbers are correct?** A: Reconcile with a second source (totals from the raw table vs the summary table), test the SQL on a small known data set, and compare with finance or business numbers before release. Wrong numbers lose trust faster than slow numbers.

**Q54. MySQL vs MongoDB vs PostgreSQL: how do you choose?** A (your story): I choose by the data and the questions. MySQL or PostgreSQL for related, transactional data (bookings, payments). MongoDB for very large, flexible event data like device readings. PostgreSQL also fits well when I need advanced queries. I do not treat any one database as always better.

**Q55. What is a data warehouse, and what BI tools have you seen?** A: A separate store built for analysis. Be honest: "I have built the data and API side (aggregation, summary tables, exports). I have not run a BI tool as my main job, but tools like Metabase or Power BI connect to a clean reporting database, so I can prepare that layer and learn the tool quickly."

**Scenario check:** A manager wants "revenue by station, by day, for 3 years" and the page takes 90 seconds. What do you do? A: Check `EXPLAIN` first. Likely fixes: index on (station\_id, date), stop calculating in PHP, build a daily summary table (one row per station per day) updated by a job, and cache the result. Pre-calculation turns millions of rows into thousands.

## F. Design patterns (with simple examples)

**Q56. Which patterns do you actually use in Laravel?** A: Repository (wrap data access), Service class (business logic outside controllers), Factory (create objects, also test data), Strategy (swap behavior, like payment gateways), Observer (model events), Decorator/Pipeline (middleware), Singleton (container), Facade (Laravel's static-looking helpers).

**Q57. Explain Strategy with an example.** A: A `PaymentGateway` interface with `charge()`. Classes `EasyPaisaGateway`, `JazzCashGateway` and `CardGateway` implement it. The code picks one at run time. Adding a new gateway means adding a class, not editing old code.

**Q58. Repository pattern: is it always needed?** A: No. Eloquent already acts like a repository for simple cases. I add one when queries are complex or reused, or when I need to swap the data source. Extra layers without need are over-engineering.

**Q59. What is the Single Responsibility principle? Give a bad example.** A: A class should have one reason to change. A controller that validates, saves, sends SMS, builds a PDF and writes logs does too much. Split into Form Request, Service, Notification and Job.

**Q60. SOLID in one line each.** A: S: one job per class. O: add features by adding code, not editing old code. L: child classes must work wherever the parent works. I: small, focused interfaces. D: depend on interfaces, not concrete classes.

**Q61. Facade vs dependency injection?** A: Facades are shortcuts to container objects and are easy to write. Injection makes dependencies visible and tests cleaner. Both work in Laravel. In shared code I prefer injection.

**Q62. Service layer vs fat controller vs fat model.** A: Controllers handle HTTP only. Models handle data rules and relations. Business flows (book ticket, refund) go in service or action classes. This keeps code testable and reusable from API, console and queue.

**Q63. What is CQRS, and when would you use it?** A: Separate the write side (commands) from the read side (queries), often with different models or databases. It helps when reads and writes have very different needs, such as live booking writes and heavy reporting reads. It adds complexity, so I use it only when the need is clear.

**Q64. Event-driven design: pros and cons.** A: Pros: loose coupling, easy to add reactions, good for async work. Cons: harder to trace, ordering and duplicate delivery problems. Use correlation IDs in logs and make handlers idempotent.

## G. System design (railway-style scenarios)

A method that works for any design question: (1) clarify users, traffic and rules, (2) list main flows, (3) data model, (4) draw the components, (5) find bottlenecks, (6) security and failure, (7) how to monitor and grow. Say this out loud.

**Q65. Design an online train ticket booking system.** A: Clarify first: how many users at peak (for example when booking opens), payment options, seat types, cancellations. Core parts: search (trains, routes, availability), booking (hold seat, pay, confirm), payment, notifications, admin and reports. Data: stations, trains, schedules, coaches/seats, bookings, passengers, payments, audit log. Flow: search reads from cache or a read store. Booking uses a short **seat hold** (for example 10 minutes) in a transaction, then payment, then confirmation. If payment fails or times out, a scheduled job releases the hold. Scale: put static content on a CDN, cache search, use queues for SMS/email/PDF tickets, and protect the booking path with rate limits and a **waiting room/queue** during peaks. *Cross-question: How do you avoid double booking?* A: Database-level locking or a conditional update inside a transaction, plus a unique constraint on (train, date, seat). The database decides, not application code. *Cross-question: Payment succeeded but the callback never arrived. What now?* A: Never assume. Keep the booking in a "pending payment" state, run a reconciliation job that asks the payment provider for the real status, and confirm or release accordingly. Payment callbacks must be idempotent and signature-checked.

**Q66. How do you handle sudden peak traffic (festival booking day)?** A: Load test before the date. Scale web servers horizontally, cache read-heavy pages, queue slow work, set database connection limits, add a waiting room, and degrade gracefully (turn off non-critical features like heavy recommendations before turning off booking).

**Q67. Monolith or microservices for this program?** A: I would start with a **modular monolith**: clear modules (booking, payments, notifications, reports) in one deployable app. It is simpler to test and run for a team. I would split a module out only when it has its own scale or team need, such as notifications or reporting. Microservices bring network failures, data consistency problems and operations cost. (Honest note: not all my projects were pure microservices. HOLOIN and AI-BDM are my best service-oriented examples.)

**Q68. How would different systems (railways, banks, mobile apps) integrate?** A: Through versioned REST APIs with clear contracts, authentication, timeouts and retries, webhooks or queues for async events, and an audit log of every exchange. I assume the other system can be slow or down, so I never block the user on it without a timeout.

**Q69. How do you design for high availability?** A: No single point of failure: more than one app server behind a load balancer, database replication with tested failover, backups with tested restores, health checks, and monitoring with alerts. Define recovery goals (RTO: how fast we recover, RPO: how much data we can lose).

**Q70. How do you design an audit trail?** A: Record who did what, when, from where, with before/after values for sensitive changes (fares, refunds, roles). Store in an append-only table, restrict who can edit or delete it, and keep it for the legal retention period. Government systems are often audited, so this is a must.

**Q71. File and document handling (scanned IDs, tickets, PDFs).** A: Store files in object storage (not the app server disk), validate type and size, scan for malware if needed, use private links that expire, and generate PDFs in queue jobs.

**Q72. How do you handle multi-language (English/Urdu) and time zones?** A: Store times in UTC, convert for display (Asia/Karachi), use Laravel localization files, support right-to-left layout for Urdu, and use UTF-8 (`utf8mb4`) everywhere in the database.

## H. Web fundamentals ("how things work")

**Q73. What happens when you type a URL and press Enter?** A: Browser checks cache, DNS turns the name into an IP, a TCP connection opens, TLS sets up encryption (HTTPS), the browser sends an HTTP request, the load balancer or Nginx passes it to PHP-FPM, Laravel builds a response, and the browser renders HTML, then loads CSS, JS and images.

**Q74. HTTP methods and status codes.** A: GET read, POST create, PUT replace, PATCH partial update, DELETE remove. Idempotent means repeating gives the same result (GET, PUT, DELETE are; POST is not). Codes: 200 OK, 201 created, 204 no content, 301/302 redirect, 400 bad request, 401 not logged in, 403 not allowed, 404 not found, 409 conflict, 422 validation, 429 too many requests, 500 server error, 502/503/504 gateway or availability problems.

**Q75. Cookies vs sessions vs tokens.** A: A cookie is data stored in the browser. A session keeps data on the server, with a cookie holding only the session ID. Tokens (JWT or API tokens) are sent in a header, common for mobile and APIs. JWTs are hard to revoke before expiry, so use short lifetimes plus refresh tokens.

**Q76. HTTP caching.** A: `Cache-Control`, `ETag` and `Last-Modified` let browsers and CDNs reuse responses. Static assets get long cache times with versioned file names. Private user data must not be cached publicly.

**Q77. CORS: what and why?** A: Browsers block a page from calling another origin unless that server allows it with CORS headers. It protects users. It is a browser rule, not a server firewall, so it does not replace authentication.

**Q78. HTTP/1.1 vs HTTP/2, and what does a CDN do?** A: HTTP/2 sends many requests over one connection, which speeds up pages. A CDN serves static files from servers near the user and absorbs traffic, which helps a lot with public portals.

**Q79. REST vs GraphQL vs WebSockets.** A: REST: simple, cacheable, resource-based. GraphQL: client picks fields, good for varied clients, harder to cache and secure. WebSockets: two-way live updates (train status board, alerts). I used REST widely, GraphQL at ESparks, and WebSockets for live IoT dashboards.

**Q80. Synchronous vs asynchronous processing.** A: Synchronous: user waits for the result. Async: the user gets "accepted" and work continues in a queue. Use async for anything slow or dependent on outside systems.

## I. QA, testing, CI/CD (the heart of this JD)

**Q81. What is your testing strategy?** A: A pyramid: many fast unit tests for business rules, some feature/integration tests (routes, database, queues), few end-to-end tests for key journeys (search, book, pay, cancel). Plus manual exploratory testing before big releases. *Honest answer:* "I test critical flows and fix issues found in review. I am strengthening automated PHPUnit/Pest coverage and would make it a team rule on this program: tests required for money, booking and permission logic." Do not oversell.

**Q82. What do you test first when time is short?** A: The paths where failure costs most: payments, seat availability, refunds, permissions, data export. Low-risk screens come after.

**Q83. Unit vs integration vs end-to-end vs regression vs smoke testing.** A: Unit: one class or function. Integration: parts together (controller + database). End-to-end: whole user journey in a browser (Dusk, Cypress, Playwright). Regression: re-check old behavior after changes. Smoke: quick check after deploy that the app basically works.

**Q84. Mocking vs faking.** A: Mocks replace a dependency and check how it was called. Fakes are simple working replacements (`Mail::fake()`, `Queue::fake()`, `Http::fake()`). Use fakes for outside services so tests are fast and never touch real payment or SMS systems.

**Q85. What is a good code review?** A: Check: does it meet the requirement, is it readable, is it secure, are there tests, any N+1 or heavy queries, error handling, naming, and migration safety. Be specific and kind. Use a checklist and keep pull requests small.

**Q86. What does your CI pipeline do?** A: On every push or pull request: install dependencies, check code style (Pint), run static analysis (PHPStan/Larastan), run tests, and security checks (`composer audit`). Only if all pass can code merge. CD then builds and deploys.

**Q87. Describe a safe deployment.** A: Build once, deploy the same artifact everywhere. Steps: pass CI, deploy to staging, smoke test, deploy to production in a quiet window, run migrations safely, watch errors and metrics, and keep a rollback ready. *Cross-question: How do you do zero-downtime deployment?* A: Blue/green or rolling: start the new version beside the old, check health, switch traffic, keep the old one for rollback. Database changes use "expand then contract": first add things the old code can ignore, deploy code, later remove old columns.

**Q88. How do you roll back when a migration changed data?** A: Code rollback is easy, data rollback is not. So I take a backup before risky migrations, make changes backward-compatible, and test the rollback path on staging.

**Q89. Environments: dev, staging, production.** A: Staging should look like production (same versions, similar data volume with masked data). Never use real personal data in dev. Keep secrets in environment config or a vault, not in the repository.

**Q90. Branching strategy.** A: Short-lived feature branches from `main`, pull requests with review, protected `main`, tagged releases. Hotfix branches for urgent production fixes. Short branches avoid painful merges.

**Q91. How do you track and report quality?** A: Bug count and severity trend, escaped defects (bugs found in production), test pass rate, code coverage on critical modules, mean time to fix, and release failure rate. Metrics guide the team; they are not for blaming people.

**Q92. Bug triage: how do you set severity and priority?** A: Severity is the impact (data loss or no booking is critical). Priority is how soon to fix, based on business need. Examples: a typo on the home page is low severity but may be high priority before a launch.

**Scenario check:** A defect reaches production and a manager asks "how did QA miss this?" What do you say? A: Stay calm and factual: describe the cause, the fix and the prevention (a new test, a checklist item, a CI check). Focus on fixing the process, not blaming a person.

## J. Docker and environments

**Q93. What problem does Docker solve?** A: "Works on my machine." An image holds the app and its exact dependencies, so dev, test and production run the same way.

**Q94. Image vs container? Volume vs bind mount?** A: An image is the read-only template, a container is a running copy. A volume is storage managed by Docker and is good for database data. A bind mount maps a host folder, good for local development. Container data without a volume is lost when the container is removed.

**Q95. How is a typical Laravel stack arranged in Docker?** A: Separate containers: Nginx, PHP-FPM, MySQL or PostgreSQL, Redis, a queue worker or Horizon, a scheduler, and sometimes Mailpit for local mail. Docker Compose starts them together and a network lets them reach each other by service name.

**Q96. A container keeps restarting. How do you debug?** A: `docker ps -a`, `docker logs <name>`, check the exit code, try running the command inside a shell, and look for missing environment variables, wrong database host, file permissions, or a port already in use. Also check health checks and whether the database was ready before the app started.

**Q97. How do you make images smaller and safer?** A: Multi-stage builds (build tools stay out of the final image), small base images, a `.dockerignore`, no secrets inside images, run as a non-root user, pin versions, and scan images for known vulnerabilities.

**Q98. Docker vs Kubernetes?** A: Docker runs containers. Kubernetes manages many containers across many machines (scaling, self-healing, rolling updates). For a program this size Kubernetes may be used, but I would be honest that my hands-on strength is Docker and Compose, with Kubernetes at concept level.

**Q99. File permission problem on production (your story).** A: A Laravel `storage` and cache error came from the deployment user and the web-server user owning files differently. I fixed ownership and permissions, and set the deploy process so new files get the right owner every time.

## K. Security (very important for government systems)

**Q100. OWASP Top 10: name the main ones and the fix.** A: Broken access control (policies, ownership checks), injection (prepared statements/Eloquent bindings), XSS (escape output, `{{ }}` in Blade, CSP), CSRF (tokens), authentication failures (strong passwords, MFA, lockouts), sensitive data exposure (HTTPS, encryption), vulnerable components (update dependencies, `composer audit`), security misconfiguration (debug off, least privilege), and logging gaps.

**Q101. SQL injection: how does it happen and how do you stop it?** A: User input gets joined into SQL text. Stop it with parameter binding (Eloquent and query builder do this). Danger remains in `DB::raw` and `whereRaw` with unsafe input, so bind values there too.

**Q102. XSS vs CSRF vs IDOR.** A: XSS: attacker script runs in another user's browser. CSRF: another site tricks a logged-in browser into sending a request. IDOR: changing an ID in the URL shows someone else's data. Fixes: escape output, CSRF tokens plus SameSite cookies, and authorization checks on every record.

**Q103. How do you store passwords?** A: Hash with bcrypt or Argon2 (Laravel `Hash`), never reversible encryption, never plain text. Add rate limiting, lockouts and MFA for admin accounts.

**Q104. How do you protect personal data (CNIC, phone, travel history)?** A: Collect only what is needed, encrypt in transit (TLS) and sensitive fields at rest, mask data in logs and in non-production, restrict access by role, record who viewed or exported it, and follow retention rules. Never put real data in test environments.

**Q105. How do you secure APIs?** A: Authentication (tokens/OAuth), authorization per resource, input validation, rate limiting, HTTPS only, short-lived tokens, signature checks on webhooks, no secrets in URLs, and careful error messages that do not leak details.

**Q106. How do you handle secrets and keys?** A: Environment variables or a secrets manager, never in Git, different keys per environment, rotate on staff change or suspected leak. If a secret is committed, rotate it at once; deleting it from history is not enough.

**Q107. Role-based access in a large organization.** A: Roles map to permissions (station operator, supervisor, auditor, super admin). Check permissions on the server for every action and scope data by the user's office or region. In multi-tenant work I applied tenant and company scoping at the query level so one tenant never reads another's data.

**Q108. File upload risks.** A: Check real file type and size, rename files, store outside the web root or in object storage, never run uploaded files, and serve with safe headers.

**Q109. Security headers and HTTPS basics.** A: HSTS, Content-Security-Policy, `X-Content-Type-Options`, `X-Frame-Options` or frame-ancestors, secure and HttpOnly cookies. Redirect all HTTP to HTTPS.

**Q110. How would you respond to a suspected data breach?** A: Contain (revoke keys, block access), preserve logs, find the scope, fix the hole, inform the security team and management by procedure, and write lessons learned. Do not delete evidence.

## L. Performance and scaling

**Q111. A page is slow. Where do you start?** A: Measure, do not guess. Check which part is slow: network, server time, database, external API, or front end. Use browser dev tools, Laravel Debugbar/Telescope, slow query log and APM tools. Fix the biggest item first and measure again.

**Q112. Common Laravel performance wins.** A: Eager loading, indexes, selecting fewer columns, caching, queues for slow work, pagination, config/route caching, OPcache, Redis for cache and sessions, and avoiding heavy work in loops.

**Q113. Horizontal vs vertical scaling.** A: Vertical: bigger machine, simple but has a limit. Horizontal: more machines behind a load balancer, needs stateless apps (sessions and files outside the server).

**Q114. Database scaling steps.** A: Fix queries and indexes first, then cache, then read replicas, then partitioning or archiving old data, and only then sharding. I use "optimize before adding infrastructure".

**Q115. Cache invalidation: why is it hard?** A: Cached data can become wrong when the source changes. Options: short expiry, clear the key when data changes, versioned keys, and locks to avoid many requests rebuilding at once.

**Q116. Load testing.** A: Use k6, JMeter or Locust to simulate real user flows and watch response time, error rate, CPU, memory and database connections. Test before peak events and after big changes.

**Q117. Observability: logs, metrics, traces.** A: Logs tell what happened, metrics show trends (response time, queue size, error rate), traces follow one request across services. Add a request ID to every log line. Alert on symptoms users feel (errors, slow responses), not only on CPU.

## M. Cross-check scenarios (practice out loud)

1. **Booking page shows "seat available" but payment says sold out.** Cache is stale or the hold is missing. Discuss seat holds, short cache time on availability, and a final database check at payment time.
2. **Same SMS sent twice.** A job was retried after a timeout. Make the job idempotent (store a sent flag or unique key).
3. **Report totals differ between two screens.** Different filters, time zones, or cancelled records included. Compare queries, check UTC vs local time, and reconcile with raw data.
4. **API from another department changes its response format without notice.** Validate responses, keep an adapter layer so only one place changes, log failures, and agree on versioned contracts. (I handled inconsistent response formats from a Python service on HOLOIN.)
5. **Server CPU at 100% after a release.** Compare with the previous release, check slow queries and new loops, check queue workers, roll back first if users suffer, then find the root cause.
6. **Developer pushed a secret to Git.** Rotate it immediately, remove it from the repo, check access logs, and add a secret-scanning step in CI.
7. **Database disk is almost full.** Find the big tables, archive or purge old logs and data by policy, check binary logs and backups, then add alerts and a retention schedule.
8. **A junior's migration dropped a column in production.** Restore from backup, add review rules for migrations, and use the expand-then-contract practice.
9. **Deadline in 2 days but 5 features left.** Rank by business value and risk, agree the must-haves with the owner, move the rest, and be clear about what is not included.
10. **Cache and database disagree.** Decide which is the source of truth (the database), clear or rebuild the cache, then fix the missing invalidation.

## N. Team lead and delivery questions

**Q118. How do you estimate work?** A: Break it into small tasks, estimate each with a range, add time for testing and review, compare with similar past work, and add a buffer for unknowns. I update estimates when facts change.

**Q119. How do you run sprints and daily work?** A: Sprint planning with clear acceptance criteria, short daily check-ins focused on blockers, a demo at the end, and a retrospective with one or two real improvements.

**Q120. What is your Definition of Done?** A: Code reviewed, tests passing, no new critical warnings, documented where needed, deployed to staging and checked against acceptance criteria, and approved by the product owner.

**Q121. How do you work with non-technical government stakeholders?** A: Use plain words, confirm requirements in writing, show working demos early, explain trade-offs (time, cost, risk) and keep a change log so decisions are traceable.

**Q122. How do you handle risk and dependencies on other vendors or departments?** A: Keep a risk list with owner and date, raise blockers early, build with mocks until the other side is ready, and record agreements in writing.

**Q123. How do you onboard and mentor new developers?** A: A working local setup (Docker makes this fast), a short architecture guide, small first tasks, pair sessions, and clear code-review feedback. I helped juniors and interns at CynoSure and lead developers at ChirpTech.

**Q124. How do you keep documentation useful?** A: Keep it near the code: README with setup, API docs (OpenAPI/Swagger or Postman collections), decision records for big choices, and runbooks for production problems.

## O. Rapid-fire (short answers)

- **Idempotent?** Repeating gives the same result.
- **Stateless app?** Keeps no user state on the server between requests.
- **Difference between 401 and 403?** 401: not authenticated. 403: authenticated but not allowed.
- **What is a deadlock?** Two transactions waiting on each other's locks.
- **What is a race condition?** Result depends on timing of parallel actions. Fix with locks or atomic updates.
- **Why UTC for storage?** Avoids daylight-saving and zone confusion.
- **Soft delete?** Mark as deleted instead of removing, so data can be restored and audited.
- **What is a webhook?** An outside system calls your URL when something happens.
- **What is a load balancer?** Spreads traffic over servers and removes unhealthy ones.
- **What is a reverse proxy?** A server (Nginx) in front of your app that forwards requests and can cache and terminate TLS.
- **What is Redis used for?** Cache, sessions, queues, locks, rate limits.
- **What is a CDN?** Servers near users that serve static files fast.
- **Blue/green deployment?** Two environments, switch traffic from old to new.
- **Canary release?** Send a small share of users to the new version first.
- **What is technical debt?** Quick choices that make future changes slower. Track and repay it deliberately.
- **RTO and RPO?** Time to recover and the amount of data you can afford to lose.
- **What is SLA vs SLO?** SLA is the promise to the customer, SLO is the internal target.

## P. Questions you should ask them

1. Which technology stack and database is the program using?
2. How big is the team and how are QA and developers organized?
3. Is there an existing test and CI process, or will I help build it?
4. How are releases approved and how often do they happen?
5. Which systems must integrate (railways operations, payments, NADRA, SMS)?
6. What are the uptime and peak-load expectations?
7. What does success look like for this role in the first 6 months?

## Q. Your honest-gap answers (memorize)

- **"Have you worked with Pakistan Railways or government systems?"** "Not directly. My experience is in large multi-tenant and high-volume platforms. The same things matter here: reliability, security, audit trails and clear delivery tracking. I learn domain rules quickly by working with the business team."
- **"How strong is your automated testing?"** "Good at testing critical flows and reviewing code, and I am raising automated test coverage in my own projects. On this program I would require tests for booking, payment and permission logic and run them in CI."
- **"BI tools?"** "I have built the data side: aggregation, summary tables, exports and APIs for dashboards. I would pick up the BI tool the program uses."
- **"Kubernetes?"** "Docker and Compose in practice; Kubernetes at concept level, and I would learn it as the program needs."

## Study plan (7 days)

- **Day 1:** Sections A, B. **Day 2:** Section C. **Day 3:** Section D, E.
- **Day 4:** Sections F, G (draw each design on paper). **Day 5:** Sections H, I, J.
- **Day 6:** Sections K, L. **Day 7:** Section M scenarios and N, answer all out loud in 2 minutes each.
