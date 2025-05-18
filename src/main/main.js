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
    autoFetchInfo: store.get('autoFetchInfo', true)
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
  
  // Handle theme settings
  if (settings.theme !== undefined)
    store.set('theme', settings.theme);
  
  // Handle optional fields if they exist
  if (settings.lastUpdateCheck !== undefined) 
    store.set('lastUpdateCheck', settings.lastUpdateCheck);
  
  if (settings.skipVersion !== undefined) 
    store.set('skipVersion', settings.skipVersion);
  
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
  });
}

// Helper function to get video information using yt-dlp
async function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    // Get yt-dlp path from settings
    const ytdlpPath = store.get('ytdlpPath', 'yt-dlp');
    
    console.log(`Fetching video info with ${ytdlpPath} for URL: ${url}`);
    
    // Use additional parameters to make the fetch more reliable
    const ytdlp = spawn(ytdlpPath, [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--no-call-home',
      '--skip-download',
      '--force-ipv4',
      url
    ]);
    
    // Track the process so we can kill it if needed
    activeProcesses.push(ytdlp);

    let stdout = '';
    let stderr = '';
    
    // Set timeout to avoid hanging
    const timeout = setTimeout(() => {
      ytdlp.kill();
      reject(new Error('Timeout: yt-dlp took too long to respond'));
    }, 30000); // 30 seconds timeout

    ytdlp.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('yt-dlp stderr:', stderr);
    });
    
    ytdlp.on('error', (error) => {
      clearTimeout(timeout);
      console.error('Error spawning yt-dlp:', error);
      reject(new Error(`Error launching yt-dlp: ${error.message}`));
    });

    ytdlp.on('close', (code) => {
      clearTimeout(timeout);      if (code === 0 && stdout.trim()) {
        try {
          // Log for debugging
          console.log('yt-dlp output received, length:', stdout.length);
          
          const videoInfo = JSON.parse(stdout);
          console.log('Video info parsed successfully');
          
          // Validate essential video information
          if (!videoInfo.title || !videoInfo.formats) {
            console.error('Missing essential video info');
            reject(new Error('Invalid video data returned'));
            return;
          }
            // Log all available formats for debugging
          console.log('Available formats:', JSON.stringify(videoInfo.formats.map(f => ({
            id: f.format_id,
            ext: f.ext,
            res: f.height,
            note: f.format_note,
            vcodec: f.vcodec,
            acodec: f.acodec
          })), null, 2));          // Extract and clean up formats
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
            tbr: format.tbr || 0,  // Total bitrate
            abr: format.abr || 0,  // Audio bitrate
            vbr: format.vbr || 0,  // Video bitrate
          }));
          
          console.log('Cleaned formats:', formats.length);
          
          // We only want exactly these standard resolutions
          const targetResolutions = [144, 360, 480, 720, 1080, 1440, 2160];
          
          // Create simplified video formats (one per resolution)
          const simplifiedVideoFormats = [];
          
          // Process each target resolution
          targetResolutions.forEach(targetRes => {
            // For each resolution, we'll create a custom format entry that will use our download logic
            let customFormat = null;
            
            // Find formats that are close to our target resolution (within 10%)
            const matchingFormats = formats.filter(format => {
              if (!format.height || format.isAudioOnly) return false;
              const heightDiff = Math.abs(format.height - targetRes);
              return heightDiff / targetRes <= 0.1; // Within 10% of target
            });
            
            // Check if we have any matching format at this resolution
            if (matchingFormats.length > 0) {
              // Find a representative format to use for display info
              const bestMatchFormat = matchingFormats.sort((a, b) => {
                // Prefer formats with higher bitrate
                return b.tbr - a.tbr;
              })[0];
              
              // Create a custom format that will be handled specially in our download function
              customFormat = {
                formatId: `res-${targetRes}`, // Special format ID for our custom handling
                formatNote: targetRes >= 2160 ? '4K' : 
                            targetRes >= 1440 ? '2K' :
                            targetRes >= 1080 ? '1080p HD' :
                            targetRes >= 720 ? '720p HD' :
                            `${targetRes}p`,
                height: targetRes,
                width: bestMatchFormat.width,
                ext: 'mp4',  // Always MP4
                filesize: bestMatchFormat.filesize,
                isAudioOnly: false,
                isVideoOnly: false,
                tbr: bestMatchFormat.tbr,
                vcodec: bestMatchFormat.vcodec
              };
              
              simplifiedVideoFormats.push(customFormat);
            }
          });
          
          // Sort by resolution (ascending)
          simplifiedVideoFormats.sort((a, b) => a.height - b.height);
          
          // These are our simplified formats that will be shown to the user and handled specially
          
          // Find best audio format for reference quality
          const bestAudioFormat = formats.filter(f => f.isAudioOnly)
            .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];
            
          const bestAudioBitrate = bestAudioFormat ? bestAudioFormat.abr || 0 : 0;
          console.log(`Best available audio bitrate: ${bestAudioBitrate}kbps`);
          
          // Add simplified audio options (always converted to MP3)
          const audioFormats = [
            {
              formatId: 'audio-128',
              formatNote: 'MP3 128kbps',
              ext: 'mp3', 
              isAudioOnly: true,
              isVideoOnly: false,
              quality: 'Standard Quality',
              filesize: bestAudioFormat ? Math.round(bestAudioFormat.filesize * 0.5) : null
            },
            {
              formatId: 'audio-192',
              formatNote: 'MP3 192kbps',
              ext: 'mp3',
              isAudioOnly: true,
              isVideoOnly: false,
              quality: 'High Quality',
              filesize: bestAudioFormat ? Math.round(bestAudioFormat.filesize * 0.75) : null
            },
            {
              formatId: 'audio-320',
              formatNote: 'MP3 320kbps',
              ext: 'mp3',
              isAudioOnly: true,
              isVideoOnly: false,
              quality: 'Best Quality',
              filesize: bestAudioFormat ? Math.round(bestAudioFormat.filesize * 1.2) : null
            }
          ];
          
          // Combine simplified video formats with audio formats
          const combinedFormats = [...simplifiedVideoFormats, ...audioFormats];          resolve({
            id: videoInfo.id,
            title: videoInfo.title,
            description: videoInfo.description,
            thumbnail: videoInfo.thumbnail,
            channel: videoInfo.channel || videoInfo.uploader,
            duration: videoInfo.duration,
            uploadDate: videoInfo.upload_date,
            viewCount: videoInfo.view_count,
            likeCount: videoInfo.like_count,
            formats: combinedFormats // Use our simplified formats instead of raw formats
          });} catch (error) {
          console.error('Error parsing JSON:', error);
          console.error('Raw stdout output:', stdout.substring(0, 500) + '...');
          reject(new Error(`Error parsing video info: ${error.message}`));
        }
      } else {
        // Log the error details
        console.error(`yt-dlp exited with code ${code}`);
        console.error('stderr:', stderr);
        console.error('stdout:', stdout);
        
        // Try to extract a meaningful error message
        const errorMatch = stderr.match(/ERROR:\s*(.*?)(\n|$)/);
        const errorMsg = errorMatch ? errorMatch[1] : 'Unknown error occurred';
        
        reject(new Error(`Error fetching video info: ${errorMsg}`));
      }
    });
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
      if (format && format.startsWith('res-')) {
        // This is our custom resolution format (e.g., res-720)
        const resolution = parseInt(format.replace('res-', ''));
        
        if (!isNaN(resolution)) {
          console.log(`Downloading video at ${resolution}p with audio`);
          // Sử dụng format selector đơn giản hơn và tránh codec Opus
          args.push('-f', `bv*[height<=${resolution}][ext=mp4][vcodec!*=av01]+ba[ext=m4a][acodec!=opus]/b[height<=${resolution}]`);
        } else {
          // Fallback if parsing failed
          console.log('Resolution parsing failed, using default selector');
          args.push('-f', 'bv*[ext=mp4]+ba[ext=m4a][acodec!=opus]/b');
        }
      } else if (format === 'best') {
        // This is our "Best Quality" option
        console.log('Using best quality video and audio');
        args.push('-f', 'bv*[ext=mp4][vcodec!*=av01]+ba[ext=m4a][acodec!=opus]/b');
      } else if (format && !isNaN(parseInt(format))) {
        // This is a direct format ID from YouTube
        console.log(`Using specific format ID: ${format} + merging with best audio`);
        // Even with specific format, we still want to ensure it has audio
        args.push('-f', `${format}+ba[ext=m4a][acodec!=opus]/b`);
      } else {
        // Default format selector for videos if no valid format is specified
        console.log('Using default video format selector');
        args.push('-f', 'bv*[ext=mp4]+ba[ext=m4a][acodec!=opus]/b');
      }
      
      // Always ensure we get an MP4 as the final result for videos
      args.push('--merge-output-format', 'mp4');
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
    let totalSize = 0;
    let downloadedSize = 0;
    let eta = '';
    let speed = '';    
    let isCompleted = false; // Flag to track if download has completed
    
    ytdlp.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('yt-dlp output:', output);
      
      // Detect completion pattern when merging is done
      if (output.includes("Deleting original file") || output.includes("has already been downloaded") ||
          output.includes("100% of") && output.includes("in 00:")) {
        isCompleted = true;
      }
      
      // Parse progress information from yt-dlp output (improved regex to catch more formats)
      const downloadMatch = output.match(/(\d+\.\d+)%\s+of\s+~?(\d+\.\d+)(\w+)\s+at\s+(\d+\.\d+)(\w+\/s)\s+ETA\s+(\d+:\d+)/);
      if (downloadMatch) {
        const percent = parseFloat(downloadMatch[1]);
        totalSize = parseFloat(downloadMatch[2]);
        const totalSizeUnit = downloadMatch[3]; 
        speed = `${downloadMatch[4]}${downloadMatch[5]}`;
        eta = downloadMatch[6];
        
        downloadedSize = (totalSize * percent) / 100;
        
        // Send progress update immediately
        progressCallback({
          percent,
          downloaded: downloadedSize,
          total: totalSize,
          unit: totalSizeUnit,
          speed,
          eta
        });
        
        // Mark as completed if we reach 100%
        if (percent >= 100) {
          isCompleted = true;
        }
      }
      
      // Alternative progress format
      const altMatch = output.match(/(\d+\.\d+)%\s+(\d+\.\d+)(.)iB\s+(\d+\.\d+)(.)iB\/s\s+in\s+(\d+:\d+)/);
      if (altMatch) {
        const percent = parseFloat(altMatch[1]);
        downloadedSize = parseFloat(altMatch[2]);
        const downloadUnit = `${altMatch[3]}iB`;
        speed = `${altMatch[4]}${altMatch[5]}iB/s`;
        
        // Send progress update immediately
        progressCallback({
          percent,
          downloaded: downloadedSize,
          total: totalSize || 100, // If total is unknown, use placeholder
          unit: downloadUnit,
          speed,
          eta
        });
      }
      
      // Add more alternative pattern for recent yt-dlp versions
      const newFormatMatch = output.match(/(\d+\.\d+)%\s+\[(\w+)\]\s+(\d+\.\d+)(\w+)\s+of\s+~?(\d+\.\d+)(\w+)\s+at\s+(\d+\.\d+)(\w+\/s)\s+ETA\s+(\d+:\d+)/);
      if (newFormatMatch) {
        const percent = parseFloat(newFormatMatch[1]);
        downloadedSize = parseFloat(newFormatMatch[3]);
        const downloadUnit = newFormatMatch[4];
        totalSize = parseFloat(newFormatMatch[5]);
        const totalSizeUnit = newFormatMatch[6];
        speed = `${newFormatMatch[7]}${newFormatMatch[8]}`;
        eta = newFormatMatch[9];
        
        // Send progress update immediately
        progressCallback({
          percent,
          downloaded: downloadedSize,
          total: totalSize,
          unit: totalSizeUnit,
          speed,
          eta
        });
      }
      
      // Extract any progress from merging/muxing operations
      const mergeMatch = output.match(/(\d+\.\d+)%/);
      if (mergeMatch && !downloadMatch && !altMatch && !newFormatMatch) {
        const percent = parseFloat(mergeMatch[1]);
        
        // For merging operations, we might not have size information
        progressCallback({
          percent,
          downloaded: downloadedSize || 0,
          total: totalSize || 100,
          unit: 'MB',
          speed: 'Merging...',
          eta: '...'
        });
      }
      
      // Check for "already exists" message, which isn't an error
      if (output.includes("already exists") && output.includes("not overwriting")) {
        console.log("File already exists - not an error");
      }
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
        resolve({
          success: true,
          filePath: outputPath
        });
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
