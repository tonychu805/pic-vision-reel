const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The camera a court's QR code names (?court=<camera row id>), or null for the all-courts page. */
export function courtFromParam(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value
  return v && UUID.test(v) ? v.toLowerCase() : null
}
