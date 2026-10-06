# Account security release

## Operator setup

- The owner approved the existing `ethan10038@gmail.com` app account for the `ADMIN` database role. The migration promotes only an account already present at migration time. Public registration defaults to `USER`.
- Sign in, open Settings, confirm the current password, and enroll an authenticator. Save the ten recovery codes before navigating away. Sign in again with a new authenticator code or a recovery code. Administrator routes require both the database role and an MFA-verified server session.
- `MFA_ENCRYPTION_KEY` must be a base64-encoded 32-byte random key in production. Keep it backed up securely and preserve it across JWT key rotations. Changing this key without re-enrolling authenticators prevents decrypting their secrets.
- Account verification and recovery require `RESEND_API_KEY`, `EMAIL_FROM` using a verified sender, and the correct first `WEB_ORIGIN`. The sender remains pending. The API returns a clear configuration error until these are configured; no account email has been sent as part of verification.

## Security behavior

- Sessions expire after 24 hours and are checked in PostgreSQL on every authenticated request. Logout revokes the current session. Password changes, password reset, MFA enrollment, and logout-all revoke all sessions. Legacy tokens without a server session are rejected.
- Authenticator codes cannot be reused. Recovery codes contain 128 random bits, are hashed at rest, and are consumed atomically.
- Email account tokens contain 256 random bits, are hashed at rest, expire after 30 minutes, and are consumed atomically. Tokens travel in URL fragments, are removed from browser history when read, and are never returned by the API. Password recovery preserves MFA.
- Login quotas: 30 attempts per IP and 15 per account per 15-minute fixed window. Registration: 10 per IP per window. These quotas persist across API restarts.
- Chat: 50 requests per account per day. Reports: 50 requests per account per day. A shared daily application ceiling of 500 uncached report/chat generation requests bounds AI abuse. These are request ceilings, not a currency-denominated provider spending limit.
- JSON requests are limited to 100 KB, with a separate 15 MB profile endpoint allowance for existing image uploads. API responses use `Cache-Control: no-store`.

## Delivery and verification

GitHub Actions uses disposable PostgreSQL to apply migrations and check session revocation, authenticator enrollment, recovery-code reuse, concurrent quota consumption, email verification, and concurrent password-reset token consumption. It also runs builds, API/Python tests, runtime dependency audits, and Gitleaks. Master requires `verify`, `secrets`, and `Vercel` checks, including for administrators, and blocks force pushes and deletion.

Local Next.js verification uses `next build --webpack` because local Turbopack compiler processes failed. Vercel and Linux CI use the normal production build. Local Docker was unavailable, so database verification was performed in GitHub's disposable PostgreSQL job.

The dashboard exposes Research, Practice Portfolio, and Performance workspaces, a focused sign-in dialog, and a practical Tools page. Market information is delayed/historical and practice trading uses simulated funds.
