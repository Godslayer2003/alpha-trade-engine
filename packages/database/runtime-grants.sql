-- Run as the migration owner, after migrations, with an existing runtime login.
-- psql --set=runtime_role=... --file=packages/database/runtime-grants.sql
-- No password or connection string belongs in this file.
SELECT set_config('alpha.runtime_role', :'runtime_role', false);
DO $$
DECLARE
  runtime_role text := current_setting('alpha.runtime_role');
  migration_owner text := current_user;
  relation record;
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = runtime_role AND rolcanlogin
      AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
      AND NOT rolreplication AND NOT rolbypassrls)
      OR runtime_role = migration_owner
      OR EXISTS (SELECT FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member WHERE r.rolname = runtime_role)
      OR EXISTS (SELECT FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner WHERE r.rolname = runtime_role)
      OR EXISTS (SELECT FROM pg_namespace n JOIN pg_roles r ON r.oid = n.nspowner WHERE r.rolname = runtime_role)
      OR EXISTS (SELECT FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner WHERE r.rolname = runtime_role)
      OR EXISTS (SELECT FROM pg_type t JOIN pg_roles r ON r.oid = t.typowner WHERE r.rolname = runtime_role)
      OR EXISTS (SELECT FROM pg_database d JOIN pg_roles r ON r.oid = d.datdba WHERE r.rolname = runtime_role) THEN
    RAISE EXCEPTION 'Runtime login must have no privileged flags, memberships or ownership';
  END IF;
  -- PUBLIC privileges are inherited by every role. Coordinate these revocations
  -- with other database clients before applying to a shared database.
  EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM %I', current_database(), runtime_role);
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), runtime_role);
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;
  EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', runtime_role);
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', runtime_role);
  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', runtime_role);
  EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', runtime_role);
  FOR relation IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO %I', relation.tablename, runtime_role);
  END LOOP;
  EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', runtime_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', migration_owner, runtime_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', migration_owner, runtime_role);
  -- Reapply after each migration, particularly if the migration table is rebuilt.
  EXECUTE format('REVOKE ALL ON TABLE public._prisma_migrations FROM %I', runtime_role);
END $$;
