export interface TaskParam {
  name: string
  key: string
  type: 'number' | 'string' | 'select' | 'boolean'
  default: unknown
  options?: { label: string; value: unknown }[]
  min?: number
  max?: number
  placeholder?: string
}

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  category: string
  dependencies: string[]
  entry: string
  configSchema?: object
  params?: TaskParam[]
  createdAt: string
  updatedAt: string
}

export interface PluginInstance {
  manifest: PluginManifest
  component: any
  mounted: boolean
  config: Record<string, any>
}

export interface PluginAPI {
  install(pluginId: string): Promise<PluginInstance>
  uninstall(pluginId: string): Promise<void>
  update(pluginId: string): Promise<void>
  getPlugin(pluginId: string): PluginInstance | null
  getAllPlugins(): PluginInstance[]
  
  onInstall?: (pluginId: string) => void
  onUninstall?: (pluginId: string) => void
  onUpdate?: (pluginId: string) => void
  
  app: {
    router: any
    store: any
    emit: (event: string, ...args: any[]) => void
    on: (event: string, handler: (...args: any[]) => void) => void
  }
}