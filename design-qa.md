# Exponential visual adaptation — design QA

Source: https://www.goexponential.org/ (captured 6 October 2026).
Scope: adopt the existing site's visual language in the working community directory, rather than reproduce its marketing content or navigation.

## Evidence

- Source visual truth: `/Users/andressantos/Documents/Codex/2026-10-06/new-chat/work/exponential-reference.png`.
- Implementation: `/Users/andressantos/Documents/Codex/2026-10-06/new-chat/work/exponential-directory-style.png`.
- Desktop: both captures are 1280 × 720 pixels, 1280 × 720 CSS viewport, 1× density; no normalization required. Both show the unauthenticated initial screen.
- Source and final implementation were opened together in the same image-comparison input. Full-view comparison covers the header, hero, access CTA and pastel label blocks. These details are readable at the captured resolution, so a separate crop was unnecessary.
- Mobile usability evidence: `/Users/andressantos/Documents/Codex/2026-10-06/new-chat/work/exponential-directory-mobile.png`, 390 × 844 pixels / CSS viewport, 1× density. No horizontal overflow: `document.documentElement.scrollWidth === innerWidth === 390`. This checks the adapted directory layout; it is not a pixel comparison against the original marketing homepage on mobile.
- Authenticated profile evidence: `/Users/andressantos/Documents/Codex/2026-10-06/new-chat/work/exponential-directory-profile.png`.

## Required fidelity surfaces

- Typography: Geist for body/navigation, Geist Mono 300 for the main heading, matching the source. Clear hierarchy and natural wrapping in desktop and mobile captures.
- Spacing/layout: centered hero, 1024px page frame, outlined floating navigation, thin rectangular cards. The access form uses two columns on desktop and one on mobile. This is an intentional adaptation to the directory's task.
- Colors/tokens: black canvas, white/gray copy, white CTA, green/blue/purple text highlights. Focus indicators, errors and input borders remain legible.
- Assets: the source's actual `/logos/tef.svg` is included locally, rendered in white like the source. No generated or approximate logo. Standard account/control icons use Lucide.
- Copy/content: Spanish directory-specific copy retained, with phone access, optional manual X linking and publication consent. No marketing testimonials, company logos or unrelated source content were introduced.

## Comparison history

1. [P2] The first vertical access card pushed its privacy note below the initial desktop viewport. Fixed by grouping its explanatory content and form into two columns. The revised 1280 × 720 capture shows the full form, primary CTA and privacy note together.
2. [P2] On the first mobile pass, the phone label sat too close to the preceding privacy note. Added 24px separation before the mobile form. The final 390 × 844 capture shows a clear gap and a visible primary CTA.
3. Final comparison: no actionable P0/P1/P2 findings. The longer directory flow intentionally puts the explanatory cards below the main form rather than occupying the source homepage's exact vertical positions.

## Interaction verification

In a real browser against the development backend: admitted a fictitious allowlisted number, linked `@demo_member`, confirmed it remained hidden, published it with the consent checkbox, confirmed the directory entry, and signed out. Development test membership removed afterward. Production membership list is untouched.

Console checked: one expected access-denied error from the initially stale development session was handled by the existing error boundary. No new rendering/asset errors appeared during the clean access/profile flow. Typecheck, lint and production build pass.

## Follow-up polish

No blocking visual issues remain. The source's animated marketing logo carousel is intentionally omitted because this directory only presents members' X accounts.

final result: passed
