// Preload script - isolated world
// Use CommonJS here for maximum compatibility in Electron preload context
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Folder dialog
  openFolderDialog: () => ipcRenderer.invoke('dialog:open-folder'),
  closeSplash: () => ipcRenderer.invoke('splash:ready'),
  // Printing helpers
  printCurrent: (options) => ipcRenderer.invoke('print:current', options || {}),
  printHTML: (html, options) => ipcRenderer.invoke('print:html', html, options || {}),
  printURL: (url, options) => ipcRenderer.invoke('print:url', url, options || {}),
  printPreviewCurrent: (options) => ipcRenderer.invoke('print:preview-current', options || {}),
});
