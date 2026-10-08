# British Columbia legal/privacy and reel security review

Reviewed 8 October 2026. The operator confirmed British Columbia, Canada.
This is an implementation review and an operator readiness record, not a legal
opinion, compliance certification or completed penetration test.

Engineering release evidence and outstanding launch requirements are tracked
in LAUNCH_READINESS.md. Its dated evidence does not replace the external
assessments below.

## Evidence and changes

Both saved full-audio transcripts and all twelve contact sheets of one-second
visual samples were reviewed locally, including end cards. The first reel shows
part of a security checklist; its advertised complete 30-item document is absent.
The second covers rate limits, secret scanning, server credentials, bounded
inputs and security review. Neither supplies Canadian legal guidance.

| Reel guidance | Current implementation or limit |
| --- | --- |
| Server secrets and Git history | Server provider credentials; redacted full-history Gitleaks in required CI; exposed owner credential previously rotated. |
| Database privileges | Restricted runtime role; protected owner migration job; actual denied privileges and disposable account behavior verified. |
| Ownership and authentication | Database-backed sessions, MFA, record ownership checks; Telegram now rejects group account commands and notifications. |
| Rate limits and input validation | Persistent API/account quotas; Telegram link issuance/redemption limits, bounded code format and existing AI limits. |
| Credential protection | Telegram link codes stored as hashes, ten-minute expiry and atomic single-use redemption; user-owned disconnect removes the link. |
| Maintained dependencies | Tailwind 4/PostCSS migration removes the unpatched braces chain. Current full audit has zero findings; CI now checks development and production dependencies. |
| Provider spending and audits | Exact provider associations/free-tier state verified earlier; no monetary caps configured; Strix coverage remains incomplete. |

Privacy copy identifies Neon, outside-Canada processing risk and Gemini's unpaid
content-use/human-review terms. AI Guide no longer automatically sends account
identity or portfolio balances. Signup and AI use show privacy information at the
point of use. Feedback storage and administrator review are disclosed. Terms
separate simulated orders from the real US$5 access payment and do not claim an
unverified exemption from securities regulation. Statutory rights are preserved.

## Canadian sources and application

- [BC PIPA](https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/03063_01),
  particularly accountability/contact information, appropriate purposes, consent,
  safeguards, access/correction and retention. The operator's BC location makes
  provincial private-sector privacy review relevant; factual policy updates alone
  do not establish compliance.
- [OPC provincial/federal applicability](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/r_o_p/prov-pipeda/):
  assess PIPEDA for commercial interprovincial/international information flows.
- [Meaningful consent](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/collecting-personal-information-and-consent/consent/gl_omc_201805/)
  and [cross-border processing](https://www.priv.gc.ca/en/privacy-topics/airports-and-borders/gl_dab_090127/):
  disclose information, purposes, providers and material risks before optional use.
- [CSA finfluencer guidance](https://www.securities-administrators.ca/investor-tools/finfluencers/)
  and [BCSC registration](https://www.bcsc.bc.ca/industry/registrant-regulation/registration-basics):
  review paid signals, style/risk-based recommendations and AI outputs on their
  actual behavior; a disclaimer does not decide registration or exemption.
- [Consumer Protection BC distance contracts](https://www.consumerprotectionbc.ca/selling-online-contract-rules-for-businesses/):
  review seller disclosures, price/currency, delivery, cancellation and contract
  copy requirements before treating online sales as ready.
- [Gemini API terms](https://ai.google.dev/gemini-api/terms): the current unpaid
  service permits product improvement and human review; it restricts personal
  information, age/audience and supported regions, including paid-service-only
  availability for EEA, Switzerland and UK users. Do not activate billing without
  authorization. [OpenAI API controls](https://developers.openai.com/api/docs/guides/your-data)
  are separate; response storage off does not establish zero retention.

## Unresolved operator and legal decisions

1. The public privacy/support form now reaches an MFA-protected private inbox.
   The confirmed site operator handles privacy requests; private admin email is
   not exposed. Monitor the inbox and handle requests under applicable deadlines.
   An authorized seller/legal name and business address still cannot be inferred.
2. AI currently requires an authenticated adult/Canada declaration, with known
   minors denied across web chat, reports and Telegram. The declaration can be
   withdrawn, is exported and is removed on account deletion. It is not verified
   geolocation or age verification. Assess any expanded audience before enabling
   other countries; public market/practice access is separate from AI access.
3. Obtain an assessment of securities registration/exemptions for the actual paid
   guidance and recommendations. Avoid claims of licensed advice, guaranteed
   performance or established exemption without evidence.
4. New production purchases are gated on Stripe, COMMERCE_ENABLED and authorized
   PUBLIC_SELLER_NAME/PUBLIC_SELLER_ADDRESS. Existing entitlements are preserved.
   Do not enable the gate merely because those strings are present. Finalize seller
   information, supply dates, payment access duration, support,
   refund/cancellation handling and a deliverable contract copy under applicable
   consumer rules. No blanket non-refund statement overrides statutory rights.
5. Review provider contracts, processing regions, logs, backups, deletion timelines,
   account-data minimization and permitted market-data use/redistribution. A free
   feed or an API key is not proof of a commercial data licence.
6. Review retention for information used to make decisions directly affecting an
   individual: BC PIPA section 35 may require at least one year. Current feedback
   cleanup is thirty days; do not repurpose it as an access/adverse-decision record
   without changing retention and disclosures after review.
7. Full dependency audit is now clean. Targeted security regression and source
   review cover the new routes; the local Strix scan uses a disposable tracked-source
   snapshot, no production credentials/calls. Record its actual final coverage and
   any blocked branches rather than treating zero findings as certification.
   Real paid checkout remains unavailable without authorized Stripe/seller setup.

## Provider and retention assessment

| Processing | Verified implementation/account evidence | Contract or retention boundary |
| --- | --- | --- |
| API and analysis hosting | Render API reports Oregon, USA, Free service compute. No customer DB in analysis service. | [Render regions](https://render.com/docs/regions); [log retention](https://render.com/docs/logging) depends on workspace plan, not just compute. No paid upgrade or log export was enabled. |
| Customer database | Restricted production connection identifies AWS us-east-2 (Ohio, USA). Previous free recovery snapshot was retained before credential transition. | [Neon DPA](https://neon.com/pdf/DPA.pdf); [restore-history guidance](https://neon.com/blog/practical-guide-to-database-branching). Exact configured recovery history and contractual acceptance require provider-console evidence; no guarantee of immediate backup erasure. |
| Web hosting | Vercel serves the public alias and proxies authenticated API requests. Provider credentials remain server-only. | [Runtime log retention](https://vercel.com/docs/logs/runtime) depends on team plan/add-ons. No claim that CDN/request metadata stays in Canada. |
| AI providers | Unpaid Gemini association and zero OpenAI credits verified earlier; bounded account/global quotas remain. Messages are not persisted except optional feedback. | Gemini/OpenAI sources above. No paid billing activation, credit purchase or asserted monetary cap. Personal/confidential information is prohibited in Gemini prompts. |
| Feedback/contact requests | Feedback is optional evaluation material, purged after 30 days. Open contact requests are preserved; resolved requests purged after one year. | Do not use short-lived feedback as an adverse-decision record. Preserve any separately required incident/legal record outside normal cleanup. |
| Market sources | Fixed Yahoo Finance/Binance hosts, bounded symbols, no provider credentials in client code. | [Yahoo terms](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html) restrict automated collection without permission; [developer guidelines](https://legal.yahoo.com/us/en/yahoo/guidelines/ydn/index.html) vary by API. Current endpoint availability is not a redistribution licence. Obtain permission or a licensed source before commercial launch. Binance's applicable use/redistribution rights also require confirmation. |

OpenAI response handling now reads the actual REST output blocks; Gemini requests
have a timeout. Email error responses are rejected instead of counted as delivery;
notification errors/logs no longer repeat raw provider diagnostics or account IDs.
These changes do not establish provider contractual acceptance or financial licensing.

## Incident response

The stopped source-only Strix run is not a completed penetration test. Its
notification/email error candidates are addressed by sanitized delivery failures
and provider-error checks. Telegram command diagnostics are also sanitized;
unfinished MFA enrollment is cleared on password change/recovery, with snapshot
conditions and regression coverage. Dependency assessment uses npm audit because
the scanner had no offline advisory database. Partial Semgrep parsing and actual
provider transport behavior remain limits; no clean-scan guarantee is made.

The operator coordinates response. Contain the affected route/service, revoke
compromised access and preserve minimally necessary evidence in restricted storage
outside Git. Do not copy customer rows, credentials or full prompts into issues,
CI logs or public reports. Record discovery, affected information, exposure window,
containment, risk assessment and decisions about notification.

Use [OIPC BC private-sector breach resources](https://www.oipc.bc.ca/for-private-organizations/)
to determine BC response. If PIPEDA applies, assess reporting/notification for real
risk of significant harm and keep required breach records; [OPC guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/privacy-breaches-at-your-business/bir_201920_001/)
states every applicable breach must be recorded and records kept for 24 months.
Do not assume one regulator's process satisfies another jurisdiction. Test recovery
and verify permissions/health before reopening; schema rollback needs separate
compatibility review. No incident notifications were sent by this review.
