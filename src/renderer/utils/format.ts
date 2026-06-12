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
 * Morandi 色系头像背景色 —— 从 8 种低饱和莫兰迪色中确定性选取
 */
const AVATAR_COLORS = [
  '#7B8FA6',  // 灰蓝
  '#8C9B8A',  // 灰绿
  '#A8906C',  // 燕麦棕
  '#9E7E7E',  // 灰粉
  '#7B8F8A',  // 青灰
  '#8A849B',  // 紫灰
  '#A08B76',  // 暖驼
  '#7A8A95',  // 蓝灰
]

export function avatarColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/**
 * 全局 emoji 正则（共享，避免每个组件重复编译）
 */
export const EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2702}-\u{27B0}\u{2300}-\u{23FF}\u{2B50}\u{2764}\u{200D}\u{FE0F}]/gu

/**
 * 过滤 emoji，合并多余空格
 */
export function stripEmoji(s: string): string {
  return s.replace(EMOJI_RE, '').replace(/\s+/g, ' ').trim()
}

/**
 * 通知标题中 "点赞 · " "回复 · " 等前缀（因为已有图标）
 */
const REDUNDANT_PREFIX = /^(点赞|回复|评论|关注|系统)\s*[·]\s*/
export function cleanNotificationText(s: string): string {
  return stripEmoji(s).replace(REDUNDANT_PREFIX, '')
}