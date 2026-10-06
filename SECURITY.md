# Security policy

## Reporting vulnerabilities

Report security issues through [GitHub private vulnerability reporting](https://github.com/Godslayer2003/alpha-trade-engine/security/advisories/new). Do not publish passwords, API keys, personal data or exploit details in public issues. Include affected routes, reproduction steps, impact and a suggested fix.

## Required engineering controls

- Keep credentials in approved deployment environment variables. Never commit secrets, print them in logs or expose them through browser bundles.
- Validate request bodies on the server; bound payload size, identifiers, arrays and AI requests. Never trust browser validation.
- Require database-backed authentication and object ownership for private records. Administrative routes require the ADMIN role and verified MFA.
- Verify webhook signatures and authorization before updating payment access. Apply persistent quotas to costly or sensitive actions.
- Encrypt authenticator secrets; hash passwords and recovery tokens. Revoke sessions after security-sensitive changes.
- Keep cookies HttpOnly, secure in production and protected against cross-origin writes. Private API responses must not be cached.
- Use explicit data export allowlists. Never export password hashes, MFA secrets, session tokens or broker credentials.
- Delete account-owned records through database foreign keys. Test deletion and isolation using disposable fixtures, never real customer accounts.
- Review dependency changes and audit production packages. Run the existing security integration suite and secret scanning before merging.
- Preserve factual privacy disclosures. Do not invent compliance certifications, testimonials, performance claims or retention guarantees.

## Verification

GitHub Actions runs builds, authentication/MFA integration against disposable PostgreSQL, dependency audits and secret scanning. A passing test suite is evidence for the scenarios tested, not a guarantee that every vulnerability has been found.
