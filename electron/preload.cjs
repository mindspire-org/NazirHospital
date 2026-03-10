// Preload script - isolated world (CommonJS)
// Using CommonJS to avoid ESM issues when package.json has "type":"module"
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
  printPreviewHtml: (html, options) => ipcRenderer.invoke('print:preview-html', html, options || {}),
  printPreviewPdf: (dataUrlOrBase64) => ipcRenderer.invoke('print:preview-pdf', dataUrlOrBase64),
  openPath: (p) => ipcRenderer.invoke('shell:open-path', p),
});
