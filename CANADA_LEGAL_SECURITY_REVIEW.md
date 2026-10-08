# British Columbia legal/privacy and reel security review

Reviewed 8 October 2026. The operator confirmed British Columbia, Canada.
This is an implementation review and an operator readiness record, not a legal
opinion, compliance certification or completed penetration test.

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
| Maintained dependencies | Production audit clean at the prior release; five development braces-chain findings remain unresolved. Recheck in CI. |
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

1. Supply an authorized public operator/business identity and dedicated privacy
   and support contact. Never substitute the private administrator email. BC
   accountability/contact requirements and requests outside self-service controls
   remain unresolved until these details and a responsible privacy person are set.
2. Confirm served countries and audience ages. Review provider audience/region
   restrictions and the collection/consent needed to enforce them. Do not describe
   unrestricted public Gemini access as provider-term compliance.
3. Obtain an assessment of securities registration/exemptions for the actual paid
   guidance and recommendations. Avoid claims of licensed advice, guaranteed
   performance or established exemption without evidence.
4. Finalize seller information, supply dates, payment access duration, support,
   refund/cancellation handling and a deliverable contract copy under applicable
   consumer rules. No blanket non-refund statement overrides statutory rights.
5. Review provider contracts, processing regions, logs, backups, deletion timelines,
   account-data minimization and permitted market-data use/redistribution. A free
   feed or an API key is not proof of a commercial data licence.
6. Review retention for information used to make decisions directly affecting an
   individual: BC PIPA section 35 may require at least one year. Current feedback
   cleanup is thirty days; do not repurpose it as an access/adverse-decision record
   without changing retention and disclosures after review.
7. Finish broader security coverage and resolve remaining development advisories.
   AI generation and a real paid checkout still lack full live acceptance evidence.

## Incident response

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
