import { useAuthStore } from '@/stores/auth'
import { useSidebarStore } from '@/stores/sidebar'
import { useWorkspaceStore } from '@/stores/workspace'
import { useEditorStore } from '@/stores/editor'
import { pluginManager } from '@/plugins/pluginManager'

/**
 * 要求用户登录的 composable。
 * 如果未登录，弹出确认对话框引导用户前往登录页。
 *
 * @returns 已登录返回 true，未登录返回 false（调用方应 return 中止操作）
 */
export function useRequireAuth(): boolean {
  const authStore = useAuthStore()
  if (authStore.isAuthenticated) {
    return true
  }
  if (confirm('请先登录，是否前往登录页面？')) {
    useSidebarStore().setActiveItem('account')
    useWorkspaceStore().setActivePanel('account')
    const accountPlugin = pluginManager.getPlugin('account')
    if (accountPlugin) {
      useEditorStore().openComponentTab('account:login', '账户与设置/登录', accountPlugin.component, { activeSection: 'profile' })
    }
  }
  return false
}
