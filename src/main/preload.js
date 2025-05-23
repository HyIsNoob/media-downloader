const { contextBridge, ipcRenderer } = require('electron');

// Expose IPC API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // System checks
  checkYtdlp: () => ipcRenderer.invoke('check-ytdlp'),
  downloadYtDlp: () => ipcRenderer.invoke('download-ytdlp'),
  
  // Video info and download
  getVideoInfo: (url) => ipcRenderer.invoke('get-video-info', url),
  downloadVideo: (options) => ipcRenderer.invoke('download-video', options),
  onDownloadProgress: (callback) => {
    const channel = 'download-progress';
    ipcRenderer.on(channel, (_, progress) => callback(progress));
    return () => ipcRenderer.removeListener(channel, callback);
  },
  removeDownloadProgressListener: () => ipcRenderer.removeAllListeners('download-progress'),
  
  // Playlist handling
  getPlaylistInfo: (url) => ipcRenderer.invoke('get-playlist-info', url),
  
  // Settings
  getSaveFolder: () => ipcRenderer.invoke('get-save-folder'),
  setSaveFolder: () => ipcRenderer.invoke('set-save-folder'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // File operations
  openFile: (path) => ipcRenderer.invoke('open-file', path),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  
  // Update management
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => {
    const channel = 'update-status';
    ipcRenderer.on(channel, (_, status, info) => callback(status, info));
    return () => ipcRenderer.removeListener(channel, callback);
  },
  
  // History management
  getHistory: () => ipcRenderer.invoke('get-history'),
  addToHistory: (item) => ipcRenderer.invoke('add-to-history', item),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  deleteHistoryItem: (index) => ipcRenderer.invoke('delete-history-item', index),
  
  // File operations
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  
  // App lifecycle
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // Debug helpers
  openDevTools: () => ipcRenderer.invoke('open-dev-tools')
});
