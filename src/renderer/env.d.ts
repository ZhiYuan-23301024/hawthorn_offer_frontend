/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}