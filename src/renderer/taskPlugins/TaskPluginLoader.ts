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
    console.log(`[PluginLoader.install] ====== 开始安装插件: ${pluginId} ======`)

    console.log(`[PluginLoader.install] Step1: 请求 manifest -> /plugins/${pluginId}/manifest`)
    const manifest = await this.fetchManifest(pluginId)
    console.log(`[PluginLoader.install] Step1 完成: manifest =`, JSON.stringify(manifest, null, 2))

    console.log(`[PluginLoader.install] Step2: 请求代码 -> /plugins/${pluginId}/download`)
    const code = await this.downloadPlugin(pluginId)
    console.log(`[PluginLoader.install] Step2 完成: code 长度=${code.length}, 前200字符=`, code.substring(0, 200))

    console.log(`[PluginLoader.install] Step3: 持久化到本地`)
    await this.persistToLocal(pluginId, code, manifest)

    console.log(`[PluginLoader.install] Step4: 编译组件`)
    const component = await this.compileComponent(code)
    console.log(`[PluginLoader.install] Step4 完成: component 类型=`, typeof component, ', keys=', Object.keys(component || {}))
    
    const instance: PluginInstance = {
      manifest, 
      component: markRaw(component),
      mounted: false,
      config: {}
    }
    
    this.plugins.value.set(pluginId, instance)
    this.pluginCache.value.set(pluginId, code)
    console.log(`[PluginLoader.install] Step5: 上报安装 -> POST /plugins/${pluginId}/install`)
    this.reportInstall(pluginId)
    
    this.onInstall?.(pluginId)
    console.log(`[PluginLoader.install] ====== 安装完成: ${pluginId} ======`)
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
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/plugins/${pluginId}/manifest`
    console.log(`[PluginLoader.fetchManifest] >>> GET ${url}`)
    const response = await fetch(url)
    console.log(`[PluginLoader.fetchManifest] <<< status=${response.status}, ok=${response.ok}`)
    if (!response.ok) {
      const body = await response.text().catch(() => '(无法读取响应体)')
      console.error(`[PluginLoader.fetchManifest] 请求失败! body=`, body)
      throw new Error(`Failed to fetch manifest: ${response.statusText}`)
    }
    const json = await response.json()
    console.log(`[PluginLoader.fetchManifest] 返回 JSON:`, JSON.stringify(json, null, 2))
    if (json.code && json.code !== 200) {
      console.error(`[PluginLoader.fetchManifest] 业务错误! code=${json.code}, message=${json.message}`)
      throw new Error(`获取插件清单失败: ${json.message || '未知错误'}`)
    }
    return json
  }

  private async downloadPlugin(pluginId: string): Promise<string> {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/plugins/${pluginId}/download`
    console.log(`[PluginLoader.downloadPlugin] >>> GET ${url}`)
    const response = await fetch(url)
    const contentType = response.headers.get('content-type') || ''
    console.log(`[PluginLoader.downloadPlugin] <<< status=${response.status}, ok=${response.ok}, contentType=${contentType}`)
    if (!response.ok) {
      const body = await response.text().catch(() => '(无法读取响应体)')
      console.error(`[PluginLoader.downloadPlugin] 请求失败! body=`, body)
      throw new Error(`Failed to download plugin: ${response.statusText}`)
    }
    const code = await response.text()
    console.log(`[PluginLoader.downloadPlugin] 返回代码长度=${code.length}, 前200字符:`, code.substring(0, 200))
    if (contentType.includes('application/json') || (code.startsWith('{') && code.includes('"code"'))) {
      try {
        const errorJson = JSON.parse(code)
        if (errorJson.code && errorJson.code !== 200) {
          console.error(`[PluginLoader.downloadPlugin] 业务错误! code=${errorJson.code}, message=${errorJson.message}`)
          throw new Error(`下载插件代码失败: ${errorJson.message || '未知错误'}`)
        }
      } catch (parseErr) {
        // 不是有效的 JSON 错误响应，当作普通代码处理
      }
    }
    return code
  }

  private async compileComponent(code: string): Promise<any> {
    console.log(`[PluginLoader.compileComponent] 开始编译, 代码长度=${code.length}`)
    const blob = new Blob([code], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    try {
      // @ts-ignore
      const module = await import(/* @vite-ignore */ url)
      console.log(`[PluginLoader.compileComponent] 编译成功, module keys=`, Object.keys(module))
      return module.default || module
    } catch (err) {
      console.error(`[PluginLoader.compileComponent] 编译失败!`, err)
      console.error(`[PluginLoader.compileComponent] 失败的代码前500字符:`, code.substring(0, 500))
      throw err
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  private async reportInstall(pluginId: string): Promise<void> {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/plugins/${pluginId}/install`
    console.log(`[PluginLoader.reportInstall] >>> POST ${url}`)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': 'test-user-001'
        }
      })
      console.log(`[PluginLoader.reportInstall] <<< status=${response.status}`)
    } catch (err) {
      console.warn('[PluginLoader.reportInstall] 上报失败 (可忽略):', err)
    }
  }

  async uninstall(pluginId: string): Promise<void> {
    console.log(`[PluginLoader.uninstall] ====== 开始卸载插件: ${pluginId} ======`)
    const instance = this.plugins.value.get(pluginId)
    if (instance) {
      instance.component?.unmount?.()
      this.plugins.value.delete(pluginId)
      console.log(`[PluginLoader.uninstall] 已从内存移除组件和实例`)
    } else {
      console.log(`[PluginLoader.uninstall] 内存中未找到该插件实例`)
    }
    this.pluginCache.value.delete(pluginId)

    console.log(`[PluginLoader.uninstall] Step1: 从本地文件系统清除`)
    await this.removeFromLocal(pluginId)
    
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/plugins/${pluginId}/uninstall`
    console.log(`[PluginLoader.uninstall] Step2: 上报卸载 -> POST ${url}`)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': 'test-user-001'
        }
      })
      console.log(`[PluginLoader.uninstall] 上报卸载 <<< status=${response.status}`)
    } catch (err) {
      console.warn('[PluginLoader.uninstall] 上报卸载失败 (可忽略):', err)
    }
    
    this.onUninstall?.(pluginId)
    console.log(`[PluginLoader.uninstall] ====== 卸载完成: ${pluginId} ======`)
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
    console.log(`[PluginLoader.restore] ====== 开始从本地恢复插件 ======`)
    if (!window.electronAPI) {
      console.log('[PluginLoader.restore] 非 Electron 环境，跳过本地插件恢复')
      return []
    }

    try {
      console.log(`[PluginLoader.restore] Step1: 读取本地插件清单`)
      const installedManifests: PluginManifest[] = await window.electronAPI.loadInstalledPlugins()
      console.log(`[PluginLoader.restore] 发现 ${installedManifests.length} 个本地已安装插件, ids=`, installedManifests.map(m => m.id))

      const restored: PluginInstance[] = []

      for (const manifest of installedManifests) {
        console.log(`[PluginLoader.restore] 正在恢复插件: id=${manifest.id}, name=${manifest.name}`)
        try {
          console.log(`[PluginLoader.restore]   -> 加载本地代码: ${manifest.id}`)
          const code = await window.electronAPI.loadPluginCode(manifest.id)
          if (!code) {
            console.warn(`[PluginLoader.restore]   -> 插件 ${manifest.id} 本地代码缺失，跳过`)
            continue
          }
          console.log(`[PluginLoader.restore]   -> 代码长度=${code.length}, 前200字符:`, code.substring(0, 200))

          console.log(`[PluginLoader.restore]   -> 编译组件: ${manifest.id}`)
          const component = await this.compileComponent(code)
          console.log(`[PluginLoader.restore]   -> 编译成功, component 类型=`, typeof component)

          const instance: PluginInstance = {
            manifest,
            component: markRaw(component),
            mounted: false,
            config: {}
          }

          this.plugins.value.set(manifest.id, instance)
          this.pluginCache.value.set(manifest.id, code)
          restored.push(instance)
          console.log(`[PluginLoader.restore]   -> 已恢复插件: ${manifest.id}`)
        } catch (err) {
          console.error(`[PluginLoader.restore]   -> 恢复插件 ${manifest.id} 失败:`, err)
        }
      }

      console.log(`[PluginLoader.restore] ====== 恢复完成, 共 ${restored.length} 个 ======`)
      return restored
    } catch (err) {
      console.error('[PluginLoader.restore] 读取本地插件清单失败:', err)
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