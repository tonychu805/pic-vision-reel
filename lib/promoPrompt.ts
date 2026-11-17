// What the claim screen shows for one finished game, as one value instead of
// two booleans read in the component. The database counts a player as
// agreeing to a game when the account setting is on OR that game was
// answered "yes" (session_promo_answers); no row anywhere means no.
export type PromoPrompt =
  | { kind: 'ask' }
  | { kind: 'answered'; allowed: boolean }
  | { kind: 'covered-by-account' }

/**
 * `accountConsented` is player_promo_consents.consented (a missing row is
 * false). `answer` is this game's session_promo_answers.allowed, or
 * null/undefined when the player never answered.
 */
export function promoPrompt(accountConsented: boolean, answer: boolean | null | undefined): PromoPrompt {
  if (accountConsented) return { kind: 'covered-by-account' }
  if (answer === true || answer === false) return { kind: 'answered', allowed: answer }
  return { kind: 'ask' }
}

// The signup box is kept on the account (user_metadata.promo_consent_version)
// for the email path, where the first session may open on another device.
export function promoTickedInMetadata(metadata: unknown, currentVersion: string): boolean {
  return (metadata as { promo_consent_version?: string } | null)?.promo_consent_version === currentVersion
}
