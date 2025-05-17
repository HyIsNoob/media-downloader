// Import modules
import { DownloadManager } from './modules/download-manager.js';
import { UIManager } from './modules/ui-manager.js';
import { HistoryManager } from './modules/history-manager.js';
import { Settings } from './modules/settings.js';
import { PlaylistManager } from './modules/playlist-manager.js';

// Update status variables
let updateAvailable = false;
let updateInfo = null;

// Function to show notifications
function showNotification(message, type = 'info') {
  // Create notification element if it doesn't exist
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';
    document.body.appendChild(notification);
    
    // Add styles if they don't exist
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 15px 20px;
          border-radius: 5px;
          color: white;
          font-weight: 500;
          z-index: 9999;
          max-width: 300px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          transition: opacity 0.3s ease;
          opacity: 0;
        }
        .notification.show {
          opacity: 1;
        }
        .notification.info {
          background-color: #2196F3;
        }
        .notification.success {
          background-color: #4CAF50;
        }
        .notification.warning {
          background-color: #FF9800;
        }
        .notification.error {
          background-color: #F44336;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Set notification content and type
  notification.textContent = message;
  notification.className = 'notification ' + type;
  
  // Show notification
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Hide notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize managers
  const downloadManager = new DownloadManager();
  const uiManager = new UIManager();
  const historyManager = new HistoryManager();
  const settingsManager = new Settings();
  const playlistManager = new PlaylistManager();

  // Initialize UI
  uiManager.init();
    // Load settings
  settingsManager.loadSettings().then(() => {
    // Auto-paste URL if enabled
    if (settingsManager.settings.autoPaste) {
      tryReadClipboard();
    }
    
    // Update app version display
    const appVersionElement = document.getElementById('appVersion');
    if (appVersionElement) {
      appVersionElement.textContent = `v${settingsManager.getAppVersion()}`;
    }
    
    // Set up auto update checkbox
    const autoUpdateCheckbox = document.getElementById('autoUpdate');
    if (autoUpdateCheckbox) {
      autoUpdateCheckbox.checked = settingsManager.settings.autoUpdate !== false;
    }
    
  // Set up clipboard polling if auto-paste is enabled
    if (settingsManager.settings.autoPaste) {
      let lastClipboardContent = '';
        // Check clipboard every 2 seconds when app is in foreground
      const clipboardInterval = setInterval(() => {
        navigator.clipboard.readText()
          .then(text => {
            // Only process if content changed
            if (text !== lastClipboardContent) {
              lastClipboardContent = text;
              
              // Check if it's a valid URL (regardless of whether it's supported)
              if (text && text.match(/^https?:\/\//i)) {
                // Only proceed if URL is from YouTube, Facebook, or TikTok
                if (isValidURL(text)) {
                  console.log('Valid URL detected in clipboard:', text);
                  const urlInput = document.getElementById('urlInput');
                  urlInput.value = text;
                  showNotification('URL detected and pasted', 'success');
                  
                  // Auto-fetch if enabled
                  if (settingsManager.settings.autoFetch) {
                    document.getElementById('fetchBtn').click();
                  }
                } else {
                  // It's a URL, but not supported
                  console.log('Unsupported URL in clipboard:', text);
                  showNotification('Unsupported URL. Only YouTube, Facebook, and TikTok are supported', 'warning');
                }
              }
            }
          })
          .catch(err => console.error('Failed to read clipboard: ', err));
      }, 2000);
      
      // Store interval ID for cleanup if needed
      window.clipboardInterval = clipboardInterval;
    }
  });

  // Update save folder display
  updateSaveFolderDisplay();

  // Load history
  historyManager.loadHistory().then(() => {
    renderHistory();
  });

  // Helper function for checking valid video URLs
function isValidURL(url) {
  // Check if it's a URL
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    
    // Check for supported video platforms
    const supportedDomains = [
      'youtube.com', 'youtu.be',
      'facebook.com', 'fb.com', 'fb.watch',
      'tiktok.com'
    ];
    
    return supportedDomains.some(domain => urlObj.hostname.includes(domain));
  } catch (e) {
    return false;
  }
}

// Helper function to try reading from clipboard
function tryReadClipboard() {
  navigator.clipboard.readText()
    .then(text => {
      const urlInput = document.getElementById('urlInput');
      if (isValidURL(text)) {
        urlInput.value = text;
        showNotification('URL detected and pasted', 'success');
        // Auto-fetch if enabled
        if (settingsManager.settings.autoFetch) {
          document.getElementById('fetchBtn').click();
        }
      } else if (text && text.match(/^https?:\/\//i)) {
        // It's a URL but not supported
        showNotification('Unsupported URL. Only YouTube, Facebook, and TikTok are supported', 'warning');
      }
    })
    .catch(err => console.error('Failed to read clipboard: ', err));
}

// Set up navigation
  document.querySelectorAll('.nav-link').forEach(navItem => {
    navItem.addEventListener('click', function(event) {
      event.preventDefault();
      const targetPage = this.getAttribute('data-page');
      uiManager.showPage(targetPage);
      
      // Refresh history data when navigating to history page
      if (targetPage === 'history') {
        renderHistory();
      }
    });
  });

  // Set up URL input and fetch button
  const urlInput = document.getElementById('urlInput');
  const fetchBtn = document.getElementById('fetchBtn');
  
  urlInput.addEventListener('paste', function(event) {
    // Auto-fetch when URL is pasted, if enabled
    setTimeout(() => {
      if (settingsManager.settings.autoFetch && isValidURL(this.value)) {
        fetchBtn.click();
      }
    }, 100);
  });  fetchBtn.addEventListener('click', function() {
    const url = urlInput.value.trim();
    
    if (!url) {
      showNotification('Please enter a valid URL', 'error');
      return;
    }
    
    if (!isValidURL(url)) {
      showNotification('Only YouTube, Facebook, and TikTok URLs are supported', 'error');
      return;
    }
    
    // Show loading state
    this.disabled = true;
    this.innerHTML = '<span class="spinner"></span> Loading...';
    
    // Reset UI
    uiManager.resetFormatSelection();
    
    // Get video info with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout fetching video info. Please check your connection.')), 30000);
    });
    
    // Try to fetch with timeout protection
    Promise.race([downloadManager.getVideoInfo(url), timeoutPromise])
      .then(info => {
        if (!info || !info.formats || info.formats.length === 0) {
          throw new Error('No valid formats found for this video');
        }
        
        // Log for debugging
        console.log('Video info received:', info);
        
        // Update UI with video info
        uiManager.displayVideoInfo(info);
        
        // Prepare format selection
        uiManager.displayFormatOptions(info.formats);
        
        // Enable download button when a format is selected
        document.querySelectorAll('.format-item').forEach(item => {
          item.addEventListener('click', function() {
            uiManager.selectFormat(this);
            document.getElementById('downloadBtn').disabled = false;
          });
        });
      })      .catch(error => {
        console.error('Error fetching video info:', error);
        showNotification(`Failed to fetch video info: ${error.message || 'Unknown error'}`, 'error');
      })
      .finally(() => {
        // Reset button state
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-search me-1"></i> Get Info';
      });
  });

  // Set up download button
  const downloadBtn = document.getElementById('downloadBtn');
  
  downloadBtn.addEventListener('click', function() {
    const url = urlInput.value.trim();
    const selectedFormat = document.querySelector('.format-item.selected');
    
    if (!selectedFormat) {
      alert('Please select a format');
      return;
    }
    
    const formatId = selectedFormat.getAttribute('data-format-id');
    const isAudio = selectedFormat.getAttribute('data-is-audio') === 'true';
    const videoInfo = uiManager.getCurrentVideoInfo();
    
    // Show progress UI
    uiManager.showDownloadProgress();
      // Get save folder
    window.electronAPI.getSaveFolder().then(saveFolder => {
      // Get quality label from selected format
      const qualityLabel = selectedFormat.querySelector('.format-name').textContent.trim().replace(/\s+/g, '_');
      
      // Create output path with quality included in filename
      let filename = videoInfo.title.replace(/[\\/:*?"<>|]/g, '_');
      const ext = isAudio ? 'mp3' : 'mp4';
      let outputPath = `${saveFolder}/${filename}_${qualityLabel}.${ext}`;
      
      // Check if file already exists and handle duplicates
      window.electronAPI.checkFileExists(outputPath).then(exists => {
        if (exists) {
          // Add timestamp to avoid overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          outputPath = `${saveFolder}/${filename}_${qualityLabel}_${timestamp}.${ext}`;
          showNotification('File already exists. Adding timestamp to filename.', 'info');
        }
        
        // Start download
        downloadManager.downloadVideo({
        url,
        format: formatId,
        isAudio,
        outputPath
      })
        .then(result => {          // Add to history
          historyManager.addToHistory({
            title: videoInfo.title,
            url: url,
            thumbnail: videoInfo.thumbnail,
            outputPath: outputPath,
            quality: selectedFormat.querySelector('.format-name').textContent,
            isAudio: isAudio,
            downloadedAt: new Date().toISOString()
          });
          
          // Show success message
          alert('Download completed successfully!');
          
          // Always update the history after download completes
          renderHistory();
          
          // Show notification about successful download
          showNotification('Download completed successfully! History updated.', 'success');
        })      .catch(error => {
          console.error('Download error:', error);
          showNotification(`Download failed: ${error}`, 'error');        })
        .finally(() => {
          // Hide progress UI
          uiManager.hideDownloadProgress();
        });
      });
    });
  });

  // Set up change folder buttons
  document.getElementById('changeFolderBtn').addEventListener('click', changeDownloadFolder);
  document.getElementById('settingsChangeFolderBtn').addEventListener('click', changeDownloadFolder);

  // Set up settings
  document.getElementById('saveSettingsBtn').addEventListener('click', function() {
    const autoFetch = document.getElementById('autoFetch').checked;
    const autoPaste = document.getElementById('autoPaste').checked;
    const autoUpdate = document.getElementById('autoUpdate').checked;
    
    settingsManager.updateSettings({
      autoFetch,
      autoPaste,
      autoUpdate
    }).then(() => {
      showNotification('Settings saved successfully!', 'success');
    });
  });
  
  // Set up check for updates button
  document.getElementById('checkUpdatesBtn').addEventListener('click', function() {
    this.disabled = true;
    this.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Checking...';
    
    window.electronAPI.checkForUpdates();
    
    // Re-enable after 3 seconds
    setTimeout(() => {
      this.disabled = false;
      this.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Check for Updates';
    }, 3000);
  });

  // Set up clear history button
  document.getElementById('clearHistoryBtn').addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all download history?')) {
      historyManager.clearHistory().then(() => {
        renderHistory();
      });
    }
  });

  // Set up playlist functionality
  document.getElementById('fetchPlaylistBtn').addEventListener('click', function() {
    const url = document.getElementById('playlistUrlInput').value.trim();
    
    if (!url) {
      alert('Please enter a valid playlist URL');
      return;
    }
    
    // Show loading state
    this.disabled = true;
    this.innerHTML = '<span class="spinner"></span> Loading...';
    
    playlistManager.getPlaylistInfo(url)
      .then(playlist => {
        // Display playlist info
        uiManager.displayPlaylistInfo(playlist);
        
        // Set up select all button
        document.getElementById('selectAllBtn').addEventListener('click', function() {
          const checkboxes = document.querySelectorAll('.playlist-item-checkbox');
          const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
          
          checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
          });
          
          // Update button text
          this.textContent = allChecked ? 'Select All' : 'Deselect All';
        });
        
        // Set up download selected button
        document.getElementById('downloadSelectedBtn').addEventListener('click', async function() {
          const selectedCheckboxes = document.querySelectorAll('.playlist-item-checkbox:checked');
          
          if (selectedCheckboxes.length === 0) {
            alert('Please select at least one video to download');
            return;
          }
          
          // Get selected items from the playlist
          const playlist = playlistManager.getCurrentPlaylist();
          const selectedItems = Array.from(selectedCheckboxes).map(checkbox => {
            const index = parseInt(checkbox.getAttribute('data-index'));
            return playlist.entries[index];
          });
          
          // Show download quality selection dialog
          const format = await showPlaylistFormatSelection();
          if (!format) return; // User cancelled
          
          // Get save folder
          const saveFolder = await window.electronAPI.getSaveFolder();
          
          // Show progress UI
          uiManager.showDownloadProgress();
          document.getElementById('downloadProgress').querySelector('h5').textContent = 
            `Downloading ${selectedItems.length} videos from playlist...`;
          
          // Disable download button to prevent multiple clicks
          this.disabled = true;
          this.innerHTML = '<span class="spinner"></span> Downloading...';
          
          // Start download
          try {
            const results = await playlistManager.downloadMultipleItems(
              selectedItems, 
              format.formatId, 
              format.isAudio, 
              saveFolder
            );
            
            // Add all successfully downloaded items to history
            for (const item of results.items) {
              if (item.success) {
                await historyManager.addToHistory({
                  title: item.title,
                  url: selectedItems[item.index].url,
                  thumbnail: selectedItems[item.index].thumbnail,
                  outputPath: item.outputPath,
                  quality: format.isAudio ? 'Audio' : 'Video',
                  isAudio: format.isAudio,
                  downloadedAt: new Date().toISOString()
                });
              }
            }
            
            // Show success message
            showNotification(`Downloaded ${results.completed} out of ${results.total} videos. Failed: ${results.failed}`, 
                            results.failed === 0 ? 'success' : 'warning');
            
            // Update history
            renderHistory();
          } catch (error) {
            console.error('Error downloading playlist:', error);
            showNotification(`Failed to download playlist: ${error.message}`, 'error');
          } finally {
            // Hide progress UI
            uiManager.hideDownloadProgress();
            
            // Reset download button
            this.disabled = false;
            this.innerHTML = 'Download Selected';
          }
        });
        
        // Set up individual download buttons
        document.querySelectorAll('.download-playlist-item').forEach(button => {
          button.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const index = parseInt(this.getAttribute('data-index'));
            const qualityOption = this.getAttribute('data-quality');
            const item = playlistManager.getCurrentPlaylist().entries[index];
            
            // Convert quality option to actual format
            let format, isAudio;
            if (qualityOption === 'audio') {
              format = 'audio-320';
              isAudio = true;
            } else if (qualityOption === '720p') {
              format = 'res-720';
              isAudio = false;
            } else {
              format = 'best';
              isAudio = false;
            }
            
            // Get save folder
            const saveFolder = await window.electronAPI.getSaveFolder();
            
            // Create output path
            const filename = item.title.replace(/[\\/:*?"<>|]/g, '_');
            const ext = isAudio ? 'mp3' : 'mp4';
            const outputPath = `${saveFolder}/${filename}.${ext}`;
            
            // Show progress UI
            uiManager.showDownloadProgress();
            document.getElementById('downloadProgress').querySelector('h5').textContent = 
              `Downloading: ${item.title}`;
            
            try {
              // Start download
              const result = await playlistManager.downloadPlaylistItem({
                url: item.url,
                index: index,
                format: format,
                isAudio: isAudio,
                outputPath: outputPath
              });
              
              // Add to history
              await historyManager.addToHistory({
                title: item.title,
                url: item.url,
                thumbnail: item.thumbnail,
                outputPath: outputPath,
                quality: isAudio ? 'Audio' : qualityOption,
                isAudio: isAudio,
                downloadedAt: new Date().toISOString()
              });
              
              // Show success message
              showNotification(`Downloaded: ${item.title}`, 'success');
              
              // Update history
              renderHistory();
            } catch (error) {
              console.error('Error downloading playlist item:', error);
              showNotification(`Failed to download: ${error.message}`, 'error');
            } finally {
              // Hide progress UI
              uiManager.hideDownloadProgress();
            }
          });
        });
      })
      .catch(error => {
        console.error('Error fetching playlist:', error);
        alert(`Failed to fetch playlist: ${error}`);
      })
      .finally(() => {
        // Reset button state
        this.disabled = false;
        this.innerHTML = 'Get Playlist';
      });
  });

  // Helper function to show format selection dialog for playlist downloads
  async function showPlaylistFormatSelection() {
    return new Promise((resolve) => {
      // Create dialog element
      const dialogOverlay = document.createElement('div');
      dialogOverlay.className = 'modal-overlay';
      dialogOverlay.style.position = 'fixed';
      dialogOverlay.style.top = 0;
      dialogOverlay.style.left = 0;
      dialogOverlay.style.width = '100%';
      dialogOverlay.style.height = '100%';
      dialogOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
      dialogOverlay.style.zIndex = 9999;
      dialogOverlay.style.display = 'flex';
      dialogOverlay.style.justifyContent = 'center';
      dialogOverlay.style.alignItems = 'center';
      
      const dialog = document.createElement('div');
      dialog.className = 'modal-dialog';
      dialog.style.width = '500px';
      dialog.style.backgroundColor = '#fff';
      dialog.style.borderRadius = '8px';
      dialog.style.padding = '20px';
      
      dialog.innerHTML = `
        <h4>Select Download Format</h4>
        <div class="mb-3">
          <div class="form-check mb-2">
            <input class="form-check-input" type="radio" name="formatOption" id="formatBest" value="best" checked>
            <label class="form-check-label" for="formatBest">
              <i class="bi bi-stars"></i> Best Quality (MP4)
            </label>
          </div>
          <div class="form-check mb-2">
            <input class="form-check-input" type="radio" name="formatOption" id="format720p" value="res-720">
            <label class="form-check-label" for="format720p">
              <i class="bi bi-film"></i> 720p (MP4)
            </label>
          </div>
          <div class="form-check mb-2">
            <input class="form-check-input" type="radio" name="formatOption" id="formatAudio" value="audio-320">
            <label class="form-check-label" for="formatAudio">
              <i class="bi bi-music-note"></i> Audio Only (MP3)
            </label>
          </div>
        </div>
        <div class="d-flex justify-content-end">
          <button id="cancelFormat" class="btn btn-secondary me-2">Cancel</button>
          <button id="confirmFormat" class="btn btn-primary">Download</button>
        </div>
      `;
      
      dialogOverlay.appendChild(dialog);
      document.body.appendChild(dialogOverlay);
      
      // Set up event listeners
      document.getElementById('cancelFormat').addEventListener('click', () => {
        document.body.removeChild(dialogOverlay);
        resolve(null);
      });
      
      document.getElementById('confirmFormat').addEventListener('click', () => {
        const formatOption = document.querySelector('input[name="formatOption"]:checked').value;
        const isAudio = formatOption === 'audio-320';
        
        document.body.removeChild(dialogOverlay);
        resolve({
          formatId: formatOption,
          isAudio: isAudio
        });
      });
    });
  }

  // Set up download progress listener
  downloadManager.onProgress(progress => {
    uiManager.updateDownloadProgress(progress);
  });
  
  // Set up update checker
  setupUpdateChecker();
  // Helper function to validate URL
  function isValidURL(url) {
    // Check if it's a URL
    if (!url || typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      
      // Check for supported video platforms - ONLY YouTube, Facebook, and TikTok
      const supportedDomains = [
        'youtube.com', 'youtu.be',
        'facebook.com', 'fb.com', 'fb.watch',
        'tiktok.com'
      ];
      
      return supportedDomains.some(domain => urlObj.hostname.includes(domain));
    } catch (e) {
      return false;
    }
  }

  // Set up update checks
  function setupUpdateChecker() {
    // Listen for update status changes
    window.electronAPI.onUpdateStatus((status, info) => {
      console.log('Update status:', status, info);
      
      switch (status) {
        case 'checking':
          console.log('Checking for updates...');
          break;
          
        case 'available':
          updateAvailable = true;
          updateInfo = info;
          showUpdateBanner();
          break;
          
        case 'not-available':
          updateAvailable = false;
          console.log('No updates available');
          break;
          
        case 'error':
          console.error('Update error:', info);
          break;
          
        case 'progress':
          updateDownloadProgress(info);
          break;
          
        case 'downloaded':
          showUpdateReadyNotification();
          break;
      }
    });
    
    // Manually check for updates when app starts
    setTimeout(() => {
      window.electronAPI.checkForUpdates();
    }, 5000);
  }
  
  // Show update banner
  function showUpdateBanner() {
    // Create update banner if it doesn't exist
    let updateBanner = document.getElementById('update-banner');
    if (!updateBanner) {
      updateBanner = document.createElement('div');
      updateBanner.id = 'update-banner';
      updateBanner.className = 'update-banner';
      updateBanner.innerHTML = `
        <div class="update-content">
          <span><i class="bi bi-arrow-clockwise me-2"></i>Phiên bản mới (${updateInfo?.version || 'mới'}) đã sẵn sàng!</span>
          <div>
            <button id="update-now" class="btn btn-sm btn-primary me-2">Cập nhật ngay</button>
            <button id="update-later" class="btn btn-sm btn-outline-secondary">Để sau</button>
          </div>
        </div>
      `;
      document.body.appendChild(updateBanner);
      
      // Add styles if they don't exist
      if (!document.getElementById('update-banner-styles')) {
        const style = document.createElement('style');
        style.id = 'update-banner-styles';
        style.textContent = `
          .update-banner {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background-color: #4CAF50;
            color: white;
            z-index: 9999;
            padding: 10px 20px;
            display: flex;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .update-content {
            width: 100%;
            max-width: 1000px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .update-progress {
            margin-top: 10px;
            width: 100%;
            background-color: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
          }
          .update-progress-bar {
            height: 8px;
            background-color: #2196F3;
            width: 0%;
            transition: width 0.3s ease;
          }
        `;
        document.head.appendChild(style);
      }
      
      // Set up event listeners
      document.getElementById('update-now').addEventListener('click', () => {
        startUpdateDownload();
      });
      
      document.getElementById('update-later').addEventListener('click', () => {
        updateBanner.style.display = 'none';
      });
    } else {
      updateBanner.style.display = 'flex';
    }
  }
  
  // Start downloading the update
  function startUpdateDownload() {
    const updateBanner = document.getElementById('update-banner');
    updateBanner.innerHTML = `
      <div class="update-content">
        <span><i class="bi bi-cloud-download me-2"></i>Đang tải xuống bản cập nhật...</span>
        <div class="update-progress">
          <div id="update-progress-bar" class="update-progress-bar"></div>
        </div>
      </div>
    `;
    
    window.electronAPI.downloadUpdate();
  }
  
  // Update the download progress
  function updateDownloadProgress(progressObj) {
    const progressBar = document.getElementById('update-progress-bar');
    if (progressBar) {
      const percent = progressObj.percent || 0;
      progressBar.style.width = `${percent}%`;
    }
  }
  
  // Show notification that update is ready to install
  function showUpdateReadyNotification() {
    const updateBanner = document.getElementById('update-banner');
    if (updateBanner) {
      updateBanner.innerHTML = `
        <div class="update-content">
          <span><i class="bi bi-check-circle me-2"></i>Cập nhật đã sẵn sàng!</span>
          <div>
            <button id="install-update" class="btn btn-sm btn-primary">Cài đặt & Khởi động lại</button>
          </div>
        </div>
      `;
      
      document.getElementById('install-update').addEventListener('click', () => {
        window.electronAPI.installUpdate();
      });
    } else {
      showNotification('Cập nhật đã sẵn sàng cài đặt!', 'success');
    }
  }

  // Update save folder display
  function updateSaveFolderDisplay() {
    window.electronAPI.getSaveFolder().then(folder => {
      document.getElementById('saveFolder').textContent = folder;
      document.getElementById('saveFolderPath').value = folder;
    });
  }

  // Change download folder
  function changeDownloadFolder() {
    window.electronAPI.setSaveFolder().then(folder => {
      updateSaveFolderDisplay();
    });
  }
  // Render history items
  function renderHistory() {
    const historyContainer = document.getElementById('historyItems');
    const emptyHistory = document.getElementById('emptyHistory');
    
    // Get history and check for files
    historyManager.loadHistory().then(async (history) => {
      historyContainer.innerHTML = '';
      
      if (history.length === 0) {
        historyContainer.classList.add('d-none');
        emptyHistory.classList.remove('d-none');
        return;
      }
      
      historyContainer.classList.remove('d-none');
      emptyHistory.classList.add('d-none');
      
      // For each history item, check if file exists and render
      for (let i = 0; i < history.length; i++) {
        const item = history[i];
        const index = i;
        
        // Check if file exists
        const fileExists = await window.electronAPI.checkFileExists(item.outputPath);
        
        const historyItem = document.createElement('div');
        historyItem.className = 'list-group-item history-item';
        
        // Format date nicely
        const downloadDate = item.downloadedAt ? new Date(item.downloadedAt).toLocaleDateString() : 'Unknown date';
        
        // Format duration if available
        const duration = item.duration ? formatDuration(item.duration) : '';
        
        // Add appropriate icon based on file type
        const fileIcon = item.isAudio ? 'bi-file-earmark-music' : 'bi-file-earmark-play';
        const actionBtnText = item.isAudio ? 'Play' : 'Watch';
        
        historyItem.innerHTML = `
          <div class="thumbnail-container position-relative">
            <img src="${item.thumbnail || 'assets/placeholder.png'}" class="rounded thumbnail" alt="Thumbnail">
            ${duration ? `<span class="duration-badge">${duration}</span>` : ''}
          </div>
          <div class="ms-3 flex-grow-1">
            <h5 class="mb-1 text-truncate">${item.title}</h5>
            <p class="mb-1 small text-muted">
              <i class="bi ${fileIcon} me-1"></i>
              ${downloadDate} • 
              ${item.quality || 'Unknown quality'} • 
              ${item.isAudio ? 'Audio' : 'Video'}
            </p>
            <p class="mb-0 small file-path" title="${item.outputPath}">
              <i class="bi bi-folder me-1"></i> ${item.outputPath}
              ${!fileExists ? '<span class="text-danger ms-2">(File not found)</span>' : ''}
            </p>
          </div>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-primary open-file" data-path="${item.outputPath}" ${!fileExists ? 'disabled' : ''} title="Open file">
              <i class="bi bi-play-circle"></i> ${actionBtnText}
            </button>
            <button class="btn btn-sm btn-outline-secondary open-folder" data-path="${item.outputPath}" title="Open containing folder">
              <i class="bi bi-folder"></i> Folder
            </button>
            <button class="btn btn-sm btn-outline-danger delete-history" data-index="${index}" title="Remove from history">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        `;
        
        historyContainer.appendChild(historyItem);
      }
      
      // Add event listeners after rendering all items
      addHistoryItemEventListeners();
    });
  }

  // Function to add event listeners to history items
  function addHistoryItemEventListeners() {
    document.querySelectorAll('.open-file').forEach(btn => {
      btn.addEventListener('click', function() {
        const path = this.getAttribute('data-path');
        window.electronAPI.openFile(path);
      });
    });
    
    document.querySelectorAll('.open-folder').forEach(btn => {
      btn.addEventListener('click', function() {
        const path = this.getAttribute('data-path');
        window.electronAPI.openFolder(path);
      });
    });
    
    document.querySelectorAll('.delete-history').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        if (confirm('Remove this item from history?')) {
          historyManager.deleteHistoryItem(index).then(() => {
            renderHistory();
          });
        }
      });
    });
  }
});
