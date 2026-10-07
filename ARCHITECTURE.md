# Architecture state

## Services and trust boundaries

- `apps/web`: Next.js and strict TypeScript. Public UI on Vercel. Browser code contains no provider credentials and makes authenticated requests through the configured API route proxy. UI visibility never grants authorization.
- `apps/api`: NestJS and strict TypeScript on Render. Owns PostgreSQL access through Prisma, authentication, authorization, account data, paper trading, payments and AI provider requests. Validate all requests here, including ownership of records.
- Both service containers run as the unprivileged `node` user. The API image explicitly enables production mode after compilation, so secure cookies and required production secrets cannot depend on an omitted deployment variable.
- `packages/ai-engine`: strict TypeScript internal market analysis service on Render, compiled before deployment and run with Node.js native HTTP/fetch APIs. Supplies candles, delayed quotes, rules-based signals and text chunks. It has no customer database access. Protect its non-health endpoints with `AI_ENGINE_SHARED_SECRET`; fetch market data only from fixed Yahoo Finance and Binance endpoints.
- `packages/shared-types`: cross-service TypeScript contracts. Types supplement runtime validation; they do not validate untrusted HTTP responses.
- `packages/database`: Prisma schema and migrations. Apply migrations through the API deployment. Account-owned data uses foreign-key deletion rules.

The database privilege transition is staged, not active: the API Dockerfile has
separate `migration` and `runtime` targets, while its default `legacy` target
preserves startup migrations. A manual master-only GitHub migration workflow is
prepared for a protected environment that will hold the owner credential; the runtime
target starts only the API with a restricted connection. No production role,
secret or service setting has been changed by this preparation. See
DATABASE_PRIVILEGES.md for activation, shared PUBLIC grant effects and rollback.
That environment is configured with operator review and master-only deployment;
it contains no credentials yet. Render supports a Docker Command override for
starting the API without migrations during the restricted-role transition.
Payment verification also requires the expected one-time USD 5 amount/currency
and payment mode before granting access; checkout identifiers are bounded.

## Security invariants

Read SECURITY.md in full before changing security-sensitive code. Database-backed sessions identify callers; private records require ownership. Administrative operations require the ADMIN role and verified MFA. Preserve encrypted MFA secrets, single-use recovery, expiring hashed tokens, session revocation, persistent quotas, origin checks and non-cacheable private responses. Payment access is confirmed by retrieving the caller's Stripe checkout session on the server; any future webhook must verify its signature.

OpenAI and Gemini calls originate in the API. Secrets belong in approved service environment variables. Never send them to the web bundle, source control, diagnostics or exports. Account export uses an explicit safe field list. Security integration tests use disposable data.

The application supports simulated trading. Market quotes are delayed source closes, not guaranteed executable prices. The current payment flow is a one-time payment; do not invent subscriptions or renewal disclosures. Keep privacy statements consistent with actual processing and retention. No public privacy contact has been authorized; do not publish the administrator's email.

## Product structure

The root layout owns the shared navigation, sign-in controls and footer. Each page owns one content heading. The market workspace has Research, Practice and Performance views. Reuse shared spacing, panels, controls and focus styles in globals.css. Preserve keyboard access, clear loading/error/success states and usable mobile layouts.

## Build and release

The web app and API use strict TypeScript. Production builds must pass compiler checks. Do not weaken compiler options or bypass runtime validation to silence errors. Update service contracts and their callers together.

GitHub master is the production source for Vercel and the two Render services. Use a codex/ branch, reviewable PR and required checks before merging. Preserve deployment secrets and keep a rollback commit. Verify the public production alias and both service deployments against the merged commit.

## Verification boundaries

CI builds the services, runs API unit/end-to-end tests and disposable PostgreSQL security integration, audits dependencies and scans all fetched Git history for secrets with a pinned, checksum-verified Gitleaks binary. `npm run test:web-quality` checks route responses, page headings, metadata, shared navigation, links, favicon and the custom 404. Browser checks must additionally cover interaction, console errors and mobile overflow. Analysis-service migrations require calculation parity fixtures and HTTP authorization/input-validation regression tests.

Use Ponytail to keep changes small, Context7 for current library documentation, Playwright CLI for browser checks and Strix for bounded security scanning when its model access and Docker sandbox are available. A tool being installed is not evidence that a scan ran. Record verification limits and unresolved findings honestly.
