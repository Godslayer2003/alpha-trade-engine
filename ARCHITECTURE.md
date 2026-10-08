# Architecture state

## Services and trust boundaries

- `apps/web`: Next.js and strict TypeScript. Public UI on Vercel. Browser code contains no provider credentials and makes authenticated requests through the configured API route proxy. UI visibility never grants authorization.
- `apps/api`: NestJS and strict TypeScript on Render. Owns PostgreSQL access through Prisma, authentication, authorization, account data, paper trading, payments and AI provider requests. Validate all requests here, including ownership of records.
- Both service containers run as the unprivileged `node` user. The API image explicitly enables production mode after compilation, so secure cookies and required production secrets cannot depend on an omitted deployment variable.
- `packages/ai-engine`: strict TypeScript internal market analysis service on Render, compiled before deployment and run with Node.js native HTTP/fetch APIs. Supplies candles, delayed quotes, rules-based signals and text chunks. It has no customer database access. Protect its non-health endpoints with `AI_ENGINE_SHARED_SECRET`; fetch market data only from fixed Yahoo Finance and Binance endpoints.
- `packages/shared-types`: cross-service TypeScript contracts. Types supplement runtime validation; they do not validate untrusted HTTP responses.
- `packages/database`: Prisma schema and migrations. Apply migrations through the protected GitHub owner job before each manual API release. Account-owned data uses foreign-key deletion rules.

The database credential transition is active: the API Dockerfile has
separate `migration` and `runtime` targets, while its default `legacy` target
preserves startup migrations. A manual master-only GitHub migration workflow is
configured for a protected environment holding the owner credential; the runtime
target starts only the API with a restricted connection. On 8 October, the
authorized production role `alpha_runtime_ate` and application grants were
created and verified, with a free Neon recovery snapshot retained. The role has
an independently generated password; the API uses its restricted connection.
The initial restricted-runtime release was Render deployment
`dep-db3f5h32blpc73bsbsng` at `aafff29c8752d581957994702043785c8c47d9b2`.
Disposable production checks passed
for registration, sessions, MFA, ownership isolation, safe export, revocation
and deletion, with restricted database identity and atomic quota writes verified.
The existing owner credential is now in the protected GitHub migration job;
Render now has automatic API deployment disabled and a runtime-only Docker
Command; the Blueprint preserves that contract. See
DATABASE_PRIVILEGES.md for activation, shared PUBLIC grant effects and rollback.
That environment is configured with operator review and master-only deployment;
its owner secret is configured. Render supports a Docker Command override for
starting the API without migrations during the restricted-role transition.
Payment verification also requires the expected one-time USD 5 amount/currency
and payment mode before granting access; checkout identifiers are bounded.

## Security invariants

Read SECURITY.md in full before changing security-sensitive code. Database-backed sessions identify callers; private records require ownership. Administrative operations require the ADMIN role and verified MFA. Preserve encrypted MFA secrets, single-use recovery, expiring hashed tokens, session revocation, persistent quotas, origin checks and non-cacheable private responses. Payment access is confirmed by retrieving the caller's Stripe checkout session on the server; any future webhook must verify its signature.

OpenAI and Gemini calls originate in the API. Secrets belong in approved service environment variables. Never send them to the web bundle, source control, diagnostics or exports. Account export uses an explicit safe field list. Security integration tests use disposable data.

Telegram's linked, paid `/ask` path consumes the same daily account and global
AI quota buckets as web chat before calling a provider. Questions are bounded
to 4,000 characters; the Telegram chat identity never replaces the linked user ID.
Account commands, linking and proactive notifications require private Telegram
chats. Link tokens are stored as hashes, expire after ten minutes and are consumed
through an atomic conditional update. The nullable expiry migration invalidates
legacy outstanding tokens; existing private links remain usable and group links
must be replaced. AI Guide sends user messages and selected research context;
it no longer automatically attaches account identity or portfolio balances.

The application supports simulated trading. Market quotes are delayed source closes, not guaranteed executable prices. The payment flow is one-time; do not invent subscriptions or renewal disclosures. New production checkout requires Stripe, COMMERCE_ENABLED=true and authorized PUBLIC_SELLER_NAME/PUBLIC_SELLER_ADDRESS. Keep checkout paused until seller disclosures, contract delivery and cancellation handling are reviewed. Existing account entitlements remain usable without Stripe configuration. The public privacy/support form reaches a private MFA-protected operator inbox; never publish the administrator's email.

AI access currently uses a conservative Canada/adults-only policy. Authenticated
accounts record a country declaration and adult-confirmation timestamp; web chat,
reports and Telegram check them before provider work. A known profile age below
18 blocks access. This is self-declaration, not verified age/geolocation. Users can
withdraw the declaration; export includes it and account deletion removes it.
Server chat context allows only bounded symbol, asset class and timeframe fields.
OpenAI REST responses are read from message output blocks, response storage is off,
and provider requests have timeouts. No provider monetary-cap guarantee is made.

Contact requests store only reply email, category, message and timestamps in Neon.
Public submission is bounded by durable per-IP and global quotas; only current
ADMIN sessions verified with MFA can list or resolve requests. No request content
is emailed automatically. The operator must respond through an authorized channel
before resolving. Open requests are preserved; resolved requests are purged after
one year, separately from account deletion. Incident records use the separate
restricted process described in CANADA_LEGAL_SECURITY_REVIEW.md.

## Product structure

When checkout is configured, authenticated payment status supplies the authorized
public seller name/address for display beside the price and Terms before checkout.
Payment returns refresh stored entitlement and checkout availability. Report
eligibility errors link to the declaration, whose page loads the saved state.

Password changes and recovery clear unfinished MFA enrollment while preserving
enabled factors. Enrollment writes compare the password snapshot to reject
concurrent password changes. Telegram command failures return fixed messages
instead of database or provider diagnostics.

The root layout owns the shared navigation, sign-in controls and footer. Each page owns one content heading. The market workspace has Research, Practice and Performance views. Reuse shared spacing, panels, controls and focus styles in globals.css. Preserve keyboard access, clear loading/error/success states and usable mobile layouts.

## Build and release

The web app and API use strict TypeScript. Production builds must pass compiler checks. Do not weaken compiler options or bypass runtime validation to silence errors. Update service contracts and their callers together.

GitHub master is the production source for Vercel and the two Render services.
Vercel and the AI engine deploy automatically; API releases require the protected
migration job followed by a manual deployment of the exact reviewed commit.
Use a codex/ branch, reviewable PR and required checks before merging. Preserve
deployment secrets and keep a rollback commit. Verify the public production
alias and both service deployments against the merged commit.

## Verification boundaries

See LAUNCH_READINESS.md for the verified 8 October release, reconciled scanner
coverage and evidence still required before enabling commerce. Release entries
are dated observations, not a claim that provider/account state cannot change.

CI builds the services, runs API unit/end-to-end tests and disposable PostgreSQL security integration, audits dependencies and scans all fetched Git history for secrets with a pinned, checksum-verified Gitleaks binary. `npm run test:web-quality` checks route responses, page headings, metadata, shared navigation, links, favicon and the custom 404. Browser checks must additionally cover interaction, console errors and mobile overflow. Analysis-service migrations require calculation parity fixtures and HTTP authorization/input-validation regression tests.

Use Ponytail to keep changes small, Context7 for current library documentation, Playwright CLI for browser checks and Strix for bounded security scanning when its model access and Docker sandbox are available. A tool being installed is not evidence that a scan ran. Record verification limits and unresolved findings honestly.
