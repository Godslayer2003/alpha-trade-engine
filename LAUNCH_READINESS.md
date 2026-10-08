# Launch readiness record

Evidence recorded 8 October 2026 UTC. The engineering release is verified;
paid launch remains disabled. This record is not a legal opinion, compliance
certification, provider-contract approval or completed penetration test.

## Verified release

[PR #16](https://github.com/Godslayer2003/alpha-trade-engine/pull/16) merged at
`a6d701e882f5cc2b73d9dccb042a9845311c831f` through the ordinary protected path.
It added privacy/support requests with an ADMIN+MFA inbox, withdrawable
Canada/adult AI eligibility, research-only chat context, provider failure
handling, unfinished-MFA invalidation and production commerce safeguards.

| Evidence | Recorded result |
| --- | --- |
| [Required PR CI](https://github.com/Godslayer2003/alpha-trade-engine/actions/runs/37858780817) | 69 unit tests, 15 HTTP tests, owner/restricted PostgreSQL integration, actual production-container checks, builds, web quality, full dependency audit and secret scanning passed. |
| [Merged-master CI](https://github.com/Godslayer2003/alpha-trade-engine/actions/runs/37858997612) | Passed for the exact merged commit. |
| [Protected migration](https://github.com/Godslayer2003/alpha-trade-engine/actions/runs/37859000255) | Exact merged commit approved; `20261008040000_contact_ai_eligibility` and restricted runtime grants applied before API deployment. |
| API deployment | `dep-db42bqp42hec73fgr20g` live at the merged commit. |
| Analysis deployment | `dep-db42b1rl550s73d1lmb0` live at the merged commit. |
| Vercel public alias | `dpl_AsJHQXPU2KFwB9tdnA5tYB5JA2jY` READY at the merged commit. |
| Local browser checks | Dark/light at 320/390/1280px: contact errors/receipt, stored eligibility and withdrawal, report recovery links, payment-return recovery, synthetic seller disclosure, protected inbox, literal HTML escaping and clearing on logout passed. |
| Public browser checks | Contact, privacy, AI access and inbox pages returned 200 at 320/1280px without horizontal overflow; privacy link worked. Screenshots inspected. |
| Fixture-only live acceptance | Restricted DB identity/new table grants, public-proxy origin/cookie/cache boundary, anonymous/non-admin inbox denial, contact persistence, AI declaration/withdrawal, unpaid/checkout denial and unfinished-MFA invalidation passed. Account/contact fixtures were removed and absence checked. |
| Service responses | API/analysis health 200; anonymous proxied session 401. |

The checkout-enabled browser case used synthetic seller details and responses.
No real checkout, payment, email, Telegram message or AI provider request was
performed by this release acceptance. A successful health response alone is
not database-connectivity evidence; the fixture checks supply separate evidence.

The readiness follow-up adds four mocked notification regressions: daily and
workflow failures suppress synthetic private diagnostics and do not count failed
delivery; a healthy channel still succeeds; workflow email text is HTML-escaped.
All eight tests in `notifications.service.spec.ts` passed locally. No runtime
implementation, payment setting or provider account was changed by this follow-up.

## Stopped scanner reconciliation

The final local `strix-launch-source_b4b6` coverage record reports 51 surfaces:
15 no issue found, 26 ruled out, two not applicable and eight requiring follow-up.
It records zero filed findings and 16 gaps. Status is `stopped`, exit reason
`rate_limited`; four agents did not finish cleanly. Some validation branches
were also blocked by model guardrails. The source snapshot predates some fixes.
These counts describe that scan only and are not an independent clean verdict.
Do not bypass guardrails or resume blocked branches to obtain a different verdict.

| Scanner follow-up | Current reconciliation and limit |
| --- | --- |
| Offline dependency assessment | PR #16's full npm audit reported zero findings and required CI passed. Trivy had no cached advisory DB; no completed Trivy result is claimed. |
| Partial Semgrep parsing | Reported spans are JSX prose in MoversWidget and PerformanceDashboard. Manual component review and TypeScript/web build passed; Semgrep's coverage remains incomplete. |
| Public proxy boundary | Live disposable checks verified origin rejection, Secure cookie forwarding, no-store responses and session authentication through the public alias. This does not test every proxy/request variant. |
| Telegram notification diagnostic candidate | Notification/workflow channel failures return fixed messages; mocked regressions inject private diagnostics into both paths. Actual SDK transport behavior was not tested against the provider. |
| Duplicate provider-diagnostic candidate | The same raw notification errors and cron diagnostics were removed; the duplicate scanner entry is not a separate confirmed exploit. |
| Email failure classification | Resolved provider error objects now reject instead of counting as delivery; unit coverage checks failure and timeout cleanup. Actual email delivery remains untested. |
| Stale MFA enrollment | Password change/recovery clear unfinished factors, and enrollment writes compare password snapshots. Unit, disposable PostgreSQL and live password-change checks passed. General logout-all/in-flight scheduling remains under-covered by the stopped scan. |
| Telegram command diagnostics | Portfolio, signal and ask handlers return fixed errors; ask has a synthetic diagnostic regression. Exact external transport errors are not a verified disclosure finding. |

The remaining scanner gaps include unrecorded business-logic/race/semantic risk
classes and unfinished agents. Their absence from filed findings is not evidence
that all behavior is safe. A future authorized assessment needs a fresh tracked
snapshot, approved scope, a functioning sandbox and usable model access.

## Requirements before paid launch

| Requirement | Evidence needed; current boundary |
| --- | --- |
| Authorized seller identity | Actual public legal/seller name and business address approved for publication. Private administrator email is not a substitute. |
| Securities assessment | Qualified assessment of the actual paid signals/recommendations and any registration/exemption requirements. Disclaimers do not establish an exemption. |
| Consumer contract | Reviewed price/currency, supply dates, duration of purchased use, cancellation and refund handling and deliverable contract copy. Current synthetic checkout tests do not establish these. |
| Market-data rights | Permission or licence covering actual automated collection and redistribution. Endpoint availability is not evidence of permission. |
| Provider/account evidence | Applicable provider contracts plus actual configured processing, logs, backups, recovery and deletion settings. Code and plan labels cannot establish contractual acceptance or retention guarantees. |
| Payment acceptance | Authorized Stripe setup and a reviewed end-to-end acceptance process before enabling real purchases. No paid plan, billing or credit purchase is authorized by this record. |
| Operational privacy handling | Operator monitors `/settings/requests` with ADMIN+MFA, responds through an authorized channel, and resolves only after handling. The app does not automatically email request contents or responses. |

Keep new purchases disabled until these requirements are resolved. Preserve
existing entitlements. See CANADA_LEGAL_SECURITY_REVIEW.md for the supporting
source references and limits; do not infer missing operator facts.
