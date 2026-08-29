export function truncateAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 2) return address
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`
}

// Mirrors sdk/warrant-client/bin/warrant-verify.js's formatAmount exactly,
// so a number shown in this UI and a number printed by the CLI never
// disagree because of two different rounding rules.
export function formatA0GI(wei: bigint | null | undefined): string {
  if (wei === null || wei === undefined) return 'n/a'
  const negative = wei < 0n
  const asString = (negative ? -wei : wei).toString().padStart(19, '0')
  const whole = asString.slice(0, -18) || '0'
  const frac = asString.slice(-18).replace(/0+$/, '') || '0'
  return `${negative ? '-' : ''}${whole}.${frac} A0GI`
}

export function formatTimestamp(unixSeconds: number | bigint): string {
  const ms = Number(unixSeconds) * 1000
  if (!Number.isFinite(ms) || ms <= 0) return 'n/a'
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function relativeToNow(unixSeconds: number | bigint): string {
  const now = Date.now() / 1000
  const t = Number(unixSeconds)
  const diff = t - now
  const abs = Math.abs(diff)
  const units: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [30, 'day'],
    [12, 'month'],
  ]
  let value = abs
  let unit = 'second'
  for (const [size, name] of units) {
    if (value < size) {
      unit = name
      break
    }
    value /= size
    unit = name
  }
  const rounded = Math.round(value)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  return rtf.format(diff < 0 ? -rounded : rounded, unit as Intl.RelativeTimeFormatUnit)
}
