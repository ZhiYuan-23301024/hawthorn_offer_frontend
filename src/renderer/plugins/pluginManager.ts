import type { Plugin } from '@/types'

class PluginManager {
  private plugins: Map<string, Plugin> = new Map()

  register(plugin: Plugin) {
    this.plugins.set(plugin.id, plugin)
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id)
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  activatePlugin(id: string) {
    const plugin = this.plugins.get(id)
    if (plugin) {
      plugin.activate()
    }
  }

  deactivatePlugin(id: string) {
    const plugin = this.plugins.get(id)
    if (plugin) {
      plugin.deactivate()
    }
  }
}

export const pluginManager = new PluginManager()
