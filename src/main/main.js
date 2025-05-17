const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
// Import electron-store correctly
const Store = require('electron-store').default || require('electron-store');
// Import autoUpdater
const { autoUpdater } = require('electron-updater');

// Initialize stores
const store = new Store();
const historyStore = new Store({ name: 'history' });

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

let mainWindow;

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../renderer/assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Configure auto-updater
function configureAutoUpdater() {
  // Disable auto downloading of updates
  autoUpdater.autoDownload = false;
  
  // Send update-related events to renderer
  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('update-status', 'checking');
  });
  
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-status', 'available', info);
  });
  
  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-status', 'not-available');
  });
  
  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update-status', 'error', err.toString());
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('update-status', 'progress', progressObj);
  });
  
  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-status', 'downloaded');
    // Show prompt to install update
    dialog.showMessageBox({
      type: 'info',
      title: 'Cập nhật mới',
      message: 'Đã tải xong bản cập nhật. Bạn có muốn cài đặt và khởi động lại ứng dụng ngay?',
      buttons: ['Cài đặt', 'Để sau']
    }).then(({ response }) => {
      if (response === 0) {
        // Quit and install update
        autoUpdater.quitAndInstall();
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
  
  // Check for updates every hour
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60 * 60 * 1000);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Set default save folder if not exist
  if (!store.has('saveFolder')) {
    store.set('saveFolder', app.getPath('downloads'));
  }
  
  // Set yt-dlp path if not exists
  if (!store.has('ytdlpPath')) {
    // Use bundled yt-dlp if it exists, otherwise assume it's in PATH
    const bundledPath = path.join(process.resourcesPath, 'bin', `yt-dlp${process.platform === 'win32' ? '.exe' : ''}`);
    
    if (fs.existsSync(bundledPath)) {
      store.set('ytdlpPath', bundledPath);
    } else {
      store.set('ytdlpPath', `yt-dlp${process.platform === 'win32' ? '.exe' : ''}`);
    }
  }
});

// App window close event
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('check-ytdlp', async () => {
  const ytdlpPath = store.get('ytdlpPath', 'yt-dlp');
  
  return new Promise((resolve) => {
    const ytdlp = spawn(ytdlpPath, ['--version']);
    
    ytdlp.on('error', () => {
      resolve({ installed: false });
    });
    
    ytdlp.stdout.on('data', (data) => {
      const version = data.toString().trim();
      resolve({ installed: true, version });
    });
    
    ytdlp.on('close', (code) => {
      if (code !== 0) {
        resolve({ installed: false });
      }
    });
  });
});

ipcMain.handle('get-video-info', async (event, url) => {
  return await getVideoInfo(url);
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
    skipVersion: store.get('skipVersion', null)
  };
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('autoFetch', settings.autoFetch);
  store.set('autoPaste', settings.autoPaste);
  store.set('autoUpdate', settings.autoUpdate);
  
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
  autoUpdater.checkForUpdates();
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
