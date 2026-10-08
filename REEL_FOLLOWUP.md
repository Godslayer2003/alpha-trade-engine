# Reel security follow-up

## Verified provider state

The production API connects to the Neon Alpha Trade Engine project and its production branch. The database credential was rotated by the operator and the replacement Render deployment became live. Database migrations run before API startup, so the successful rollout verifies connectivity; the health route alone does not query PostgreSQL.

A metadata-only query on production confirmed that `neondb_owner` has LOGIN, CREATEDB, CREATEROLE and BYPASSRLS and belongs to `neon_superuser`. It is not a PostgreSQL superuser, but it is too privileged for normal API requests. No customer records were queried and no production grants were changed.

OpenAI's signed-in account displayed Free trial with no remaining credits. Render displayed Hobby, no card on file and zero accrued charges. These observations do not establish that monetary caps or notification settings are configured, or that every provider key belongs to those accounts.

## Dependency work

Jest was upgraded to 30.5.2, its type definitions to 30 and ts-jest to 29.4.14. The transformer's published peer dependencies support Jest 30. All 28 API unit tests and nine HTTP tests passed with the new versions.

The full npm audit changed from 32 high and seven moderate package findings to five high and 22 moderate package findings. These counts include affected dependency chains, not 27 distinct application vulnerabilities. Remaining direct advisories involve braces, postcss-selector-parser and sprintf-js. At review time, npm's latest braces and sprintf-js releases were still affected. The selector-parser path requires a separately verified compatibility update. Do not hide advisories or use forced dependency downgrades to obtain a green report.

## Remaining deployment transition

Local preparation now includes separate migration/runtime Docker targets, a manual
protected-environment migration workflow, reviewed runtime-grant SQL and CI
regression coverage. The default legacy target and live Blueprint preserve the
current deployment contract. See DATABASE_PRIVILEGES.md before activation.

Local disposable PostgreSQL verification passed the existing account/MFA/ownership
and quota integration under a restricted login, denied DDL/role/migration-table
operations, and tested future table/sequence grants. The runtime container built
and passed non-root/production-mode checks, registration, secure-cookie,
anonymous-access and missing-payment-configuration checks with that restricted
login. All 28 API unit tests and nine HTTP tests passed. Production npm audit still
reports zero advisories; the full tree still reports five high and 22 moderate
package findings. These are local results, not provider rollout or complete audit
evidence. No production credential, role, grant or billing setting was changed.

1. Create a dedicated runtime login without CREATEDB, CREATEROLE, BYPASSRLS, privileged memberships or schema ownership. Grant only CONNECT, schema USAGE and the table/sequence operations required by the API. Keep the Prisma migration table outside its write grants.
2. Move production migrations out of API startup to a separate authorized deployment job using the owner credential. Keep that credential out of the long-running API environment. Configure default privileges for tables created by that migration owner.
3. Verify against disposable PostgreSQL that runtime access supports account transactions and quotas while rejecting DDL, role changes and migration-table writes. Then apply the production grants, update the runtime connection and verify deployment.
4. Keep the current deployment unchanged until the new role and migration job are configured. Creating security-sensitive access requires action-time confirmation; entering or changing credentials in browser UI requires operator handoff.

## Unfinished checks

## 7 October continuation

- Prepared protected master-only migration environment with operator review and
  admin bypass disabled. It has no secrets. Runtime role creation and production
  credential changes remain pending operator confirmation/entry. The API remains
  on its existing live connection and startup-migration contract.
- Matched production role/grant metadata without reading customer rows: owner
  privileges include REPLICATION; PUBLIC inherits database TEMPORARY but does not
  have application table grants. Only the public application schema was found.
  See DATABASE_PRIVILEGES.md for the coordinated manual-release contract.
- Moved shared Tailwind tooling to the workspace root so npm's root override
  resolves selector-parser 7.1.6 consistently. Full application CSS was
  byte-identical; the production web build and route-quality checks passed.
- Moved the existing NYC configuration reader to YAML 4.3.2 and removed its
  argparse 1 / sprintf-js chain. Added a CI YAML configuration compatibility
  check; the full 35-test unit suite passed with coverage instrumentation.
- Full dependency audit now reports five high and zero moderate package findings,
  all in the unpatched braces build-tool chain. Production-only audit reports zero.
  No findings were suppressed, and no dependency was downgraded for audit output.
- Added bounded checkout IDs and required the caller's paid checkout to have the
  expected one-time payment mode, USD currency and 500-cent total. Seven unit
  regressions and one additional HTTP regression cover these boundaries. There
  are now 35 passing API unit tests and ten passing HTTP tests.
- Playwright verified dark/light mode at 320, 390 and 1280 pixels: navigation,
  workspace controls and sign-in dialogs passed without horizontal overflow or
  page exceptions. Desktop/mobile screenshots were inspected. Responses were
  synthetic; the absent local API produced resource errors outside the intercepted
  test interval. These checks do not establish real provider availability.
- OpenAI billing access was blocked by its browser access-check page. Gemini's
  visible key belongs to a Free-tier project, but the deployed key association
  remains unverified. Gemini's Spend page failed with a provider error. No billing,
  spend cap, alert or provider credential was changed.
- A new source-only Strix attempt failed before scanning because Docker Desktop
  could not start its inference-manager socket. Prior successful disposable
  database/container checks remain prior-turn evidence; the current local scan
  is incomplete. CI will rerun database/container regression for this change.

Provider control semantics: [OpenAI spend alerts](https://developers.openai.com/api/docs/guides/terraform/rate-limits-and-spend)
do not enforce a spending cap. [Gemini project spend caps](https://ai.google.dev/gemini-api/docs/billing/)
are managed from AI Studio Spend. Account access and exact production project
association are required before either can be verified or changed.

- Monetary spending caps/alerts and the production Gemini project/key association remain unverified. Existing request quotas are not currency budgets.
- Broad Strix scans previously hit their turn limits. They are incomplete, not clean security verdicts. No new paid or externally uploaded scan was started in this follow-up.
- Tailwind/build-tool dependency advisories still need a compatibility-preserving fix or a tested migration. Production dependency scanning remains a required CI gate.

## 8 October continuation

- PR #11 is merged at 5637c0310440682efa0ffdd0ee0568608d7dbc82. Vercel's
  production alias and both Render services were verified at that commit;
  public health checks passed and anonymous protected routes returned 401.
- Operator approved the database transition. Created the independent SQL runtime
  role, applied grants and verified restrictions on production metadata. Saved
  a free Neon recovery snapshot and configured the existing owner credential in
  GitHub's protected migration environment without disclosing it. The runtime
  password and Render connection change remain pending credential handoff.
- The first protected migration run passed Prisma migration checks but failed
  the grant step because PGDATABASE contained a URL instead of a database name.
  Replaced that step with explicit libpq environment fields; added encoded-password,
  TLS and stale-environment regression checks and actual psql grant coverage in CI.
- OpenAI shows Free tier and zero remaining credit; its active deployed key matches
  the Default project. Gemini's deployed key was compared exactly with AI Studio's
  Gemini Project key (gen-lang-client-0159310057); its project-specific Spend page
  confirms no billing is configured. Both keys passed read-only model-list
  authentication. No credits, payment details, paid plans or subscriptions were added.
  Provider request authentication does not establish successful paid generation,
  and no monetary cap/alert was configured on these free-tier accounts.
- Docker Desktop recovered after both inaccessible runtime socket directories
  were preserved and replaced together; no factory reset or VM/data deletion.
  Strix ran with subscription authentication on a credential-free source snapshot,
  then resumed after its turn limit. Its final report explicitly marks coverage
  incomplete: only source inventory was completed, with no confirmed findings.
  This is not a clean security verdict. Reports remain local under strix_runs.
