/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'vue3-sfc-loader' {
  export interface ModuleOptions {
    moduleCache?: Record<string, any>
    getFile(url: string): Promise<string>
    addStyle?(textContent: string): Promise<void>
    handleModule?(type: string, getContentData: () => Promise<string>, path: string, options: ModuleOptions): Promise<any>
  }
  export function loadModule(path: string, options?: ModuleOptions): Promise<any>
}

interface ElectronAPI {
  openFile: () => Promise<string | null>
  saveFile: (path: string, content: string) => Promise<boolean>
  savePluginCode: (pluginId: string, code: string) => Promise<boolean>
  loadPluginCode: (pluginId: string) => Promise<string | null>
  deletePluginCode: (pluginId: string) => Promise<boolean>
  loadInstalledPlugins: () => Promise<any[]>
  savePluginManifest: (manifest: any) => Promise<boolean>
  deletePluginManifest: (pluginId: string) => Promise<boolean>
  savePlans: (plans: any[]) => Promise<boolean>
  loadPlans: () => Promise<any[]>
  saveInstalledTasks: (ids: string[]) => Promise<boolean>
  loadInstalledTasks: () => Promise<string[]>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    __HAWTHORN_API_URL__: string
  }
}