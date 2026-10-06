# Product and security review — 6 October 2026

## Tools actually used

- Ponytail: reuse native navigation/dialog controls and Node HTTP/fetch; remove duplicate chrome, obsolete embedding warm-up and Python runtime dependencies. Keep security validation and meaningful regression checks.
- Context7: queried official Next.js navigation and TypeScript compiler documentation. Web/API retain strict checks and add return/fallthrough checking; the migrated analysis engine also checks unchecked indexing.
- Playwright CLI: exercised Research/Practice/Performance selection, mobile menu, current navigation and sign-in dialog at 320, 390 and 1280 pixels in light and dark themes. Synthetic responses avoid real accounts and paid providers. No horizontal overflow or JavaScript page errors occurred in those checks. An anonymous-session 401 is expected.
- Strix: Docker sandbox and ChatGPT subscription sign-in worked. The full repository review hit its turn limit and is incomplete. A separate bounded review of the migrated analysis service completed with no confirmed exploitable finding. Strix could not execute TypeScript tests in its sandbox; this is not a clean verdict on the entire application.

## Local verification

The web production build and HTTP quality checks passed. API unit and end-to-end suites passed. Analysis calculation fixtures captured from the legacy Python service match the TypeScript implementation. HTTP regression checks cover shared-secret authorization, invalid JSON, input bounds and delayed-quote response shape. Provider fixtures cover fixed origins, fallback, redirect policy, malformed/oversized responses and finite market values.

The migrated Node 24 container built and returned health 200, unauthorized quote 401 and a Yahoo Finance QQQ quote with the configured disposable local secret. The final runtime image contains only the compiled service files and runs as an unprivileged user. Production startup requires its shared secret.

The production dependency audit reports zero known vulnerabilities. A patched shell-quote override resolves the critical development advisory. Remaining development-only audit findings affect build/test tooling, including an unpatched braces advisory; no claim of a clean full dependency audit is made. Review updates rather than applying forced major upgrades without compatibility checks.

## Continuing gates

CI builds, tests disposable database security, verifies public web structure, audits production dependencies and scans for secrets. Browser interactions can be repeated with `playwright-cli -s=alpha-trade-quality run-code --filename scripts/browser-quality.js` after starting the production web build on port 3010. Read ARCHITECTURE.md and SECURITY.md before changing boundaries or controls. Verify the merged commit on GitHub, Vercel and both Render services before claiming publication.

No tool or visual redesign makes future vulnerabilities impossible. The public privacy contact and verified email sender remain unresolved operator configuration items; the administrator email remains private.
