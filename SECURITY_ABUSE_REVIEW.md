# Security abuse review

## Scope and fixes

This pass applies the supplied reels' advice to authentication, record ownership, persistent limits, secret history and repeatable checks. It is a targeted review, not a whole-system penetration-test completion claim.

Confirmed gap: an authenticated MFA-enabled account could change its password using only its current password. Password changes now require a fresh authenticator/recovery code, check account security again inside a serializable transaction, revoke sessions and invalidate outstanding reset links. The endpoint also has a persistent per-user quota. The password form supplies the code and displays server errors.

## Evidence

- Gitleaks 8.30.1 scanned all fetched refs/history (88 commits at the initial scan), with full redaction: no matches. Only `.env.example` is tracked. This does not detect every possible secret or establish historical key validity.
- CI now downloads a pinned Gitleaks binary, verifies its release checksum and scans all fetched Git history on every PR/master build. A failing scan remains a required merge gate.
- The Render Blueprint now declares the required MFA encryption key as an operator-supplied secret. Existing encryption keys must be preserved; this change does not generate or rotate them. Stale admin/payment comments were corrected.
- HTTP regression tests use actual Nest routes, validation and JWT/admin guards with synthetic storage: forged signatures, foreign sessions, cross-account writes and claimed admin privileges are denied. Login identity normalization and HTTP throttling are checked.
- Disposable PostgreSQL integration checks concurrent single-use recovery codes, shared quota enforcement across service instances, reset-link invalidation, session revocation, strategy ownership and unrelated-account preservation.
- API build and 28 unit tests passed. Web production build, public-route quality checks and production dependency audit passed (zero reported vulnerabilities).
- Playwright checked password-code submission, error feedback and success redirection in dark/light mode at 320, 390 and 1280 pixels using intercepted responses. No page exceptions or horizontal overflow. Desktop/mobile screenshots were inspected. No real account or provider calls were used for these checks.
- Context7 was consulted for the existing runtime validator's optional/string-length behavior; no validator dependency was added.
- Strix ran a bounded local authentication-source review using its Docker sandbox and the previously authorized ChatGPT sign-in. It hit its 12-turn limit and failed to complete. Zero recorded findings from that incomplete run is not a clean verdict. Runtime and database regression results above are separate evidence.

## Remaining limits

Follow-up container hardening: the API image explicitly sets production mode and runs as the unprivileged `node` user. Local disposable-container checks verified migrations/startup, non-root execution, read-only application code, secure HttpOnly cookies, no bearer token in registration responses, anonymous admin denial and fail-closed AI chat without payment configuration. CI now builds and checks the actual API image before merging. The Render Blueprint declares production mode explicitly as well.

Production database privileges and provider billing caps/alerts have not been independently verified in their provider accounts. Existing AI request quotas limit request counts, not total monetary spending. No provider spending cap or notification setting was changed. Private uploads and credentials were not sent to a new external scanning service. Broader security testing remains necessary; these controls do not make the app hack-proof.

Guidance: [OWASP MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html), [OWASP authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [Gitleaks](https://github.com/gitleaks/gitleaks).
