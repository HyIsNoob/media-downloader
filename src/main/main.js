const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
// Import electron-store correctly
const Store = require('electron-store').default || require('electron-store');
// Import autoUpdater
const { autoUpdater } = require('electron-updater');
// Import the downloader utility
const { downloadYtDlp } = require('./downloader');

// Nâng cấp logging cho autoUpdater
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'debug'; // Nâng cấp từ 'info' lên 'debug'
autoUpdater.logger.info('App starting...');

// Ghi ra vị trí file log để dễ tìm
console.log('Log file location:', autoUpdater.logger.transports.file.getFile().path);

// Check for cleanup argument (used during uninstallation)
if (process.argv.includes('--cleanup')) {
  // Clean up all application data
  cleanupAppData().then(() => {
    console.log('Application data cleanup completed.');
    app.quit();
  }).catch(error => {
    console.error('Error during cleanup:', error);
    app.quit();
  });
}

// Initialize stores
const store = new Store();
const historyStore = new Store({ name: 'history' });

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

let mainWindow;
let updateCheckInterval;
// Track active download processes
let activeProcesses = [];

// Helper: auto update yt-dlp binary (non-blocking). Returns promise with {updated:boolean, version?:string}
function autoUpdateYtDlp({ force = false } = {}) {
  return new Promise((resolve) => {
    const ytdlpPath = store.get('ytdlpPath', 'yt-dlp');
    const start = Date.now();
    const verProc = spawn(ytdlpPath, ['--version']);
    let currentVer = '';
    verProc.stdout.on('data', d => currentVer += d.toString());
    verProc.on('close', () => {
      currentVer = currentVer.trim();
      if (currentVer) store.set('lastYtDlpVersion', currentVer);
      const upd = spawn(ytdlpPath, ['-U']);
      let updOut = '';
      upd.stdout.on('data', d => updOut += d.toString());
      upd.stderr.on('data', d => updOut += d.toString());
      upd.on('close', () => {
        const ver2 = spawn(ytdlpPath, ['--version']);
        let newVer = '';
        ver2.stdout.on('data', d => newVer += d.toString());
        ver2.on('close', () => {
          newVer = newVer.trim();
          if (newVer) {
            store.set('lastYtDlpVersion', newVer);
            store.set('lastYtDlpUpdateTime', new Date().toISOString());
          }
            const updated = currentVer && newVer && currentVer !== newVer;
            console.log(`[yt-dlp auto-update] old=${currentVer} new=${newVer} updated=${updated}`);
            if (mainWindow) {
              mainWindow.webContents.send('ytdlp-update-result', { updated, oldVersion: currentVer, newVersion: newVer, raw: updOut });
            }
            resolve({ updated, version: newVer || currentVer });
        });
      });
      upd.on('error', err => {
        console.warn('yt-dlp update error:', err.message);
        resolve({ updated: false, error: err.message, version: currentVer });
      });
    });
    verProc.on('error', err => {
      console.warn('Cannot get yt-dlp version before updating:', err.message);
      const upd = spawn(ytdlpPath, ['-U']);
      upd.on('close', () => resolve({ updated: false, error: 'version unknown' }));
    });
  });
}

// Convert human-readable size number + unit to bytes
function convertToBytes(num, unit) {
  if (!num || !unit) return 0;
  const normalized = unit.toUpperCase();
  const factor = normalized.includes('IB') ? 1024 : 1000; // iB vs B
  if (normalized.startsWith('K')) return num * factor;
  if (normalized.startsWith('M')) return num * factor * factor;
  if (normalized.startsWith('G')) return num * factor * factor * factor;
  return num; // bytes
}

function hmsToSeconds(str) {
  if (!str) return 0;
  const parts = str.split(':').map(p => parseInt(p, 10));
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Allow loading local resources
    },
    icon: path.join(__dirname, '../renderer/assets/icon.png')
  });

  // Maximize immediately per requirement
  try { mainWindow.maximize(); } catch(e) { console.warn('Unable to maximize window:', e.message); }

  // Set Content-Security-Policy to allow imports from file:// protocol
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' https: file:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: file:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: file:; font-src 'self' https: file:; connect-src 'self' https:;"
        ]
      }
    });
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // Open DevTools in development mode only with --dev flag
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Configure auto-updater
function configureAutoUpdater() {
  // Disable auto downloading of updates initially (user can choose)
  autoUpdater.autoDownload = false;
  
  // Configure for GitHub releases
  autoUpdater.allowPrerelease = false; // Không tải phiên bản thử nghiệm
  autoUpdater.allowDowngrade = false;  // Không tải phiên bản cũ hơn
  
  // Log when checking for updates
  autoUpdater.logger.info('Configuring autoUpdater...');
  
  // Send update-related events to renderer
  autoUpdater.on('checking-for-update', () => {
    autoUpdater.logger.info('Checking for updates...');
    mainWindow.webContents.send('update-status', 'checking');
  });
  
  autoUpdater.on('update-available', (info) => {
    autoUpdater.logger.info('Update available:', info);
    mainWindow.webContents.send('update-status', 'available', info);
    
    // Lưu thông tin về phiên bản có sẵn
    store.set('latestUpdateVersion', info.version);
    store.set('latestUpdateDate', new Date().toISOString());
  });
  
  autoUpdater.on('update-not-available', (info) => {
    autoUpdater.logger.info('No updates available');
    mainWindow.webContents.send('update-status', 'not-available');
  });
  
  autoUpdater.on('error', (err) => {
    autoUpdater.logger.error('AutoUpdater error:', err);
    mainWindow.webContents.send('update-status', 'error', err.toString());
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
    autoUpdater.logger.info(logMessage);
    mainWindow.webContents.send('update-status', 'progress', progressObj);
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    autoUpdater.logger.info('Update downloaded:', info);
    mainWindow.webContents.send('update-status', 'downloaded', info);
    
    // Show prompt to install update with version details
    dialog.showMessageBox({
      type: 'info',
      title: 'Cập nhật mới',
      message: `Đã tải xong bản cập nhật ${info.version}. Bạn có muốn cài đặt và khởi động lại ứng dụng ngay?`,
      detail: info.releaseNotes ? `Thông tin cập nhật: ${info.releaseNotes}` : undefined,
      buttons: ['Cài đặt', 'Để sau']
    }).then(({ response }) => {
      if (response === 0) {
        // Quit and install update
        autoUpdater.logger.info('User confirmed update installation');
        autoUpdater.quitAndInstall(true, true);
      } else {
        autoUpdater.logger.info('User postponed update installation');
      }
    });
  });
}

// App ready event
app.whenReady().then(() => {
  createWindow();
  
  // Configure and check for updates after a short delay
  setTimeout(() => {
    configureAutoUpdater();
    autoUpdater.checkForUpdates();
  }, 3000);
  
  // Check for updates every hour, store the interval ID
  updateCheckInterval = setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60 * 60 * 1000);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Set default save folder if not exist
  if (!store.has('saveFolder')) {
    store.set('saveFolder', app.getPath('downloads'));
  }
  
  // Set yt-dlp path if not exists (enhanced with more robust detection)
  if (!store.has('ytdlpPath')) {
    console.log('Setting yt-dlp path...');
    // Try multiple locations for yt-dlp
    const possiblePaths = [
      // 1. Resources folder (from packaged app)
      path.join(process.resourcesPath, 'bin', `yt-dlp${process.platform === 'win32' ? '.exe' : ''}`),
      // 2. Double bin folder (observed in some installations)
      path.join(process.resourcesPath, 'bin', 'bin', `yt-dlp${process.platform === 'win32' ? '.exe' : ''}`),
      // 3. Local development resources folder
      path.join(app.getAppPath(), 'resources', 'bin', `yt-dlp${process.platform === 'win32' ? '.exe' : ''}`),
      // 4. Another possible location
      path.join(process.resourcesPath, `yt-dlp${process.platform === 'win32' ? '.exe' : ''}`),
      // 5. Check if it's available in PATH
      `yt-dlp${process.platform === 'win32' ? '.exe' : ''}`
    ];
    
    // Log all possible paths for debugging
    console.log('Checking for yt-dlp at these locations:', possiblePaths);
    
    // Check each path
    let ytdlpFound = false;
    
    for (const testPath of possiblePaths) {
      // For absolute paths, check if file exists
      if (path.isAbsolute(testPath)) {
        console.log(`Checking absolute path: ${testPath}`);
        if (fs.existsSync(testPath)) {
          console.log(`yt-dlp found at: ${testPath}`);
          store.set('ytdlpPath', testPath);
          ytdlpFound = true;
          break;
        }
      }
    }
    
    if (!ytdlpFound) {
      // Default to a path that will be checked later (during first use)
      console.log('yt-dlp not found in any expected location, using default PATH reference');
      store.set('ytdlpPath', `yt-dlp${process.platform === 'win32' ? '.exe' : ''}`);
    }
  }
});

// App window close event
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Handle cleanup before quitting
app.on('before-quit', () => {
  // Clear update check interval
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
  }
  
  // Kill any active child processes
  activeProcesses.forEach(process => {
    try {
      if (!process.killed) {
        process.kill();
      }
    } catch (err) {
      console.error('Error killing process:', err);
    }
  });
  
  // Clear the active processes array
  activeProcesses = [];
});

// IPC handlers
ipcMain.handle('check-ytdlp', async () => {
  const ytdlpPath = store.get('ytdlpPath', 'yt-dlp');
  
  console.log(`Checking yt-dlp at path: ${ytdlpPath}`);
  
  return new Promise((resolve) => {
    let errorMsg = '';
    
    try {
      const ytdlp = spawn(ytdlpPath, ['--version']);
      
      ytdlp.on('error', (error) => {
        console.error(`Error spawning yt-dlp: ${error.message}`);
        errorMsg = error.message;
        
        if (error.code === 'ENOENT') {
          errorMsg = `yt-dlp không được tìm thấy tại đường dẫn: ${ytdlpPath}`;
        }
        
        resolve({ 
          installed: false, 
          error: errorMsg,
          path: ytdlpPath 
        });
      });
      
      ytdlp.stdout.on('data', (data) => {
        const version = data.toString().trim();
        console.log(`yt-dlp version found: ${version}`);
        resolve({ installed: true, version, path: ytdlpPath });
      });
      
      ytdlp.on('close', (code) => {
        if (code !== 0) {
          console.log(`yt-dlp exited with code ${code}`);
          resolve({ 
            installed: false, 
            error: `yt-dlp exited with code ${code}`, 
            path: ytdlpPath 
          });
        }
      });
    } catch (error) {
      console.error('Exception when checking yt-dlp:', error);
      resolve({ 
        installed: false, 
        error: `Exception: ${error.message}`, 
        path: ytdlpPath 
      });
    }
  });
});

ipcMain.handle('get-video-info', async (event, url) => {
  console.log(`IPC: get-video-info called with URL: ${url}`);
  try {
    const result = await getVideoInfo(url);
    console.log('Video info retrieved successfully');
    return result;
  } catch (error) {
    console.error('Error in get-video-info handler:', error);
    throw error;  // Re-throw to allow renderer to catch it
  }
});

ipcMain.handle('download-video', async (event, { url, format, isAudio, outputPath }) => {
  return await downloadVideo(url, format, isAudio, outputPath, (progress) => {
    mainWindow.webContents.send('download-progress', progress);
  });
});

ipcMain.handle('get-save-folder', () => {
  return store.get('saveFolder');
});

ipcMain.handle('set-save-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    store.set('saveFolder', folderPath);
    return folderPath;
  }
  
  return store.get('saveFolder');
});

ipcMain.handle('get-settings', () => {
  return {
    autoFetch: store.get('autoFetch', false),
    autoPaste: store.get('autoPaste', false),
    autoUpdate: store.get('autoUpdate', true),
    lastUpdateCheck: store.get('lastUpdateCheck', null),
    skipVersion: store.get('skipVersion', null),
    theme: store.get('theme', 'light'),
    autoDetectURLs: store.get('autoDetectURLs', true),
    autoFetchInfo: store.get('autoFetchInfo', true),
    useTikTokCookies: store.get('useTikTokCookies', false),
    tiktokCookiesPath: store.get('tiktokCookiesPath', ''),
    autoUpdateYtDlpOnStart: store.get('autoUpdateYtDlpOnStart', true),
    lastYtDlpVersion: store.get('lastYtDlpVersion', null),
    lastYtDlpUpdateTime: store.get('lastYtDlpUpdateTime', null),
    appVersion: app.getVersion(),
    ultraRemuxMp4: store.get('ultraRemuxMp4', false)
  };
});

ipcMain.handle('save-settings', (event, settings) => {
  // Handle basic settings
  if (settings.autoFetch !== undefined)
    store.set('autoFetch', settings.autoFetch);
  
  if (settings.autoPaste !== undefined)
    store.set('autoPaste', settings.autoPaste);
  
  if (settings.autoUpdate !== undefined)
    store.set('autoUpdate', settings.autoUpdate);
  
  if (settings.autoDetectURLs !== undefined)
    store.set('autoDetectURLs', settings.autoDetectURLs);
  
  if (settings.autoFetchInfo !== undefined)
    store.set('autoFetchInfo', settings.autoFetchInfo);
  if (settings.useTikTokCookies !== undefined)
    store.set('useTikTokCookies', settings.useTikTokCookies);
  if (settings.tiktokCookiesPath !== undefined)
    store.set('tiktokCookiesPath', settings.tiktokCookiesPath);
  
  // Handle new settings
  if (settings.autoUpdateYtDlpOnStart !== undefined)
    store.set('autoUpdateYtDlpOnStart', settings.autoUpdateYtDlpOnStart);
  if (settings.lastYtDlpVersion !== undefined)
    store.set('lastYtDlpVersion', settings.lastYtDlpVersion);
  if (settings.lastYtDlpUpdateTime !== undefined)
    store.set('lastYtDlpUpdateTime', settings.lastYtDlpUpdateTime);
  
  // Handle theme settings
  if (settings.theme !== undefined)
    store.set('theme', settings.theme);
  
  // Handle optional fields if they exist
  if (settings.lastUpdateCheck !== undefined) 
    store.set('lastUpdateCheck', settings.lastUpdateCheck);
  
  if (settings.skipVersion !== undefined) 
    store.set('skipVersion', settings.skipVersion);
  if (typeof settings.ultraRemuxMp4 !== 'undefined') store.set('ultraRemuxMp4', settings.ultraRemuxMp4);
  
  return true;
});

ipcMain.handle('get-history', () => {
  return historyStore.get('downloads', []);
});

ipcMain.handle('get-playlist-info', async (event, url) => {
  return await getPlaylistInfo(url);
});

ipcMain.handle('add-to-history', (event, item) => {
  const history = historyStore.get('downloads', []);
  history.unshift(item);
  historyStore.set('downloads', history);
  return true;
});

ipcMain.handle('clear-history', () => {
  historyStore.set('downloads', []);
  return true;
});

ipcMain.handle('delete-history-item', (event, index) => {
  const history = historyStore.get('downloads', []);
  history.splice(index, 1);
  historyStore.set('downloads', history);
  return true;
});

ipcMain.handle('open-file', (event, filePath) => {
  require('electron').shell.openPath(filePath);
});

ipcMain.handle('open-folder', (event, folderPath) => {
  require('electron').shell.showItemInFolder(folderPath);
});

// Allow user to pick a TikTok cookies.txt file
ipcMain.handle('set-tiktok-cookies-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [ { name: 'Cookies text file', extensions: ['txt'] } ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    store.set('tiktokCookiesPath', filePath);
    return { success: true, path: filePath };
  }
  return { success: false, path: store.get('tiktokCookiesPath', '') };
});

// Manual trigger for yt-dlp update
ipcMain.handle('update-ytdlp-now', async () => {
  return await autoUpdateYtDlp({ force: true });
});

// Check if a file exists
ipcMain.handle('check-file-exists', (event, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error('Error checking if file exists:', error);
    return false;
  }
});

// Update related handlers
ipcMain.handle('check-for-updates', () => {
  autoUpdater.logger.info('Manually checking for updates...');
  
  // Log thông tin quan trọng về cấu hình updater để debug
  const updateConfig = {
    provider: 'github',
    owner: 'HyIsNoob',
    repo: 'media-downloader',
    currentVersion: app.getVersion(),
    feedURL: autoUpdater.getFeedURL()
  };
  
  autoUpdater.logger.info('Update configuration:', updateConfig);
  
  // Tiến hành kiểm tra cập nhật
  return autoUpdater.checkForUpdates().catch(err => {
    autoUpdater.logger.error('Error checking for updates:', err);
    return { error: err.message };
  });
});

ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// Playlist handler for downloading an item
ipcMain.handle('download-playlist-item', async (event, { url, index, format, isAudio, outputPath }) => {
  return await downloadVideo(url, format, isAudio, outputPath, (progress) => {
    mainWindow.webContents.send('download-progress', progress);
  });
});

// App quit handler
ipcMain.handle('quit-app', () => {
  app.quit();
  return true;
});

// Add this IPC handler before other handlers

ipcMain.handle('download-ytdlp', async () => {
  try {
    console.log('Starting yt-dlp download...');
    const ytdlpPath = await downloadYtDlp();
    console.log(`yt-dlp downloaded to: ${ytdlpPath}`);
    
    // Update the path in store
    store.set('ytdlpPath', ytdlpPath);
    
    // Test the new binary
    const version = await testYtDlpBinary(ytdlpPath);
    return { 
      success: true, 
      path: ytdlpPath,
      version 
    };
  } catch (error) {
    console.error('Error downloading yt-dlp:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Add this new handler near the other ipcMain handlers
ipcMain.handle('open-dev-tools', () => {
  if (mainWindow) {
    mainWindow.webContents.openDevTools();
    return true;
  }
  return false;
});

/**
 * Test if a yt-dlp binary works and return its version
 * 
 * @param {string} ytdlpPath - Path to yt-dlp binary
 * @returns {Promise<string>} - Version string if successful
 */
function testYtDlpBinary(ytdlpPath) {
  return new Promise((resolve, reject) => {
    try {
      const ytdlp = spawn(ytdlpPath, ['--version']);
      
      let stdout = '';
      let stderr = '';
      
      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ytdlp.on('error', (error) => {
        reject(error);
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Test failed with code ${code}: ${stderr}`));
        }
      });
    } catch (error) {
      reject(error);
    }
  
    // Auto update yt-dlp at startup if enabled
    const autoUpd = store.get('autoUpdateYtDlpOnStart', true);
    if (autoUpd) {
      setTimeout(() => {
        console.log('Auto updating yt-dlp on startup...');
        autoUpdateYtDlp().then(res => {
          console.log('Auto update yt-dlp result:', res);
        });
      }, 2000);
    }
  });
}

// Helper function to get video information using yt-dlp
async function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    const ytdlpPath = store.get('ytdlpPath', 'yt-dlp');
    let attemptedAutoUpdate = false;
    const useTikTokCookies = store.get('useTikTokCookies', false);
    const tiktokCookiesPath = store.get('tiktokCookiesPath', '');

    function isTikTokUrl(u) {
      return /tiktok\.com\//i.test(u);
    }

    const baseArgs = [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--no-call-home',
      '--skip-download',
      '--force-ipv4'
    ];

    function runFetch(extraArgs = [], attempt = 1) {
      console.log(`Fetching video info (attempt ${attempt}) with ${ytdlpPath} for URL: ${url}`);
      const args = [...baseArgs];
      // If TikTok and cookies enabled
      if (isTikTokUrl(url) && useTikTokCookies && tiktokCookiesPath && fs.existsSync(tiktokCookiesPath)) {
        console.log('Using TikTok cookies file:', tiktokCookiesPath);
        args.push('--cookies', tiktokCookiesPath);
        // Ensure UA/headers even on attempt 1 if cookies are present
        args.push('--user-agent','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');
        args.push('--add-header','Referer: https://www.tiktok.com/');
        args.push('--add-header','Origin: https://www.tiktok.com');
      }
      args.push(...extraArgs, url);
      const ytdlp = spawn(ytdlpPath, args);
      activeProcesses.push(ytdlp);

      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        ytdlp.kill();
        reject(new Error('Timeout: yt-dlp took too long to respond'));
      }, 30000);

      ytdlp.stdout.on('data', d => stdout += d.toString());
      ytdlp.stderr.on('data', d => { stderr += d.toString(); });
      ytdlp.on('error', err => {
        clearTimeout(timeout);
        reject(new Error(`Error launching yt-dlp: ${err.message}`));
      });
      ytdlp.on('close', code => {
        clearTimeout(timeout);
        if (code === 0 && stdout.trim()) {
          try {
            const videoInfo = JSON.parse(stdout);
            if (!videoInfo.title || !videoInfo.formats) {
              reject(new Error('Invalid video data returned'));
              return;
            }
            let formats = videoInfo.formats.map(format => ({
              formatId: format.format_id,
              formatNote: format.format_note || '',
              filesize: format.filesize,
              ext: format.ext,
              resolution: format.resolution || '',
              height: format.height,
              width: format.width,
              fps: format.fps,
              vcodec: format.vcodec,
              acodec: format.acodec,
              isAudioOnly: format.vcodec === 'none',
              isVideoOnly: format.acodec === 'none',
              tbr: format.tbr || 0,
              abr: format.abr || 0,
              vbr: format.vbr || 0,
            }));
            const targetResolutions = [144, 360, 480, 720, 1080, 1440, 2160];
            const simplifiedVideoFormats = [];
            targetResolutions.forEach(targetRes => {
              let customFormat = null;
              const matchingFormats = formats.filter(f => {
                if (!f.height || f.isAudioOnly) return false;
                const heightDiff = Math.abs(f.height - targetRes);
                return heightDiff / targetRes <= 0.1;
              });
              if (matchingFormats.length) {
                const bestMatchFormat = matchingFormats.sort((a,b)=> b.tbr - a.tbr)[0];
                customFormat = {
                  formatId: `res-${targetRes}`,
                  formatNote: targetRes >= 2160 ? '4K' : targetRes >= 1440 ? '2K' : targetRes >= 1080 ? '1080p HD' : targetRes >= 720 ? '720p HD' : `${targetRes}p`,
                  height: targetRes,
                  width: bestMatchFormat.width,
                  ext: 'mp4',
                  filesize: bestMatchFormat.filesize,
                  isAudioOnly: false,
                  isVideoOnly: false,
                  tbr: bestMatchFormat.tbr,
                  vcodec: bestMatchFormat.vcodec
                };
                simplifiedVideoFormats.push(customFormat);
              }
            });
            simplifiedVideoFormats.sort((a,b)=> a.height - b.height);
            const bestAudioFormat = formats.filter(f=> f.isAudioOnly).sort((a,b)=>(b.abr||0)-(a.abr||0))[0];
            const audioFormats = [
              { formatId:'audio-128', formatNote:'MP3 128kbps', ext:'mp3', isAudioOnly:true, isVideoOnly:false, quality:'Standard Quality', filesize: bestAudioFormat ? Math.round(bestAudioFormat.filesize * 0.5) : null },
              { formatId:'audio-192', formatNote:'MP3 192kbps', ext:'mp3', isAudioOnly:true, isVideoOnly:false, quality:'High Quality', filesize: bestAudioFormat ? Math.round(bestAudioFormat.filesize * 0.75) : null },
              { formatId:'audio-320', formatNote:'MP3 320kbps', ext:'mp3', isAudioOnly:true, isVideoOnly:false, quality:'Best Quality', filesize: bestAudioFormat ? Math.round(bestAudioFormat.filesize * 1.2) : null }
            ];
            const combinedFormats = [...simplifiedVideoFormats, ...audioFormats];
            const bestVideoAny = formats.filter(f=> !f.isAudioOnly && f.height).sort((a,b)=> (b.tbr||0)-(a.tbr||0))[0];
            const bestVideoMp4 = formats.filter(f=> !f.isAudioOnly && f.height && f.ext === 'mp4').sort((a,b)=> (b.tbr||0)-(a.tbr||0))[0];
            const bestAudioAny = formats.filter(f=> f.isAudioOnly).sort((a,b)=> (b.abr||0)-(a.abr||0))[0];
            if(bestVideoMp4 && bestAudioAny) {
              combinedFormats.unshift({
                formatId:'best-mp4',
                formatNote:'Best (MP4)',
                height: bestVideoMp4.height,
                ext:'mp4',
                isAudioOnly:false,
                isVideoOnly:false,
                filesize: (bestVideoMp4.filesize||0) + (bestAudioAny.filesize||0),
                tbr: (bestVideoMp4.tbr||0) + (bestAudioAny.abr||0),
                vcodec: bestVideoMp4.vcodec
              });
            }
            if(bestVideoAny && bestAudioAny) {
              combinedFormats.unshift({
                formatId:'best-any',
                formatNote:'Best (Any Codec)',
                height: bestVideoAny.height,
                ext: bestVideoAny.ext,
                isAudioOnly:false,
                isVideoOnly:false,
                filesize: (bestVideoAny.filesize||0) + (bestAudioAny.filesize||0),
                tbr: (bestVideoAny.tbr||0) + (bestAudioAny.abr||0),
                vcodec: bestVideoAny.vcodec
              });
            }
            resolve({
              id: videoInfo.id,
              title: videoInfo.title,
              description: videoInfo.description,
              thumbnail: videoInfo.thumbnail,
              channel: videoInfo.channel || videoInfo.uploader,
              duration: videoInfo.duration,
              uploadDate: videoInfo.upload_date,
              viewCount: videoInfo.view_count,
              likeCount: videoInfo.like_count,
              formats: combinedFormats
            });
          } catch (e) {
            reject(new Error(`Error parsing video info: ${e.message}`));
          }
        } else {
          const tiktokExtraction = /TikTok].*Unable to extract webpage video data/i.test(stderr);
          if (tiktokExtraction && !attemptedAutoUpdate) {
            console.warn('TikTok extraction failed. Attempting auto-update then retry...');
            attemptedAutoUpdate = true;
            const updater = spawn(ytdlpPath, ['-U']);
            let updOut = '';
            updater.stdout.on('data', d => updOut += d.toString());
            updater.stderr.on('data', d => updOut += d.toString());
            updater.on('close', () => {
              // Retry with desktop UA & headers which sometimes help
              const headerArgs = [
                '--user-agent','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
                '--add-header','Referer: https://www.tiktok.com/',
                '--add-header','Origin: https://www.tiktok.com'
              ];
              runFetch(headerArgs, 2);
            });
          } else if (tiktokExtraction && attemptedAutoUpdate && attempt === 2) {
            reject(new Error('TikTok video extraction failed even after auto-updating yt-dlp. The video layout may have changed. Please try again later or supply TikTok cookies (export from browser) to improve access.'));
          } else {
            const errorMatch = stderr.match(/ERROR:\s*(.*?)(\n|$)/);
            const errorMsg = errorMatch ? errorMatch[1] : 'Unknown error occurred';
            reject(new Error(`Error fetching video info: ${errorMsg}`));
          }
        }
      });
    }

    runFetch();
  });
}

// Helper function to get playlist information using yt-dlp
async function getPlaylistInfo(url) {
  return new Promise((resolve, reject) => {
    // Get yt-dlp path from settings
    const ytdlpPath = store.get('ytdlpPath', 'yt-dlp');
    
    const ytdlp = spawn(ytdlpPath, [
      '--dump-json',
      '--flat-playlist',
      url
    ]);

    let stdout = '';
    let stderr = '';

    ytdlp.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code === 0) {
        try {
          // Each line is a separate JSON object
          const lines = stdout.trim().split('\n');
          const entries = lines.map(line => JSON.parse(line));
          
          // Extract playlist info from the first entry
          const playlistInfo = {
            id: entries[0]?.playlist_id || 'unknown',
            title: entries[0]?.playlist_title || 'Playlist',
            entries: entries.map(entry => ({
              id: entry.id,
              title: entry.title,
              duration: entry.duration,
              thumbnail: entry.thumbnail,
              url: entry.webpage_url || url
            }))
          };

          resolve(playlistInfo);
        } catch (error) {
          reject(`Error parsing playlist info: ${error.message}`);
        }
      } else {
        reject(`Failed to get playlist info: ${stderr}`);
      }
    });
  });
}

// Helper function to download video using yt-dlp
async function downloadVideo(url, format, isAudio, outputPath, progressCallback) {
  emitInitialProgress(progressCallback);
  const ultraRemux = store.get('ultraRemuxMp4', false);
  return new Promise((resolve, reject) => {
    // Get yt-dlp path from settings
    const ytdlpPath = store.get('ytdlpPath', 'yt-dlp');
    
    // Base arguments
    let args = [
      '--newline',
      '--progress',
      '--no-mtime',
      '--no-warnings',  // Reduce noise in output
      '--force-ipv4',   // Avoid IPv6 issues
    ];
    console.log(`Starting download with format: ${format}, isAudio: ${isAudio}`);
    
    // Always add ffmpeg preference for consistent behavior
    args.push('--prefer-ffmpeg');
    
    if (isAudio) {
      // Handle audio downloads with specific bitrates
      if (format === 'audio-128') {
        args.push('-f', 'ba[acodec!=opus]');
        args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '128K');
        console.log('Downloading audio at 128Kbps quality');
      } 
      else if (format === 'audio-192') {
        args.push('-f', 'ba[acodec!=opus]');
        args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '192K');
        console.log('Downloading audio at 192Kbps quality');
      }
      else if (format === 'audio-320') {
        args.push('-f', 'ba[acodec!=opus]');
        args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '320K');
        console.log('Downloading audio at 320Kbps quality');
      }
      else {
        // For any other audio format ID, use it directly and convert to mp3
        args.push('-f', format);
        args.push('--extract-audio', '--audio-format', 'mp3');
        console.log(`Using specific audio format: ${format} and converting to MP3`);
      }
    } else {
      // Video download logic - simplified based on our custom format IDs
      if (format === 'best-any') {
        if (ultraRemux) {
          console.log('Ultra remux enabled: bestvideo+bestaudio -> mp4');
          args.push('-f','bestvideo+bestaudio/best');
          args.push('--merge-output-format','mp4');
        } else {
          console.log('Best any codec without forced remux');
          args.push('-f','bestvideo+bestaudio/best');
        }
      } else if (format === 'best-mp4' || format === 'best') {
        console.log('Selecting best MP4 quality (may remux)');
        args.push('-f','bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best');
        args.push('--merge-output-format','mp4');
      } else if (format === 'ultra-remux') {
        console.log('Explicit ultra-remux selection');
          args.push('-f','bestvideo+bestaudio/best');
          args.push('--merge-output-format','mp4');
      } else if (format && format.startsWith('res-')) {
        const resolution = parseInt(format.replace('res-',''));
        if (!isNaN(resolution)) {
          console.log(`Downloading video at ${resolution}p with audio (codec agnostic)`);
          args.push('-f',`bestvideo[height<=${resolution}]+bestaudio/best[height<=${resolution}]`);
          // Remux only if ultraRemux or user chose mp4-specific resolution? We'll always remux for consistency.
          args.push('--merge-output-format','mp4');
        } else {
          console.log('Resolution parsing failed, using fallback best-any');
          args.push('-f','bestvideo+bestaudio/best');
          if (ultraRemux) args.push('--merge-output-format','mp4');
        }
      } else if (format && !isNaN(parseInt(format))) {
        console.log(`Using specific format ID: ${format} + merging with best audio`);
        args.push('-f',`${format}+bestaudio/best`);
        args.push('--merge-output-format','mp4');
      } else {
        console.log('Defaulting to best-any selector');
        args.push('-f','bestvideo+bestaudio/best');
        if (ultraRemux) args.push('--merge-output-format','mp4');
      }
    }
    
    // Add output path and URL
    args.push('-o', outputPath);
    
    // Thêm tham số --no-playlist để đảm bảo chỉ tải một video, không tải cả playlist
    args.push('--no-playlist');

    // Thêm URL vào cuối
    args.push(url);
    
    console.log('Running yt-dlp with args:', args.join(' '));
    const ytdlp = spawn(ytdlpPath, args);
    
    // Track the process so we can kill it if needed
    activeProcesses.push(ytdlp);

    let stderr = '';
  let totalSize = 0; // bytes
  let downloadedSize = 0; // bytes
  let eta = 0; // seconds
  let speed = 0; // bytes per second
    let isCompleted = false; // Flag to track if download has completed
    
    // Emit initial progress to update UI immediately
    emitInitialProgress(progressCallback);
    
    ytdlp.stdout.on('data', (data) => {
      const output = data.toString();
      const segments = output.split(/\r|\n/).filter(Boolean);
      segments.forEach(line => {
        const downloadMatch = line.match(/(\d+\.\d+)%\s+of\s+~?(\d+\.\d+)([KMG]?i?B)\s+at\s+(\d+\.\d+)([KMG]?i?B)\/s\s+ETA\s+(\d+:\d+)/i);
        const compactMatch = line.match(/(\d+\.\d+)%\s+(\d+\.\d+)([KMG]?i?B)\s+at\s+(\d+\.\d+)([KMG]?i?B)\/s\s+ETA\s+(\d+:\d+)/i);
        const simpleMatch = line.match(/(\d+\.\d+)%\s+(\d+\.\d+)([KMG]?i?B)\s+at\s+(\d+\.\d+)([KMG]?i?B)\/s/i);
        let matched = false;
        if (downloadMatch) {
          matched = true;
          const percent = parseFloat(downloadMatch[1]);
          const totalNum = parseFloat(downloadMatch[2]);
          const totalUnit = downloadMatch[3];
          const speedNum = parseFloat(downloadMatch[4]);
          const speedUnit = downloadMatch[5];
          const etaStr = downloadMatch[6];
          totalSize = convertToBytes(totalNum, totalUnit);
          speed = convertToBytes(speedNum, speedUnit);
          eta = hmsToSeconds(etaStr);
          downloadedSize = (totalSize * percent) / 100;
          progressCallback({ percent, downloaded: downloadedSize, total: totalSize, speedBytes: speed, etaSeconds: eta });
        } else if (compactMatch) {
          matched = true;
          const percent = parseFloat(compactMatch[1]);
          const downloadedNum = parseFloat(compactMatch[2]);
          const downloadedUnit = compactMatch[3];
          const speedNum = parseFloat(compactMatch[4]);
          const speedUnit = compactMatch[5];
          const etaStr = compactMatch[6];
          downloadedSize = convertToBytes(downloadedNum, downloadedUnit);
          speed = convertToBytes(speedNum, speedUnit);
          eta = hmsToSeconds(etaStr);
          progressCallback({ percent, downloaded: downloadedSize, total: totalSize || 0, speedBytes: speed, etaSeconds: eta });
        } else if (simpleMatch) {
          matched = true;
          const percent = parseFloat(simpleMatch[1]);
          const downloadedNum = parseFloat(simpleMatch[2]);
          const downloadedUnit = simpleMatch[3];
          const speedNum = parseFloat(simpleMatch[4]);
          const speedUnit = simpleMatch[5];
          downloadedSize = convertToBytes(downloadedNum, downloadedUnit);
          speed = convertToBytes(speedNum, speedUnit);
          progressCallback({ percent, downloaded: downloadedSize, total: totalSize || 0, speedBytes: speed, etaSeconds: eta });
        }
        if (!matched && /100%/.test(line) && !/ETA/.test(line)) {
          progressCallback({ percent: 100, downloaded: downloadedSize||totalSize, total: totalSize, speedBytes: speed, etaSeconds: 0 });
        }
      });
      // ...existing code...
    });

    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('yt-dlp stderr:', stderr);
    });

    ytdlp.on('close', (code) => {
      console.log(`yt-dlp process exited with code ${code}`);
      
      // Remove process from tracking array
      const index = activeProcesses.indexOf(ytdlp);
      if (index !== -1) {
        activeProcesses.splice(index, 1);
      }
      
      // Kiểm tra nếu quá trình đã hoàn tất (nhận diện từ output) hoặc code=0
      if (isCompleted || code === 0) {
        console.log('Download completed successfully. Resolving promise...');
        // Emit renderer event for completion
        if (mainWindow) {
          mainWindow.webContents.send('download-complete', { filePath: outputPath, url });
        }
        resolve({ success: true, filePath: outputPath });
      } else {
        // Parse error message to provide more useful information
        let errorMessage = "Download failed";
        
        if (stderr.includes("HTTP Error 403: Forbidden")) {
          errorMessage = "Access forbidden - this video may be private or region-restricted";
        } else if (stderr.includes("Unable to extract")) {
          errorMessage = "Unable to extract video information - this URL may be unsupported";
        } else if (stderr.includes("not be downloaded")) {
          errorMessage = "This video cannot be downloaded due to platform restrictions";
        } else if (stderr.includes("requested format not available")) {
          errorMessage = "The requested video format is not available - try a different quality option";
        } else if (stderr.includes("Unable to download")) {
          errorMessage = "Unable to download the video - possibly due to platform restrictions";
        } else if (stderr) {
          // Extract the most relevant part of the error
          const errorLines = stderr.split('\n').filter(line => line.includes('ERROR'));
          if (errorLines.length > 0) {
            errorMessage = errorLines[0].replace('ERROR:', '').trim();
          } else {
            errorMessage = `Download failed: ${stderr.substring(0, 150)}...`;
          }
        }
        
        console.error('Download error details:', stderr);
        reject(errorMessage);
      }
    });
      ytdlp.on('error', (error) => {
      console.error('Process error:', error);
      reject(`Failed to start download process: ${error.message}`);
    });
  });
}

/**
 * Clean up all application data
 * This is called during uninstallation to remove all data files
 */
async function cleanupAppData() {
  return new Promise(async (resolve, reject) => {
    try {
      // Get the app data directory paths
      const storeDir = app.getPath('userData');
      
      console.log(`Cleaning up app data from: ${storeDir}`);
      
      // Delete all files in the app data directory
      if (fs.existsSync(storeDir)) {
        // Read all files
        const files = fs.readdirSync(storeDir);
        
        // Delete each file
        for (const file of files) {
          const filePath = path.join(storeDir, file);
          try {
            // Check if it's a directory or file
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
              // Remove directory recursively
              fs.rmdirSync(filePath, { recursive: true });
            } else {
              // Remove file
              fs.unlinkSync(filePath);
            }
            
            console.log(`Deleted: ${filePath}`);
          } catch (err) {
            console.error(`Failed to delete ${filePath}:`, err);
          }
        }
      }
      
      // Clear any registry entries for auto-start (Windows only)
      if (process.platform === 'win32') {
        try {
          app.setLoginItemSettings({ openAtLogin: false });
          console.log('Removed login item settings');
        } catch (err) {
          console.error('Error removing login item settings:', err);
        }
      }
      
      resolve();
    } catch (error) {
      console.error('Cleanup error:', error);
      reject(error);
    }
  });
}

// IPC handler: download-thumbnail
ipcMain.handle('download-thumbnail', async (event, { url, title }) => {
  try {
    const ytdlpPath = store.get('ytdlpPath', 'yt-dlp');
    // We will fetch metadata quickly to extract best thumbnail if URL provided
    let thumbnailUrl = null;
    if (url) {
      try {
        const meta = await new Promise((resolve, reject) => {
          const p = spawn(ytdlpPath, ['--dump-json','--skip-download','--no-warnings', url]);
          let out=''; let err='';
          p.stdout.on('data', d=> out += d.toString());
            p.stderr.on('data', d=> err += d.toString());
          p.on('close', c=> {
            if (c===0) {
              try { resolve(JSON.parse(out)); } catch(e){ reject(e);}  
            } else reject(new Error(err||'Failed to fetch metadata'));
          });
        });
        if (meta) {
          if (meta.thumbnails && meta.thumbnails.length) {
            thumbnailUrl = [...meta.thumbnails].sort((a,b)=> (b.height||0)-(a.height||0))[0].url;
          } else if (meta.thumbnail) {
            thumbnailUrl = meta.thumbnail;
          }
        }
      } catch(metaErr) {
        console.warn('Thumbnail metadata fetch failed, will try direct field:', metaErr.message);
      }
    }
    if (!thumbnailUrl) throw new Error('No thumbnail URL available');

    const saveFolder = store.get('saveFolder', app.getPath('downloads'));
    const safeTitle = (title||'thumbnail').replace(/[\\\/:*?"<>|]/g,'_').slice(0,100);
    // Determine extension from URL
    const extMatch = thumbnailUrl.match(/\.([a-zA-Z0-9]{3,4})(?:$|[?&#])/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const fileName = `${safeTitle}_thumbnail.${ext}`;
    const destPath = path.join(saveFolder, fileName);

    const res = await fetch(thumbnailUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(arrayBuf));

    return { success: true, path: destPath };
  } catch (err) {
    return { success:false, error: err.message };
  }
});

function emitInitialProgress(progressCallback) {
  progressCallback({ percent: 0, downloaded: 0, total: 0, speedBytes: 0, etaSeconds: 0, initializing: true });
}
