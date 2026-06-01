import { API_BASE_URL } from '@/api/http'

/**
 * Format a date string as relative time (e.g. "3分钟前", "2小时前")
 */
export function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}个月前`
  return `${Math.floor(months / 12)}年前`
}

/**
 * Resolve avatar URL — prepend API_BASE_URL for relative paths
 */
export function avatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  return API_BASE_URL + url
}

/**
 * Generate a deterministic HSL color from a user ID string
 */
export function avatarColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 45%, 35%)`
}