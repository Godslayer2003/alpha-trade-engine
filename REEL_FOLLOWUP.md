# Reel security follow-up

## Verified provider state

The production API connects to the Neon Alpha Trade Engine project and its production branch. The database credential was rotated by the operator and the replacement Render deployment became live. Database migrations run before API startup, so the successful rollout verifies connectivity; the health route alone does not query PostgreSQL.

A metadata-only query on production confirmed that `neondb_owner` has LOGIN, CREATEDB, CREATEROLE and BYPASSRLS and belongs to `neon_superuser`. It is not a PostgreSQL superuser, but it is too privileged for normal API requests. No customer records were queried and no production grants were changed.

OpenAI's signed-in account displayed Free trial with no remaining credits. Render displayed Hobby, no card on file and zero accrued charges. These observations do not establish that monetary caps or notification settings are configured, or that every provider key belongs to those accounts.

## Dependency work

Jest was upgraded to 30.5.2, its type definitions to 30 and ts-jest to 29.4.14. The transformer's published peer dependencies support Jest 30. All 28 API unit tests and nine HTTP tests passed with the new versions.

The full npm audit changed from 32 high and seven moderate package findings to five high and 22 moderate package findings. These counts include affected dependency chains, not 27 distinct application vulnerabilities. Remaining direct advisories involve braces, postcss-selector-parser and sprintf-js. At review time, npm's latest braces and sprintf-js releases were still affected. The selector-parser path requires a separately verified compatibility update. Do not hide advisories or use forced dependency downgrades to obtain a green report.

## Remaining deployment transition

1. Create a dedicated runtime login without CREATEDB, CREATEROLE, BYPASSRLS, privileged memberships or schema ownership. Grant only CONNECT, schema USAGE and the table/sequence operations required by the API. Keep the Prisma migration table outside its write grants.
2. Move production migrations out of API startup to a separate authorized deployment job using the owner credential. Keep that credential out of the long-running API environment. Configure default privileges for tables created by that migration owner.
3. Verify against disposable PostgreSQL that runtime access supports account transactions and quotas while rejecting DDL, role changes and migration-table writes. Then apply the production grants, update the runtime connection and verify deployment.
4. Keep the current deployment unchanged until the new role and migration job are configured. Creating security-sensitive access requires action-time confirmation; entering or changing credentials in browser UI requires operator handoff.

## Unfinished checks

- Monetary spending caps/alerts and the production Gemini project/key association remain unverified. Existing request quotas are not currency budgets.
- Broad Strix scans previously hit their turn limits. They are incomplete, not clean security verdicts. No new paid or externally uploaded scan was started in this follow-up.
- Tailwind/build-tool dependency advisories still need a compatibility-preserving fix or a tested migration. Production dependency scanning remains a required CI gate.
