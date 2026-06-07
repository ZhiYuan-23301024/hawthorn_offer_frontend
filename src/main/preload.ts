import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (path: string, content: string) => ipcRenderer.invoke('file:save', path, content)
})