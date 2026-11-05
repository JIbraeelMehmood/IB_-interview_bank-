# Interview Box PWA --- MongoDB Atlas & Vercel Integration Report

**Report date:** 4 November 2026\
**Repository:** `JIbraeelMehmood/IB_-interview_bank-`\
**Feature branch:** `feat/mongodb-multi-user-auth`\
**Pull request:**
https://github.com/JIbraeelMehmood/IB\_-interview_bank-/pull/1\
**Vercel project:** `ib-interview-bank`\
**MongoDB Atlas resource:** `atlas-camel-lens-pwa`\
**Target database:** `interview_box`

## 1. Project objective

Add multi-user cloud authentication and synchronization to the existing
Interview Box PWA while preserving its offline-first behavior.

Scope: - Email/password signup, login and logout. - MongoDB-backed users
and sessions. - Account-scoped cloud sync records. - Keep
Dexie/IndexedDB local storage for offline use. - Keep the existing
Laravel AI/content server configuration separate. - Email verification
and password reset were not included in the initial scope.

The separate Python LeadFinder application is not part of this
integration; it is intended for personal use only.

## 2. Architecture

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  React/Vite Interview Box PWA        Frontend application

  Dexie / IndexedDB                   Local browser data and offline
                                      behavior

  Vercel Serverless Functions         Auth, session, sync and
                                      health-check endpoints

  MongoDB Atlas                       Users, sessions and per-user cloud
                                      records

  Vercel environment variables        Secure server-side database
                                      configuration

  GitHub feature branch / PR          Isolated implementation before
                                      merging
  -----------------------------------------------------------------------

The browser communicates with Vercel API routes. The MongoDB URI must
remain server-side and must never be exposed in frontend code.

## 3. Atlas and Vercel configuration

A new Atlas resource was created:

-   Resource/cluster: `atlas-camel-lens-pwa`
-   Atlas project ID: `6aea35d64b88177ceb72f6cd`
-   Cluster host: `atlas-camel-lens-pwa.8cy0nsq.mongodb.net`
-   Database user: `Vercel-Admin-atlas-camel-lens-pwa`
-   Application database: `interview_box`
-   Intended Vercel project: `ib-interview-bank`

The connection URI was pasted into the conversation during setup. Treat
that credential as exposed: rotate the Atlas database user's password
and update Vercel with the new URI. Never include the URI/password in
source code, Git commits, logs, screenshots or this report.

### Required Vercel environment variables

In Vercel → `ib-interview-bank` → Settings → Environment Variables:

  -----------------------------------------------------------------------
  Variable                            Value
  ----------------------------------- -----------------------------------
  `MONGODB_URI`                       Newly rotated Atlas connection URI

  `MONGODB_DATABASE`                  `interview_box` (optional if code
                                      default is retained)
  -----------------------------------------------------------------------

Ensure `MONGODB_URI` is configured for Preview before testing. Configure
Production when ready. Redeploy after changing environment variables
because existing deployments do not automatically receive updated
values.

The user reported creating the new database/resource and connecting it
to the Vercel project. A successful database ping has not yet been
independently verified.

## 4. Problems encountered and how they were addressed

### Issue A --- Vercel function invocation failure during authentication

**Observed symptom**

The signup/authentication flow returned:

``` text
A server error has occurred
FUNCTION_INVOCATION_FAILED
```

An earlier error ID was reported:

``` text
bom1::zvvgr-1793732155301-e78941d07914
```

Possible causes initially considered were missing/invalid `MONGODB_URI`,
Atlas network/authentication failure, missing `mongodb` dependency, or a
runtime/module import problem. The exact cause was not confirmed at that
point.

**Code architecture change**

Shared helpers were moved out of `api/_lib/` into a top-level `server/`
directory:

-   `server/auth.ts`
-   `server/mongodb.ts`

The intention was to keep reusable helpers outside Vercel's API route
directory so they would not be treated as separate API functions. This
was a preventative architecture change, not proof that the original
invocation failure was caused by the folder layout.

### Issue B --- Confirmed ESM module resolution failure

**Observed Vercel production log**

``` text
GET /api/auth/me
Error [ERR_MODULE_NOT_FOUND]:
Cannot find module '/var/task/server/auth'
imported from /var/task/api/auth/me.js
```

Runtime details: - Node.js `24.x` - Region `bom1` (Mumbai) -
Environment: `production` - Branch: `main` - Route: `/api/auth/me`

**Diagnosis**

The deployed ESM runtime could not resolve the extensionless relative
import `../../server/auth`. This error occurs while loading the route,
before the handler can complete its authentication or database work. It
does not prove that the Atlas credentials or network configuration are
incorrect.

**Correction pushed to the feature branch**

Relative imports were changed to include explicit `.js` extensions, for
example:

``` ts
import { currentUser } from '../../server/auth.js'
import { getDb } from '../../server/mongodb.js'
```

The shared auth module imports its MongoDB helper using:

``` ts
import { getDb } from './mongodb.js'
```

The health route imports the helper using:

``` ts
import { getDb } from '../server/mongodb.js'
```

Files checked/updated: - `api/auth/me.ts` - `api/auth/login.ts` -
`api/auth/logout.ts` - `api/auth/signup.ts` - `api/v1/sync.ts` -
`api/health.ts` - `server/auth.ts`

The auth route files already showed explicit `.js` imports when
rechecked on the branch. Explicit extensions were then applied to the
sync route, health route and shared auth module. These changes were
committed to `feat/mongodb-multi-user-auth`.

Latest recorded commit from the sequential import-fix updates:

``` text
715e61f704653f974f64934988d549c1833d2209
```

This confirms source changes were pushed; it does not prove that Vercel
built or ran them successfully.

### Issue C --- Production was deploying `main`, not the feature branch

The supplied log explicitly showed:

``` text
Environment: production
Branch: main
```

The MongoDB/auth implementation is on:

``` text
feat/mongodb-multi-user-auth
```

and is held in draft PR #1:

https://github.com/JIbraeelMehmood/IB\_-interview_bank-/pull/1

Therefore, the reported production error came from a deployment of
`main`, not necessarily the latest feature-branch code containing the
import fixes.

**Required action:** deploy the latest feature branch to a Vercel
Preview deployment and test that deployment. Do not merge the PR or
treat the current production deployment as proof that the feature branch
works.

### Issue D --- Atlas connectivity not yet confirmed

A health-check route was added:

``` text
GET /api/health
```

It calls `getDb()` and executes a MongoDB ping command.

Expected successful response:

``` json
{
  "ok": true,
  "database": "connected"
}
```

No successful response from the deployed endpoint has been provided yet.
If it returns HTTP 503, inspect the Vercel Function Logs for missing
environment variables, invalid credentials, Atlas network access
restrictions or an incorrect URI.

## 5. Code changes made

### 5.1 `server/mongodb.ts` --- MongoDB connection helper

The helper: - Reads `MONGODB_URI` from the server environment. - Throws
a clear error if it is missing. - Creates a MongoDB client. - Caches the
connection promise on `globalThis` to reuse it in warm function
instances. - Clears the cached promise if connection fails, allowing a
later retry. - Selects `MONGODB_DATABASE`, defaulting to
`interview_box`.

### 5.2 `server/auth.ts` --- authentication/session logic

The shared module includes: - Email normalization. - Password hashing
using Node.js `scrypt`. - Password verification using
`timingSafeEqual`. - Random session token generation. - SHA-256 hashing
of session tokens before storing them. - Session creation, lookup and
deletion. - HttpOnly session cookies. - Secure cookie selection based on
Vercel/forwarded HTTPS context. - MongoDB indexes for unique user email,
session expiry and session user ID.

### 5.3 API endpoints

  -----------------------------------------------------------------------
  Route                   Method                  Purpose
  ----------------------- ----------------------- -----------------------
  `/api/auth/signup`      POST                    Validate input, create
                                                  user and session

  `/api/auth/login`       POST                    Verify credentials and
                                                  create session

  `/api/auth/logout`      POST                    Delete session and
                                                  clear cookie

  `/api/auth/me`          GET                     Resolve current
                                                  session/user

  `/api/v1/sync`          POST                    Sync supported records
                                                  for authenticated user

  `/api/health`           GET                     Ping MongoDB and report
                                                  connectivity
  -----------------------------------------------------------------------

### 5.4 `api/v1/sync.ts` --- account-scoped cloud sync

The route: - Requires an authenticated user. - Accepts a restricted set
of record types. - Validates record shape and payload size. - Creates
record IDs using the authenticated user's ID, table and record key. -
Reads/writes records scoped to the current user. - Returns
acknowledgements and that user's cloud changes.

Allowed record types in the current implementation:

``` text
ratings
reviews
answers
stories
questions
translations
settings
```

This code still needs functional and security testing, especially
ownership checks, conflict handling, record deletion, and separation of
shared/base content from user-specific content.

### 5.5 Frontend account and offline behavior

The feature branch also contains changes for: - Signup/login UI in
`src/features/Auth.tsx`. - Session bootstrap and account state in
`src/App.tsx`. - Account-aware sync behavior. - Account-specific local
data handling. - Preserving Dexie/IndexedDB offline functionality.

These areas have not yet been confirmed by a complete deployed test.
Account switching must be tested to ensure users cannot see one
another's data and shared question-bank content is not accidentally
removed.

### 5.6 MongoDB package dependency

`package.json` includes:

``` json
"mongodb": "^6.12.0"
```

A previous review noted that `package-lock.json` had not yet been
verified as updated with this dependency. This is still a
deployment-readiness check. Confirm the lockfile includes MongoDB and
that Vercel's install/build completes successfully.

## 6. Current status --- completed vs. unverified

  -----------------------------------------------------------------------
  Item                                Status
  ----------------------------------- -----------------------------------
  New Atlas resource created          Reported completed by user

  Vercel project connection           Reported completed; not
                                      independently verified

  `MONGODB_URI` configured for        Must verify in Vercel settings
  Preview and Production              

  Shared `server/auth.ts` and         Implemented on feature branch
  `server/mongodb.ts` helpers         

  Signup/login/logout/session API     Implemented on feature branch
  routes                              

  MongoDB sync route                  Implemented on feature branch

  MongoDB health-check route          Implemented on feature branch

  Explicit ESM `.js` import           Pushed to feature branch
  corrections                         

  Feature branch / draft PR           Exists

  Production branch updated           No; supplied log shows `main`

  Latest feature branch deployed to   Not confirmed
  Preview                             

  Successful `/api/health` ping       Not confirmed

  Signup/login against Atlas          Not confirmed

  Full account-isolation/offline      Not confirmed
  regression testing                  

  `package-lock.json` consistency     Must verify

  PR merged into `main`               No; keep unmerged until
                                      verification
  -----------------------------------------------------------------------

## 7. Deployment and verification procedure

### Step 1 --- Rotate the exposed Atlas credential

Rotate the database user's password in Atlas. Update the Vercel
`MONGODB_URI` value with the new URI. Do not paste the new URI into chat
or commit it to Git.

### Step 2 --- Verify Vercel environment variables

In Vercel → `ib-interview-bank` → Settings → Environment Variables,
verify: - `MONGODB_URI` exists and contains the rotated URI. - It is
enabled for Preview. - It is enabled for Production when production is
ready. - `MONGODB_DATABASE` is `interview_box`, or is omitted so the
code default is used.

If Atlas integration manages environment variables automatically, verify
the actual variable names and deployment targets instead of assuming
they match the application.

### Step 3 --- Deploy the feature branch to Preview

In Vercel Deployments, deploy:

``` text
feat/mongodb-multi-user-auth
```

Confirm the deployment uses the latest commit containing the `.js`
import fixes. Do not use the current Production deployment on `main` to
test the branch changes.

### Step 4 --- Test the health endpoint

Open:

``` text
https://<preview-deployment-domain>/api/health
```

Interpret the result: - **HTTP 200 and `database: connected`:** The
deployed function reached MongoDB and completed a ping. - **HTTP 503:**
Inspect function logs for environment-variable, credential,
network-access or URI errors. - **`ERR_MODULE_NOT_FOUND`:** Confirm the
deployed commit includes explicit `.js` imports and that Preview uses
the correct branch.

### Step 5 --- Test authentication

After the health endpoint succeeds:

1.  Create a test account.
2.  Confirm signup succeeds.
3.  Confirm the browser receives the session cookie.
4.  Call `/api/auth/me` and confirm it returns the same user.
5.  Sign out and confirm `/api/auth/me` no longer reports an
    authenticated user.
6.  Sign in again with the same credentials.
7.  Create a second test account and verify data isolation.

Use test accounts and non-sensitive data.

### Step 6 --- Test cloud sync and offline behavior

-   Create/update a user-owned record while signed in.
-   Confirm it syncs to MongoDB.
-   Reload and verify the record is available to that same user.
-   Sign in as another user and verify the first user's records are not
    visible.
-   Test offline edits and sync after reconnecting.
-   Test account switching and local data separation.
-   Confirm shared/base question-bank and translation data remain
    intact.

### Step 7 --- Review and deploy production

Before merging PR #1: - Confirm Preview build succeeds. - Confirm health
check succeeds. - Confirm signup, login, logout and session lookup
work. - Confirm sync and account isolation work. - Run repository checks
and tests. - Confirm `package-lock.json` matches `package.json`. -
Review local data-clearing logic for regressions.

Then merge the PR and verify Production environment variables before
deploying `main`.

## 8. Troubleshooting reference

  ---------------------------------------------------------------------------------
  Symptom                           Likely area             What to inspect
  --------------------------------- ----------------------- -----------------------
  `ERR_MODULE_NOT_FOUND` for        ESM import/deployed     Explicit `.js` imports;
  `server/auth`                     commit                  branch and commit

  `MONGODB_URI is not configured`   Vercel environment      Preview/Production
                                                            variables; redeploy

  MongoDB authentication failure    Atlas credentials       Rotate password; update
                                                            URI; check DB user

  Server selection timeout          Atlas network access    Atlas Network Access
                                                            allowlist and cluster
                                                            status

  `Cannot find package 'mongodb'`   Dependency installation `package.json`,
                                                            lockfile, Vercel
                                                            install/build logs

  Health succeeds but signup fails  Auth logic/database     Signup function logs,
                                    write                   validation, indexes

  Signup succeeds but               Cookie/session          `Set-Cookie`,
  `/api/auth/me` returns 401                                HTTPS/Secure, browser
                                                            cookie behavior,
                                                            session record

  Production still shows old        Deployment source       Vercel branch, commit
  behavior                                                  SHA and redeployment
  ---------------------------------------------------------------------------------

## 9. Security and reliability checks

-   Never expose `MONGODB_URI` to browser/frontend code.
-   Rotate credentials that were shared in chat or otherwise exposed.
-   Never store plaintext passwords.
-   Keep session tokens hashed in MongoDB and cookies HttpOnly.
-   Scope every cloud record read/write to the authenticated user's ID.
-   Validate payload size and allowed record types server-side.
-   Review CSRF/CORS assumptions if frontend and API are served from
    different origins.
-   Consider rate limiting signup and login before public launch.
-   Confirm TTL index behavior and expired-session handling.
-   Do not perform destructive local database cleanup until account
    isolation and shared-data preservation have been tested.

## 10. Conclusion

The application-side structure for MongoDB-backed accounts and cloud
sync has been added to the feature branch. A specific Vercel ESM import
failure was identified from production logs, and explicit `.js`
extensions were pushed to the feature branch to address it.

**The integration is not yet verified as successfully running end to
end.** The latest supplied error came from Production on `main`, whereas
the corrections are on `feat/mongodb-multi-user-auth`. A successful
Preview deployment, MongoDB ping, signup/login test and
account-isolation test are still required.

The next milestone is to rotate/configure the Atlas credential, deploy
the latest feature branch to Preview, receive HTTP 200 from
`/api/health`, and then test authentication and per-user sync. Merge
only after those checks pass.

## Appendix --- References

-   Repository: https://github.com/JIbraeelMehmood/IB\_-interview_bank-
-   Feature branch: `feat/mongodb-multi-user-auth`
-   Pull Request #1:
    https://github.com/JIbraeelMehmood/IB\_-interview_bank-/pull/1
-   Vercel project: `ib-interview-bank`
-   Atlas resource: `atlas-camel-lens-pwa`
-   Health endpoint: `/api/health`
-   Auth endpoints: `/api/auth/signup`, `/api/auth/login`,
    `/api/auth/logout`, `/api/auth/me`
-   Sync endpoint: `/api/v1/sync`





git pull origin main 
remote: Enumerating objects: 184, done.
remote: Counting objects: 100% (184/184), done.
remote: Compressing objects: 100% (166/166), done.
remote: Total 173 (delta 105), reused 0 (delta 0), pack-reused 0 (from 0)
Receiving objects: 100% (173/173), 25.09 KiB | 1.09 MiB/s, done.
Resolving deltas: 100% (105/105), completed with 8 local objects.
From https://github.com/JIbraeelMehmood/IB_-interview_bank-
 * branch            main       -> FETCH_HEAD
   ab816d0..acd69f6  main       -> origin/main
Updating ab816d0..acd69f6
Fast-forward
 .env.example          |   4 +++
 .gitignore            |   3 ++
 api/auth/login.ts     |  19 ++++++++++
 api/auth/logout.ts    |   8 +++++
 api/auth/me.ts        |  13 +++++++
 api/auth/signup.ts    |  23 ++++++++++++
 api/health.ts         |  16 +++++++++
 api/v1/sync.ts        |  46 ++++++++++++++++++++++++
 package.json          |   3 +-
 server/auth.ts        | 125 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 server/mongodb.ts     |  19 ++++++++++
 src/App.tsx           | 191 ++++++++++++++++++++++++++++++++++++++++++++-------------------------------------------------------
 src/features/Auth.tsx |  52 +++++++++++++++++++++++++++
 src/lib/account.ts    |  36 +++++++++++++++++++
 src/lib/settings.ts   | 123 +++++++++++++---------------------------------------------------
 src/lib/sync.ts       |  97 +++++++++++++++++---------------------------------
 src/styles/app.css    |   2 +-
 17 files changed, 508 insertions(+), 272 deletions(-)
 create mode 100644 .env.example
 create mode 100644 api/auth/login.ts
 create mode 100644 api/auth/logout.ts
 create mode 100644 api/auth/me.ts
 create mode 100644 api/auth/signup.ts
 create mode 100644 api/health.ts
 create mode 100644 api/v1/sync.ts
 create mode 100644 server/auth.ts
 create mode 100644 server/mongodb.ts
 create mode 100644 src/features/Auth.tsx
 create mode 100644 src/lib/account.ts