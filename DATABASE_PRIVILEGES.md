# Staged database privilege separation

The live Blueprint and default Docker target still use the existing startup
migration contract. The `runtime` and `migration` targets are staged for an
authorized transition; merging this preparation does not restrict production.

## 8 October production preparation

Operator approval was received. SQL-created `alpha_runtime_ate` has LOGIN and
all privileged flags disabled, no memberships and no ownership. The committed
grant transaction was applied as `neondb_owner`. Metadata checks confirmed
CONNECT, application grants on 17 tables, and no database/schema CREATE,
TEMPORARY, migration-table SELECT or User TRUNCATE privilege. Current connections
used only the owner role. A free manual Neon snapshot was created at
2026-10-08 00:49:53 UTC and shows no expiry. The previous PUBLIC database grant
included CONNECT/TEMPORARY; public schema had USAGE and no PUBLIC table grants.

The role has no password. GitHub's migration environment now has the existing
owner connection secret, verified against Neon without displaying credentials.
Render still uses the owner connection and startup migrations. Do not
activate the runtime command until credential entry, the protected migration
job and authenticated disposable-account verification are complete. SQL-created
roles do not appear in the provider-managed Neon Roles list; do not create a
second privileged provider role to work around that UI limitation.

## Migration job

`.github/workflows/database-migrations.yml` is a manual master-only job with a
concurrency lock. Before any production run, configure the protected
`production-database-migrations` environment, required operator approval and its
`MIGRATION_DATABASE_URL` secret and `RUNTIME_DATABASE_ROLE` variable. The environment
has been created with operator review, admin bypass disabled and master-only
deployment policy; its role variable is `alpha_runtime_ate`. Its owner secret is configured.
The job exposes
that secret only to the Prisma migration and runtime-grant steps. Do not copy it
to the API, web or AI environments. Test the grants against a disposable database
and inspect production ACLs before authorizing this workflow; it reapplies grants
after each migration.

The first authorized run applied migration checks successfully but its psql step
fell back to a local socket: an entire URL in PGDATABASE does not select its host.
`scripts/database-grants.cjs` now passes parsed libpq connection fields through
the child environment, preserves TLS/channel binding, removes stale PG overrides
and keeps secrets out of process arguments. CI exercises the actual psql command
against disposable PostgreSQL before checking the restricted login.

Alternatively build `apps/api/Dockerfile` with `--target migration` and supply the
owner `DATABASE_URL` only to an authorized ephemeral job. Do not provision a paid
Render service or cron job for this transition. No provider job, secret, role or
billing setting is configured by these repository files.

## Runtime grants

After action-time operator confirmation, create an independent LOGIN with no
SUPERUSER, CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS, role memberships or object
ownership. Create it through SQL, not Neon's Add role / CLI / API flow: provider
managed roles receive privileged neon_superuser membership. The operator sets its
password through a private password prompt, never in chat or saved SQL history.
The agent must not enter or submit the new credential.
Apply `packages/database/runtime-grants.sql` as the same owner that runs migrations
with psql's `runtime_role` variable. Use a secure connection mechanism, never a
credential in a command argument or printed output. Stop on SQL errors.

The script grants CONNECT, public schema USAGE, table SELECT/INSERT/UPDATE/DELETE
and sequence USAGE/SELECT. It excludes all access to `_prisma_migrations`, rejects
privileged roles and sets defaults for future owner-created tables/sequences.
Reapply after migrations so a recreated migration table does not retain grants.
Future schemas, functions and owner roles require a separate privilege review.
PostgreSQL enums retain their normal public type usage. Ownership enforcement
remains in API code; this role does not add row-level security policies.

Revoking public schema CREATE and database TEMPORARY affects other clients of the
same database. Inventory those clients and capture existing grants before the
authorized change. Also inspect database/schema/table ACLs and PUBLIC grants:
this script cannot remove privileges inherited through custom grants on other
schemas or publicly accessible routines. Do not use it as an assurance of all
production permissions without that inspection.

## Rollout and rollback

1. Pass CI and review the exact master commit. Save the existing service settings,
   database grants and a database recovery point without exporting secrets.
2. After action-time confirmation, create/verify `alpha_runtime_ate` through SQL and
   operator credential entry, and enter the owner connection into the protected
   migration environment.
   Keep the existing API connection in place during preparation.
3. Run the protected migration job for that exact commit before API rollout; it
   applies migrations and grants to the existing runtime role. Review schema
   compatibility and the resulting grants; do not automatically reverse migrations.
4. Disable automatic API deployment before activating this contract. Future API
   releases must run the approved migration job first, then manually deploy the
   exact reviewed master commit. On activation, update the Blueprint with
   `autoDeploy: false` and the Docker Command so a later sync preserves the contract.
   Set Render's Docker Command to `node apps/api/dist/main.js`. This supported
   command override starts the API without the legacy startup migrations; the
   dedicated `runtime` target remains available for local/CI image checks.
   Replace API DATABASE_URL with the
   restricted login through operator credential entry. Remove owner credentials
   from the long-running API environment. Keep the migration credential solely
   in the protected job environment. Update the Blueprint to this final contract
   only when production settings have been tested.
5. Verify deployed commit, startup, authenticated sessions, MFA, ownership,
   transaction/quota behavior and denied privileged operations. Health alone does
   not demonstrate database connectivity. Use disposable test accounts.
6. If runtime access fails, pause rollout. Restore reviewed service configuration
   and captured grants through the operator; keep the migration job paused while
   diagnosing. Do not delete customer data or attempt an automatic schema rollback.

## Local regression

Current production metadata review found only the `public` application schema,
no publicly granted tables and no public security-definer functions. PUBLIC has
schema USAGE and database CONNECT/TEMPORARY; the owner role also has REPLICATION,
CREATEDB, CREATEROLE and BYPASSRLS. No customer rows or credentials were read.
Provider reference: https://render.com/docs/docker#docker-command

Apply committed Prisma migrations to disposable local PostgreSQL, build the API,
then run `node scripts/database-privileges.cjs` with its local owner DATABASE_URL.
The test creates and removes a disposable runtime login, checks denied DDL,
temporary tables, role changes, TRUNCATE and migration-table access, checks default
table/sequence grants, and runs the existing account/MFA/ownership/quota integration
under the restricted connection. CI runs this after the owner integration suite.
