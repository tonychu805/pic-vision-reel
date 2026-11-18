// What the claim screen shows for one finished game, as one value instead of
// two booleans read in the component. The database counts a player as
// agreeing to a game when their setting for THAT venue is on OR that game was
// answered "yes" (session_promo_answers); no row anywhere means no.
export type PromoPrompt =
  | { kind: 'ask' }
  | { kind: 'answered'; allowed: boolean }
  | { kind: 'covered-by-venue' }

// One row of get_my_promo_venues(): a venue the player has played at or has a
// consent row for. `consented` is null when they never set it.
export type PromoVenue = { brand_name: string; slug: string; consented: boolean | null }

/**
 * `venueConsented` is the player's consent for this venue (no row or null is
 * false). `answer` is this game's session_promo_answers.allowed, or
 * null/undefined when the player never answered.
 */
export function promoPrompt(venueConsented: boolean, answer: boolean | null | undefined): PromoPrompt {
  if (venueConsented) return { kind: 'covered-by-venue' }
  if (answer === true || answer === false) return { kind: 'answered', allowed: answer }
  return { kind: 'ask' }
}

/** Is the player's consent for `slug` on? A venue missing from the list counts as off. */
export function venueConsented(venues: PromoVenue[], slug: string): boolean {
  return venues.find((v) => v.slug === slug)?.consented === true
}

/** Has the player ever set `slug` either way? Used so signup never flips a later "off" back on. */
export function venueHasChoice(venues: PromoVenue[], slug: string): boolean {
  const v = venues.find((x) => x.slug === slug)
  return v != null && v.consented !== null
}

// The signup box is kept on the account (user_metadata.promo_consent_version)
// for the email path, where the first session may open on another device. The
// venue it was ticked for rides in user_metadata.venue_next.
export function promoTickedInMetadata(metadata: unknown, currentVersion: string): boolean {
  return (metadata as { promo_consent_version?: string } | null)?.promo_consent_version === currentVersion
}
