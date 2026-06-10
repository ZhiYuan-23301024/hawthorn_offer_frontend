import { ref, markRaw } from 'vue'
import type { PluginManifest, PluginInstance, PluginAPI } from '../plugins/types'

declare global {
  interface Window {
    electronAPI: {
      savePluginCode: (pluginId: string, code: string) => Promise<boolean>
      loadPluginCode: (pluginId: string) => Promise<string | null>
      deletePluginCode: (pluginId: string) => Promise<boolean>
      loadInstalledPlugins: () => Promise<PluginManifest[]>
      savePluginManifest: (manifest: PluginManifest) => Promise<boolean>
      deletePluginManifest: (pluginId: string) => Promise<boolean>
    }
  }
}

export class PluginLoader implements PluginAPI {
  private plugins = ref<Map<string, PluginInstance>>(new Map())
  private pluginCache = ref<Map<string, string>>(new Map())
  
  app = {
    router: null,
    store: null,
    emit: (event: string, ...args: any[]) => {},
    on: (event: string, handler: (...args: any[]) => void) => {}
  }
  
  onInstall?: (pluginId: string) => void
  onUninstall?: (pluginId: string) => void
  onUpdate?: (pluginId: string) => void

  initialize(router: any, store: any) {
    this.app.router = router
    this.app.store = store
    
    // Pinia 实例本身没有 $emit/$on，需要使用 store 的事件系统或提供默认实现
    if (store && typeof store.$emit === 'function') {
      this.app.emit = store.$emit.bind(store)
    } else {
      this.app.emit = (event: string, ...args: any[]) => {
        console.log(`Plugin event: ${event}`, args)
      }
    }
    
    if (store && typeof store.$on === 'function') {
      this.app.on = store.$on.bind(store)
    } else {
      this.app.on = (event: string, handler: (...args: any[]) => void) => {
        console.log(`Plugin listener registered: ${event}`)
      }
    }
  }

  async install(pluginId: string): Promise<PluginInstance> {
    const manifest = await this.fetchManifest(pluginId)
    const code = await this.downloadPlugin(pluginId)

    await this.persistToLocal(pluginId, code, manifest)

    const component = await this.compileComponent(code)
    
    const instance: PluginInstance = {
      manifest, 
      component: markRaw(component),
      mounted: false,
      config: {}
    }
    
    this.plugins.value.set(pluginId, instance)
    this.pluginCache.value.set(pluginId, code)
    this.reportInstall(pluginId)
    
    this.onInstall?.(pluginId)
    return instance
  }

  private async persistToLocal(pluginId: string, code: string, manifest: PluginManifest): Promise<void> {
    if (window.electronAPI) {
      try {
        await window.electronAPI.savePluginCode(pluginId, code)
        await window.electronAPI.savePluginManifest(manifest)
        console.log(`[PluginLoader] 插件已持久化到本地: ${pluginId}`)
      } catch (err) {
        console.warn(`[PluginLoader] 本地持久化失败 (非 Electron 环境可忽略):`, err)
      }
    }
  }

  private async fetchManifest(pluginId: string): Promise<PluginManifest> {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/plugins/${pluginId}/manifest`)
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.statusText}`)
    }
    return response.json()
  }

  private async downloadPlugin(pluginId: string): Promise<string> {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/plugins/${pluginId}/download`)
    if (!response.ok) {
      throw new Error(`Failed to download plugin: ${response.statusText}`)
    }
    return response.text()
  }

  private async compileComponent(code: string): Promise<any> {
    const blob = new Blob([code], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    try {
      // @ts-ignore
      const module = await import(/* @vite-ignore */ url)
      return module.default || module
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  private async reportInstall(pluginId: string): Promise<void> {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/plugins/${pluginId}/install`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': 'test-user-001'
        }
      })
    } catch (err) {
      console.warn('Failed to report installation:', err)
    }
  }

  async uninstall(pluginId: string): Promise<void> {
    const instance = this.plugins.value.get(pluginId)
    if (instance) {
      instance.component?.unmount?.()
      this.plugins.value.delete(pluginId)
    }
    this.pluginCache.value.delete(pluginId)

    await this.removeFromLocal(pluginId)
    
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/plugins/${pluginId}/uninstall`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': 'test-user-001'
        }
      })
    } catch (err) {
      console.warn('Failed to report uninstallation:', err)
    }
    
    this.onUninstall?.(pluginId)
  }

  private async removeFromLocal(pluginId: string): Promise<void> {
    if (window.electronAPI) {
      try {
        await window.electronAPI.deletePluginCode(pluginId)
        await window.electronAPI.deletePluginManifest(pluginId)
        console.log(`[PluginLoader] 本地插件已清理: ${pluginId}`)
      } catch (err) {
        console.warn(`[PluginLoader] 本地清理失败:`, err)
      }
    }
  }

  async update(pluginId: string): Promise<void> {
    await this.uninstall(pluginId)
    await this.install(pluginId)
    this.onUpdate?.(pluginId)
  }

  async restoreInstalledPlugins(): Promise<PluginInstance[]> {
    if (!window.electronAPI) {
      console.log('[PluginLoader] 非 Electron 环境，跳过本地插件恢复')
      return []
    }

    try {
      const installedManifests: PluginManifest[] = await window.electronAPI.loadInstalledPlugins()
      console.log(`[PluginLoader] 发现 ${installedManifests.length} 个本地已安装插件`)

      const restored: PluginInstance[] = []

      for (const manifest of installedManifests) {
        try {
          const code = await window.electronAPI.loadPluginCode(manifest.id)
          if (!code) {
            console.warn(`[PluginLoader] 插件 ${manifest.id} 本地代码缺失，跳过`)
            continue
          }

          const component = await this.compileComponent(code)

          const instance: PluginInstance = {
            manifest,
            component: markRaw(component),
            mounted: false,
            config: {}
          }

          this.plugins.value.set(manifest.id, instance)
          this.pluginCache.value.set(manifest.id, code)
          restored.push(instance)
          console.log(`[PluginLoader] 已恢复插件: ${manifest.id}`)
        } catch (err) {
          console.error(`[PluginLoader] 恢复插件 ${manifest.id} 失败:`, err)
        }
      }

      return restored
    } catch (err) {
      console.error('[PluginLoader] 读取本地插件清单失败:', err)
      return []
    }
  }

  getPlugin(pluginId: string): PluginInstance | null {
    return this.plugins.value.get(pluginId) || null
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.value.values())
  }

  hasPlugin(pluginId: string): boolean {
    return this.plugins.value.has(pluginId)
  }
}

export const taskPluginLoader = new PluginLoader()