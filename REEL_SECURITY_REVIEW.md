# Security reel review

Reviewed the supplied 39-second and 88-second recordings locally: full audio transcripts and visual samples every second, including the end cards. Original media and transcription artifacts remain in the ignored `.security-scan/reels` directory.

## Advice and application

The first recording advertises a separate 30-item checklist. That complete checklist is absent from the recording. Visible advice covers server-side secrets, Git history, database privilege, record ownership, rate limits, provider spending limits and maintained dependencies.

The second recording supplies five prompts: rate-limit endpoints, scan hardcoded credentials, move credentials into environment variables, validate inputs and perform a security audit.

- Existing API authentication throttles and persistent account/IP quotas address repeated attempts. Five attempts per 15 minutes is an example policy, not a universal security guarantee.
- Provider credentials belong on servers. Moving an exposed credential does not revoke it: confirmed exposures require rotation and a history review. This review did not perform a new full-history credential scan.
- The browser talks to the API, never directly to PostgreSQL. Database public-key and row-level-security recipes must be adapted to this architecture; they cannot replace the existing server ownership checks. PostgreSQL table owners and privileged roles can bypass row security.
- New limits reject oversized profile text, strategy names/notes/ticker lists and administrator AI configuration before persistence. Existing image validation, ownership checks, MFA and quotas are preserved. Regression tests exercise the Nest validation pipeline, malformed values, Unicode and stripping of client-supplied privilege fields.
- Provider billing caps and alerts require checking the actual provider accounts. This review does not claim those are configured.

## Limits

This is a targeted review of the recordings and relevant code paths, not a completed whole-system penetration test. No application is guaranteed hack-proof. Source assertions alone do not establish production behavior; build, tests, deployment and production verification must be recorded separately.

References: [OWASP input validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html), [OWASP authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
