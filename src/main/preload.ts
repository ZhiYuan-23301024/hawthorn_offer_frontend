import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (path: string, content: string) => ipcRenderer.invoke('file:save', path, content),
  savePluginCode: (pluginId: string, code: string) => ipcRenderer.invoke('plugin:save-code', pluginId, code),
  loadPluginCode: (pluginId: string): Promise<string | null> => ipcRenderer.invoke('plugin:load-code', pluginId),
  deletePluginCode: (pluginId: string) => ipcRenderer.invoke('plugin:delete-code', pluginId),
  loadInstalledPlugins: (): Promise<any[]> => ipcRenderer.invoke('plugin:load-installed'),
  savePluginManifest: (manifest: any) => ipcRenderer.invoke('plugin:save-manifest', manifest),
  deletePluginManifest: (pluginId: string) => ipcRenderer.invoke('plugin:delete-manifest', pluginId)
})