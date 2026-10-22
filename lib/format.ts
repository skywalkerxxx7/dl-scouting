export const pct = (n: number) => `${(n * 100).toFixed(1)}%`
export const fixed = (n: number, d = 1) => n.toFixed(d)
export const int = (n: number) => Math.round(n).toLocaleString('en-US')

export function timeAgo(unixSeconds: number) {
  const diff = Date.now() / 1000 - unixSeconds
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}
