// settings-manager.js - Handles app settings
// Using global NotificationManager from app-bundle.js
// import { NotificationManager } from './ui-utils.js';

// App settings with defaults
const defaultSettings = {
  autoDetectURLs: true,
  autoFetchInfo: true,
  autoUpdate: true,
  saveFolder: null,  // Will be set from main process
  ultraRemuxMp4: false // Default value for Ultra Remux MP4
};

// Active clipboard detection interval
let clipboardDetectionInterval = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize settings
  initializeSettings();
  
  // Set up settings page
  setupSettingsPage();
});

// Initialize settings
async function initializeSettings() {
  try {
    // Load settings from electron store
    const settings = await window.electron.getSettings();
    
    // Update local storage with settings
    for (const [key, value] of Object.entries(settings)) {
      localStorage.setItem(key, value);
    }
    
    // Initialize clipboard detection based on current settings
    initClipboardDetection();
    
    // Get app version from package.json
    const appVersionInfo = document.getElementById('appVersionInfo');
    if (appVersionInfo && settings.appVersion) {
      appVersionInfo.textContent = `Media Downloader v${settings.appVersion}`;
    }
    
  } catch (error) {
    console.error('Error initializing settings:', error);
    
    // Set default settings if error
    for (const [key, value] of Object.entries(defaultSettings)) {
      if (value !== null) {
        localStorage.setItem(key, value);
      }
    }
    
    // Initialize clipboard detection with defaults
    initClipboardDetection();
  }
}

// Initialize or update clipboard detection based on settings
function initClipboardDetection() {
  // Clear any existing interval
  if (clipboardDetectionInterval) {
    clearInterval(clipboardDetectionInterval);
    clipboardDetectionInterval = null;
  }
  
  // Check if settings allow auto-detection
  const autoDetectURLs = localStorage.getItem('autoDetectURLs') !== 'false';
  
  if (autoDetectURLs) {
    console.log('Initializing clipboard detection (enabled)');
    let lastClipboardContent = '';
    
    // Check clipboard periodically
    clipboardDetectionInterval = setInterval(async () => {
      try {
        // Read from clipboard
        const text = await navigator.clipboard.readText();
        
        // Only process if content changed and is a valid URL
        if (text && text !== lastClipboardContent && isValidURL(text)) {
          lastClipboardContent = text;
          
          // Update URL input
          const urlInput = document.getElementById('urlInput');
          if (urlInput) {
            urlInput.value = text;
            
            // Show notification
            NotificationManager.success('URL detected and pasted');
            
            // Auto-fetch if enabled
            if (localStorage.getItem('autoFetchInfo') !== 'false') {
              document.getElementById('fetchBtn')?.click();
            }
          }
        }
      } catch (err) {
        console.error('Failed to read clipboard:', err);
      }
    }, 1500);
  } else {
    console.log('Clipboard detection disabled');
  }
}

// Helper function to check URL validity
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

// Setup settings page
function setupSettingsPage() {
  // Get settings elements
  const autoDetectURLsToggle = document.getElementById('autoDetectUrls');
  const autoFetchInfoToggle = document.getElementById('autoFetchInfo');
  const autoUpdateToggle = document.getElementById('autoUpdate');
  const autoUpdateYtDlpToggle = document.getElementById('autoUpdateYtDlpOnStart');
  const updateYtDlpNowBtn = document.getElementById('updateYtDlpNowBtn');
  const ytDlpCurrentVersionEl = document.getElementById('ytDlpCurrentVersion');
  const ytDlpLastUpdatedEl = document.getElementById('ytDlpLastUpdated');
  const defaultDownloadDir = document.getElementById('defaultDownloadDir');
  const changeDefaultDirBtn = document.getElementById('changeDefaultDirBtn');
  const checkUpdateBtn = document.getElementById('checkUpdateBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  
  if (!autoDetectURLsToggle || !autoFetchInfoToggle || !defaultDownloadDir || !changeDefaultDirBtn) return;
  
  // Set initial values
  autoDetectURLsToggle.checked = localStorage.getItem('autoDetectURLs') !== 'false';
  autoFetchInfoToggle.checked = localStorage.getItem('autoFetchInfo') !== 'false';
  
  // Set initial value for auto update toggle if it exists
  if (autoUpdateToggle) autoUpdateToggle.checked = localStorage.getItem('autoUpdate') !== 'false';
  if (autoUpdateYtDlpToggle) autoUpdateYtDlpToggle.checked = localStorage.getItem('autoUpdateYtDlpOnStart') !== 'false';

  // Populate yt-dlp version info if already stored
  const lastVer = localStorage.getItem('lastYtDlpVersion');
  if (lastVer && ytDlpCurrentVersionEl) ytDlpCurrentVersionEl.textContent = lastVer;
  const lastUpd = localStorage.getItem('lastYtDlpUpdateTime');
  if (lastUpd && ytDlpLastUpdatedEl) {
    const d = new Date(lastUpd);
    ytDlpLastUpdatedEl.textContent = `(Cập nhật lần cuối: ${d.toLocaleDateString()} ${d.toLocaleTimeString()})`;
  }
  
  // Get save folder
  window.electron.getSaveFolder().then(folder => {
    defaultDownloadDir.value = folder;
  });
  
  // Save Settings button click handler
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      try {
        // Save all settings at once
        await window.electron.saveSettings({
          autoDetectURLs: autoDetectURLsToggle.checked,
          autoFetchInfo: autoFetchInfoToggle.checked,
          autoUpdate: autoUpdateToggle ? autoUpdateToggle.checked : true,
          autoUpdateYtDlpOnStart: autoUpdateYtDlpToggle ? autoUpdateYtDlpToggle.checked : true,
          theme: localStorage.getItem('theme') || 'light'
        });
        
        // Update localStorage
        localStorage.setItem('autoDetectURLs', autoDetectURLsToggle.checked);
        localStorage.setItem('autoFetchInfo', autoFetchInfoToggle.checked);
        if (autoUpdateToggle) localStorage.setItem('autoUpdate', autoUpdateToggle.checked);
        if (autoUpdateYtDlpToggle) localStorage.setItem('autoUpdateYtDlpOnStart', autoUpdateYtDlpToggle.checked);
        
        // Apply settings immediately
        initClipboardDetection();
        
        NotificationManager.success('Settings saved successfully');
      } catch (error) {
        console.error('Error saving settings:', error);
        NotificationManager.error('Failed to save settings');
      }
    });
  }
  
  // Add event listeners for immediate application of settings
  autoDetectURLsToggle.addEventListener('change', (e) => {
    localStorage.setItem('autoDetectURLs', e.target.checked);
    NotificationManager.info(`Auto-detect URLs ${e.target.checked ? 'enabled' : 'disabled'}`);
    
    // Apply setting immediately
    initClipboardDetection();
    
    // Save to electron store
    window.electron.saveSettings({
      autoDetectURLs: e.target.checked
    });
  });
  
  autoFetchInfoToggle.addEventListener('change', (e) => {
    localStorage.setItem('autoFetchInfo', e.target.checked);
    NotificationManager.info(`Auto-fetch video info ${e.target.checked ? 'enabled' : 'disabled'}`);
    
    // Save to electron store
    window.electron.saveSettings({
      autoFetchInfo: e.target.checked
    });
  });
  
  // Auto update toggle event listener
  if (autoUpdateToggle) {
    autoUpdateToggle.addEventListener('change', (e) => {
      localStorage.setItem('autoUpdate', e.target.checked);
      NotificationManager.info(`Auto updates ${e.target.checked ? 'enabled' : 'disabled'}`);
      
      // Save to electron store
      window.electron.saveSettings({
        autoUpdate: e.target.checked
      });
    });
  }
  
  // Check for updates button
  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', async () => {
      try {
        checkUpdateBtn.disabled = true;
        checkUpdateBtn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin me-2"></i> Checking...';
        
        // Check for updates
        const updateResult = await window.electron.checkForUpdates();
        
        if (updateResult.updateAvailable) {
          NotificationManager.success(`Update available: ${updateResult.version}`);
          
          // Show update available button
          const updateAvailableBtn = document.getElementById('updateAvailableBtn');
          if (updateAvailableBtn) {
            updateAvailableBtn.classList.remove('hidden');
            updateAvailableBtn.innerHTML = `<i class="bi bi-cloud-download me-2"></i> Download v${updateResult.version}`;
            
            // Add click event to download
            updateAvailableBtn.addEventListener('click', () => {
              window.electron.downloadUpdate();
              updateAvailableBtn.disabled = true;
              updateAvailableBtn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin me-2"></i> Downloading...';
            });
          }
        } else {
          NotificationManager.info('No updates available');
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
        NotificationManager.error(`Update check failed: ${error.message || 'Unknown error'}`);
      } finally {
        checkUpdateBtn.disabled = false;
        checkUpdateBtn.innerHTML = '<i class="bi bi-cloud-check me-2"></i> Check for Updates';
      }
    });
  }
  
  // Change default download directory
  changeDefaultDirBtn.addEventListener('click', async () => {
    try {
      await window.electron.setSaveFolder();
      const folder = await window.electron.getSaveFolder();
      defaultDownloadDir.value = folder;
      NotificationManager.success('Download folder updated');
    } catch (error) {
      console.error('Error setting save folder:', error);
      NotificationManager.error('Failed to update download folder');
    }
  });
  
  // Set up update status listener
  if (window.electron && window.electron.onUpdateStatus) {
    window.electron.onUpdateStatus((status, info) => {
      switch (status) {
        case 'available':
          NotificationManager.info(`Update available: ${info.version}`);
          break;
        case 'downloaded':
          NotificationManager.success('Update downloaded. Will be installed on restart.');
          
          // Show install button
          const installUpdateBtn = document.getElementById('installUpdateBtn');
          if (installUpdateBtn) {
            installUpdateBtn.classList.remove('hidden');
            installUpdateBtn.addEventListener('click', () => {
              window.electron.installUpdate();
            });
          }
          break;
        case 'error':
          NotificationManager.error(`Update error: ${info}`);
          break;
      }
    });
  }

  // yt-dlp auto update toggle
  if (autoUpdateYtDlpToggle) {
    autoUpdateYtDlpToggle.addEventListener('change', (e) => {
      localStorage.setItem('autoUpdateYtDlpOnStart', e.target.checked);
      NotificationManager.info(`Tự cập nhật yt-dlp khi khởi động ${e.target.checked ? 'bật' : 'tắt'}`);
      window.electron.saveSettings({ autoUpdateYtDlpOnStart: e.target.checked });
    });
  }

  // Manual update button
  if (updateYtDlpNowBtn) {
    updateYtDlpNowBtn.addEventListener('click', async () => {
      try {
        updateYtDlpNowBtn.disabled = true;
        const original = updateYtDlpNowBtn.innerHTML;
        updateYtDlpNowBtn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin me-1"></i> Đang cập nhật...';
        const res = await window.electron.updateYtDlpNow();
        // Result will also be received via onYtDlpUpdateResult, but we can optimistic update
        if (res && res.version && ytDlpCurrentVersionEl) {
          ytDlpCurrentVersionEl.textContent = res.version;
        }
        NotificationManager.info('Đang kiểm tra kết quả cập nhật...');
        setTimeout(() => {
          updateYtDlpNowBtn.disabled = false;
          updateYtDlpNowBtn.innerHTML = original;
        }, 1500);
      } catch (err) {
        console.error('yt-dlp manual update error:', err);
        NotificationManager.error('Cập nhật yt-dlp thất bại');
        updateYtDlpNowBtn.disabled = false;
        updateYtDlpNowBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Cập nhật ngay';
      }
    });
  }

  // Listen for yt-dlp update results
  if (window.electron.onYtDlpUpdateResult) {
    window.electron.onYtDlpUpdateResult((data) => {
      if (!data) return;
      const { updated, oldVersion, newVersion, version, error } = data;
      if (error) {
        NotificationManager.error(`yt-dlp update error: ${error}`);
        return;
      }
      const finalVer = newVersion || version;
      if (finalVer && ytDlpCurrentVersionEl) ytDlpCurrentVersionEl.textContent = finalVer;
      const now = new Date();
      if (ytDlpLastUpdatedEl) {
        ytDlpLastUpdatedEl.textContent = `(Cập nhật lần cuối: ${now.toLocaleDateString()} ${now.toLocaleTimeString()})`;
      }
      localStorage.setItem('lastYtDlpVersion', finalVer || '');
      localStorage.setItem('lastYtDlpUpdateTime', now.toISOString());
      if (updated) {
        NotificationManager.success(`Đã cập nhật yt-dlp lên ${finalVer}`);
      } else {
        NotificationManager.info(`yt-dlp đã ở phiên bản mới nhất (${finalVer})`);
      }
    });
  }

  // Render additional settings
  renderSettings();
}

// Render additional settings UI elements
function renderSettings(settings) {
  // Render advanced settings section if not already rendered
  const advancedContainer = document.getElementById('advancedSettingsExtra');
  if (advancedContainer && !document.getElementById('ultraRemuxToggle')) {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between mt-3';
    row.innerHTML = `
      <div>
        <div class="font-medium">Ultra Remux MP4</div>
        <div class="text-xs text-secondary-500 dark:text-secondary-400">Always remux best video+audio to MP4 (largest possible)</div>
      </div>
      <label class="inline-flex items-center cursor-pointer">
        <input id="ultraRemuxToggle" type="checkbox" class="sr-only peer" ${settings.ultraRemuxMp4 ? 'checked':''}>
        <div class="w-11 h-6 bg-secondary-300 peer-focus:outline-none rounded-full peer dark:bg-secondary-700 peer-checked:bg-primary-600 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
      </label>`;
    advancedContainer.appendChild(row);
    const toggle = row.querySelector('#ultraRemuxToggle');
    toggle.addEventListener('change', async () => {
      const s = await window.electron.getSettings();
      s.ultraRemuxMp4 = toggle.checked;
      await window.electron.saveSettings(s);
      NotificationManager.info('Ultra Remux setting saved');
    });
  }
}