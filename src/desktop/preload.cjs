const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('quotaAPI', {
  getState: () => ipcRenderer.invoke('quota:get-state'),
  saveToken: (token) => ipcRenderer.invoke('quota:save-token', token),
  clearToken: () => ipcRenderer.invoke('quota:clear-token'),
  refresh: () => ipcRenderer.invoke('quota:refresh'),
  openUsage: () => ipcRenderer.invoke('quota:open-usage'),
  hide: () => ipcRenderer.invoke('quota:hide'),
  onStateChange: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('quota:state', listener);

    return () => ipcRenderer.removeListener('quota:state', listener);
  }
});
