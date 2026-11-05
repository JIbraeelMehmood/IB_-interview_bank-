# Question Priority Map by Level: Junior, Mid (3 years), 4 Years, Senior (5+)

For the PITB / Pakistan Railways Senior Software Engineer, IT Operations job. Question numbers match the English guide and the Roman Urdu v2 tab (Q1 to Q249, plus scenario sets M1 to M12 and W1 to W12, and coding tasks C1 to C8). Stars show priority for THIS job: three stars means must prepare, two stars means should prepare.

## 1. What each level is expected to show

| Level | Interviewer expects | Answer depth |
| --- | --- | --- |
| Junior (0 to 2 years) | Knows the basics and can write simple code | Definition plus one small example |
| Mid (about 3 years) | Builds features alone, knows the common traps | How it works plus one gotcha you have hit |
| 4 years (your level) | Owns a module, designs, protects quality, helps the team | How, why, the trade-off, and a real story |
| Senior (5+ years) | Owns outcomes across modules, decides under uncertainty, mentors, handles incidents | Trade-offs, numbers, failure stories, what you would change |

**Where you will be judged:** the job title is Senior, so even with 4 years you will get senior-style questions (ownership, design, quality, delivery). Be strong on the mid-level technical questions, and show senior thinking through design trade-offs and real stories. The 3-year and 4-year difference: at 3 years they accept a good implementation; at 4 years they also expect you to explain why you chose it, what could go wrong, and how you would test and monitor it.

## 2. Junior level: foundations everyone must know cold

If you miss any of these, nothing else helps. Answer each in under a minute.

| Theme | Questions |
| --- | --- |
| PHP basics | Q13 PHP-FPM request flow, Q15 PHP 8 features, Q17 errors and logging, Q18 dependency injection, Q19 interface vs abstract vs trait, Q20 PSR standards |
| Laravel basics | Q21 request lifecycle, Q23 N+1 problem, Q24 queues, Q28 validation and API design, Q152 mass assignment, Q160 local scope |
| MySQL basics | Q31 finding a slow query, Q32 composite index, Q111 indexing low-cardinality columns, Q126 DECIMAL for money, Q131 normal forms, Q132 SQL tasks |
| Web basics | Q68 request flow end to end, Q69 HTTP methods and status codes, Q72 CORS, sessions and tokens |
| Git and tools | Q187 merge vs rebase, Q188 merge conflicts, Q189 revert vs reset, Q192 good pull request, Q193 permissions fix, Q195 checking logs and processes |
| Testing and Docker | Q220 PHPUnit vs Pest, Q221 feature test, Q83 why Docker, Q84 Laravel stack in containers |
| Security basics | Q91 OWASP Top 10, Q95 secrets management, Q147 hashing vs encryption vs encoding, Q151 SQL injection with Eloquent |
| Coding | C1 duplicates, C2 group and count, C3 CNIC format, C4 balanced brackets |
| Soft skills | Q177 a tool you do not know, Q178 your weakness |

## 3. Mid level (about 3 years): build features alone and avoid common traps

| Theme | Questions |
| --- | --- |
| Laravel in practice | Q22 app structure, Q25 scheduler, Q26 authentication and authorization, Q27 multi-tenancy, Q29 file uploads, Q30 audit logging, Q165 whereHas vs join, Q166 chunk vs chunkById, Q167 firstOrCreate race, Q168 dispatch after commit, Q171 bulk insert, Q172 atomic increment |
| PHP depth | Q14 OPcache and tuning, Q16 large files with generators |
| Database | Q33 double booking, Q34 storing GPS pings, Q35 keyset pagination, Q37 transactions and deadlocks, Q38 backups, Q108 clustered index, Q110 reading EXPLAIN, Q112 ORDER BY with indexes, Q113 slow COUNT, Q114 joins, Q115 window functions, Q116 CTEs, Q122 deadlock investigation, Q127 DATETIME vs TIMESTAMP, Q128 JSON columns |
| Patterns | Q48 patterns you use, Q49 Strategy, Q50 State, Q51 Adapter, Q52 SOLID |
| APIs and integration | Q70 REST vs WebSockets vs polling, Q71 integrating outside systems, Q214 idempotency keys, Q215 filtering and pagination, Q216 error responses, Q217 versioning |
| QA and CI/CD | Q74 QA strategy, Q75 what to test first, Q76 testing external calls, Q77 CI pipeline, Q78 release and rollback, Q81 severity vs priority, Q82 code review, Q222 RefreshDatabase, Q223 testing jobs and events, Q224 testing authorization, Q225 coverage, Q226 flaky tests |
| Operations | Q85 restarting container, Q87 dev, staging and production, Q88 monitoring and alerts, Q89 runbooks, Q194 full disk, Q196 cron vs scheduler, Q197 Nginx for Laravel, Q198 keeping workers alive, Q199 PHP-FPM out of workers, Q201 simple low-downtime deploy |
| Security | Q92 protecting CNIC and phone data, Q94 securing APIs, Q97 secure uploads, Q146 encryption layers, Q150 database users, Q153 tamper-evident audit log |
| Performance and Redis | Q98 slow page, Q99 peak days, Q100 cache invalidation, Q209 Redis structures, Q210 persistence, Q211 eviction |
| Coding | C5 distance between GPS points, C6 log parsing, C7 overlapping bookings, C8 rate limiter |

## 4. 4-year level (your target): the questions that matter most for this job

Prepare every three-star question first. Then do the two-star ones.

| Theme | Three stars (must) | Two stars (should) |
| --- | --- | --- |
| Delivery and ownership | Q4 meeting targets, Q5 bug-free software, Q6 pressure to release early, Q8 your project end to end, Q11 requirement change, Q12 production mistake, Q102 estimation, Q104 Definition of Done | Q1 why this program, Q3 what IT Operations means, Q9 managing different skill levels, Q10 non-technical officers, Q103 sprints, Q105 dependencies |
| Program designs | Q55 train tracking, Q56 ticket booking, Q57 fuel monitoring, Q58 control room dashboard, Q59 attendance, Q60 e-inspection | Q61 police records, Q62 Helpline 117, Q64 Rabta app integration, Q65 weak connectivity, Q66 monolith vs microservices |
| Database | Q31 slow query, Q32 composite index, Q33 double booking, Q34 GPS storage, Q37 transactions, Q38 backups, Q110 EXPLAIN, Q117 views, procedures, triggers, Q119 gap locks, Q120 MVCC, Q122 deadlocks | Q35 pagination, Q36 live table change, Q39 replicas, Q118 partitioning, Q121 SKIP LOCKED, Q123 replication risks, Q132 SQL tasks |
| Laravel depth | Q22 structure, Q23 N+1, Q24 queues, Q25 scheduler, Q26 authorization, Q27 multi-tenancy, Q160 local scope, Q161 global scope, Q162 global scope dangers, Q163 division scoping, Q167 firstOrCreate race, Q168 after commit | Q28 validation, Q29 uploads, Q30 audit logs, Q165 whereHas vs join, Q166 chunkById, Q169 observers on bulk updates, Q170 strict mode |
| QA, CI/CD, release | Q74 QA strategy, Q75 test priorities, Q77 CI pipeline, Q78 safe release, Q79 UAT, Q80 quality metrics | Q76 testing integrations, Q81 severity vs priority, Q82 code review, Q221 to Q227 testing practice |
| Security and data | Q91 OWASP, Q92 CNIC protection, Q93 insider misuse, Q146 encryption, Q150 database users, Q154 data leaks, Q155 secure export | Q94 API security, Q95 secrets, Q96 breach response, Q97 uploads, Q148 encrypted search, Q149 masking, Q151 SQL injection, Q152 mass assignment, Q156 sharing data |
| Operations and monitoring | Q88 monitoring, Q89 runbook, Q90 incident response, Q99 peak days | Q83 to Q87 Docker and environments, Q98 slow page, Q100 cache invalidation, Q101 scaling steps, Q244 uptime, Q246 monitoring tools, Q248 alert fatigue |
| Reporting and BI | Q41 reports without slowing live, Q44 slow report, Q45 totals mismatch, Q46 BI tools (honest answer) | Q40 expected reports, Q42 ETL, Q43 fact and dimension, Q47 trust in numbers, Q133 to Q137 data at scale, Q144 late and duplicate data |
| Patterns | Q48 patterns you use, Q49 Strategy, Q51 Adapter | Q50 State, Q52 SOLID, Q53 Repository, Q54 CQRS |
| Tricky and behavioral | Q7 government experience, Q173 coding vs managing, Q174 silent data change, Q175 friend asks for a record, Q176 bug before a demo, Q177 unknown tool, Q178 weakness, Q179 private vs government, Q180 disagreeing with PITB, Q181 poor vendor code, Q183 salary, Q184 CV honesty, Q186 first 30 days | Q182 why leaving, Q185 long hours, Q236 to Q241 behavioral stories |
| Scenarios | M1 to M12 (practice at least 6 aloud), W1, W3, W7, W9, W12 | Rest of W1 to W12 |
| Live coding | C1, C2, C3, C7, a Laravel scope, an observer with audit row, an N+1 fix | C5, C6, C8 |

## 5. Senior level (5+ years): stretch questions for the senior-style rounds

You may get a few of these because the title is Senior. Prepare the story and the trade-off, not the memorized definition.

| Theme | Questions |
| --- | --- |
| Architecture and trade-offs | Q53 Repository or not, Q54 CQRS and events, Q61 sensitive police system, Q62 helpline tooling, Q63 smart stations, Q64 Rabta integration, Q65 weak connectivity, Q66 monolith vs microservices, Q67 high availability and disaster recovery, Q164 scopes vs repository vs query object |
| Scale and data | Q36 changing a huge live table, Q101 scaling steps, Q123 replication and failover, Q133 big data, Q134 capacity estimate, Q135 hot, warm, cold data, Q136 roll-ups, Q137 batch vs stream, Q141 choosing a store for GPS, Q143 CAP, Q144 late and duplicate data, Q145 data quality |
| Leadership | Q9 mixed skill teams, Q105 dependencies, Q106 documentation for 3 years, Q107 handover, Q228 Scrum vs Kanban, Q230 prioritization, Q231 reporting to officers, Q232 risk register, Q233 underperformer, Q234 team conflict, Q235 retrospectives |
| Data governance | Q156 sharing data with other departments, Q157 database hardening, Q158 ransomware, Q159 data protection policy |
| Infrastructure | Q202 to Q208 networking basics (the fiber backbone side), Q242 on-premise vs cloud, Q243 VMs vs containers, Q245 backup rule, Q249 capacity planning |
| Strategy answers | Q179 private vs government, Q180 disagreeing with PITB, Q183 salary expectations, Q186 first 30 days |

**What makes an answer sound senior:** state the trade-off in one sentence, give one number (time saved, rows, users), mention the failure mode and how you would detect it, and finish with a real example. Example: "I used a latest-value record so dashboards read one row per train. The trade-off is one extra write per ping. If the writer lags, the data is stale, so I show a stale label and alert."

## 6. If you only have 3 days: the top 30

1. Q8 your project, Q4 targets, Q5 bug-free software
2. Q55 train tracking, Q56 booking, Q33 double booking
3. Q31 slow query, Q34 GPS storage, Q110 EXPLAIN
4. Q23 N+1, Q24 queues, Q161 and Q162 global scopes
5. Q74 QA strategy, Q77 CI, Q78 safe release
6. Q91 OWASP, Q92 CNIC protection, Q93 insider misuse
7. Q88 monitoring, Q90 incident response
8. Q117 views, procedures, triggers, Q167 firstOrCreate race, Q168 after commit
9. Q7 government experience, Q174 silent data change, Q176 bug before a demo, Q178 weakness, Q186 first 30 days
10. C1, C2, C7 coding and one scope or observer written from memory

## 7. Which questions come in which round

| Round | Typical focus | Sets to prepare |
| --- | --- | --- |
| HR or screening call | Introduction, experience, salary, why this job | Q1, Q2, Q7, Q8, Q178, Q182, Q183, Q184 |
| Technical round on Zoom | PHP, Laravel, MySQL, testing, security, live coding | Sections 2 to 4 above, C1 to C8 |
| Design or scenario round | Tracking, booking, incidents, performance | Q55 to Q67, M1 to M12, W1 to W12 |
| Managerial or final round | Delivery, quality, team, judgment, ethics | Q4 to Q12, Q102 to Q107, Q173 to Q186, Q236 to Q241 |

## 8. Lower priority for this job (skim only)

Q124 connection pools, Q125 buffer pool sizing, Q138 queue tool comparison (Kafka depth), Q139 and Q140 lakes and columnar stores, Q142 shard keys, Q203 and Q204 device protocols, the Bloom filter and consistent hashing lines in the concept sheet, and MongoDB aggregation details unless you used MongoDB in a real project. Know them at definition level; do not spend study days on them.

## 9. How to use this map

1. Day 1: all junior questions, fast, out loud. They should feel easy.
2. Days 2 and 3: mid-level questions, then the 4-year three-star list.
3. Then practice the two-star list, the scenarios and the coding tasks.
4. Read the senior section last, only for trade-off phrases and stories.
5. Keep your levels honest in answers: describe what you really did, then show how you would think about it at a larger scale.
