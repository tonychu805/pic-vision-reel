# PicVision player experience

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing Next.js App Router application with React, TypeScript, and Tailwind CSS. Deployment previews use Netlify. This review preserves the application and its existing backend contracts.

## Users

Pickleball players using a phone at a venue or after playing. The user confirmed that this redesign focuses on the player journey, not the venue operator console.

## Product Purpose

Help players enter their court's recording session, find finished sessions, and watch, save, or share rally highlights from fixed-camera footage.

## Operating Context

Players enter through a venue QR-code link. The venue page presents Check in, Highlight, and Account. Sign-in supports LINE, Google, and email; the destination through sign-in must preserve the venue. A standalone Account page exists as a fallback when no venue is known. Share links can open directly without the venue journey.

## Capabilities and Constraints

- Preserve PicVision's name, existing features, and English/Traditional Chinese support, as confirmed by the user.
- Preserve recording confirmation and the distinction between an available court, a session that can be joined, and a recording the player controls.
- Preserve consent controls, their optional/required distinctions, and honest save/error feedback.
- Preserve vertical and wide video viewing, reel navigation, signed video URLs, download preparation, and native file sharing where supported.
- Respect current retention/access boundaries. Do not invent player statistics, scoring capabilities, session availability, or processing-time promises.
- The Court Club redesign is available on a preview branch, with a synthetic venue preview for reviewing layout without a live QR-code calendar.

## Brand Commitments

Retain the PicVision name and recognizable supplied logo assets. No color palette, typeface, or light/dark preference has been confirmed as binding for the redesign.

## Evidence on Hand

Current player UI source, public sign-in pages, the user's iPhone Account screenshot, and controlled renderings of the actual player components. Review fixtures use synthetic player/session data. A short local court-footage sample supplies visual context, not evidence of rally quality or product performance.

## Product Principles

- Make the player's next court/session action easy to recognize.
- Keep recording and privacy states explicit and trustworthy.
- Let real footage carry the highlight experience.
- Keep venue context intact through navigation and sign-in.
- Use consistent terminology and provide equal care for both supported languages.
