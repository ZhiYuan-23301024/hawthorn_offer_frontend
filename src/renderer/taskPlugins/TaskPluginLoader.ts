import { ref, markRaw } from 'vue'
import type { PluginManifest, PluginInstance, PluginAPI } from '../plugins/types'

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
    await this.validateCode(code)
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

  private async validateCode(code: string): Promise<void> {
    const dangerousPatterns = [
      /eval\(/g,
      /new Function\(/g,
      /document\.write\(/g,
      /window\.location/g,
      /localStorage\.setItem/g,
      /sessionStorage\.setItem/g
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`插件代码包含危险操作: ${pattern}`)
      }
    }
    
    if (code.length > 100 * 1024) {
      throw new Error('插件代码过大（超过100KB）')
    }
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
      this.pluginCache.value.delete(pluginId)
      
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
  }

  async update(pluginId: string): Promise<void> {
    await this.uninstall(pluginId)
    await this.install(pluginId)
    this.onUpdate?.(pluginId)
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