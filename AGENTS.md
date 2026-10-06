# Project guidance

At the start of every session, read this file and ARCHITECTURE.md from beginning to end before editing. Keep the architecture document accurate when a service boundary, deployment contract or data flow changes.

Read SECURITY.md before changing authentication, APIs, data storage, payment handling or deployment settings.
Preserve ownership checks, MFA requirements, secret protection and quotas. Add regression coverage for security-sensitive behavior.
Use factual product copy, accessible controls, consistent spacing and responsive layouts. Verify buttons, internal links, success/error feedback and mobile overflow after interface changes.
Keep privacy disclosures consistent with implementation and actual providers. Never invent operator details or treat social-media legal claims as verified law.

Use the shared product styles in globals.css for the site header, workspace panels, spacing and primary controls. Keep a single main navigation and site footer; pages provide their own content heading.
Use plain headings and purpose-specific copy. Reserve green and red for actions and market direction. Avoid decorative gradients, glass surfaces, cursor effects and scroll-reveal animation in the trading workspace.
After a production web build, run `npm run test:web-quality`. CI enforces public routes, metadata, accessible navigation and the 404 response. Check interactive controls and mobile layouts with the installed browser tools; the HTTP checks do not replace visual verification.
