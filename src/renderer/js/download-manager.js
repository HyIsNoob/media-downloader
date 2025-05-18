// download-manager.js - Handles the download process
// Using global NotificationManager and gsap from loaded scripts
// import { NotificationManager } from './ui-utils.js';
// import { currentVideoInfo, getSelectedFormat } from './video-info.js';
// import gsap from 'gsap';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize download button and folder selection
  const downloadBtn = document.getElementById('downloadBtn');
  const changeFolderBtn = document.getElementById('changeFolderBtn');
  
  if (downloadBtn && changeFolderBtn) {
    setupEventListeners();
    updateSaveFolderDisplay();
  }
  
  // Make functions globally accessible after they're defined
  window.showDownloadProgress = showDownloadProgress;
  window.hideDownloadProgress = hideDownloadProgress;
});

// Set up download button and folder selection
function setupEventListeners() {
  const downloadBtn = document.getElementById('downloadBtn');
  const changeFolderBtn = document.getElementById('changeFolderBtn');
  
  // Handle download button click
  downloadBtn.addEventListener('click', async () => {
    // Get selected format
    const selectedFormat = getSelectedFormat();
    
    if (!selectedFormat) {
      NotificationManager.error('Please select a format');
      return;
    }
    
    if (!currentVideoInfo) {
      NotificationManager.error('No video information available');
      return;
    }
    
    try {
      // Get URL from input
      const url = document.getElementById('urlInput').value.trim();
      
      // Show download progress UI
      showDownloadProgress();
      
      // Get save folder
      const saveFolder = await window.electron.getSaveFolder();
      
      // Create filename
      const qualityLabel = document.querySelector('.format-item.ring-2 .format-name').textContent.trim().replace(/\s+/g, '_');
      let filename = currentVideoInfo.title.replace(/[\\/:*?"<>|]/g, '_');
      const ext = selectedFormat.isAudio ? 'mp3' : 'mp4';
      let outputPath = `${saveFolder}/${filename}_${qualityLabel}.${ext}`;
      
      // Check if file already exists
      const fileExists = await window.electron.checkFileExists(outputPath);
      
      if (fileExists) {
        // Add timestamp to filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        outputPath = `${saveFolder}/${filename}_${qualityLabel}_${timestamp}.${ext}`;
        NotificationManager.info('File already exists. Adding timestamp to filename.');
      }
      
      // Start download
      const result = await window.electron.downloadVideo({
        url,
        format: selectedFormat.formatId,
        isAudio: selectedFormat.isAudio,
        outputPath
      });
      
      // Add to history
      await window.electron.addToHistory({
        title: currentVideoInfo.title,
        url: url,
        thumbnail: currentVideoInfo.thumbnail,
        outputPath: outputPath,
        quality: qualityLabel,
        isAudio: selectedFormat.isAudio,
        downloadedAt: new Date().toISOString()
      });
      
      // Show success notification
      NotificationManager.success('Download completed successfully!');
      
    } catch (error) {
      console.error('Download error:', error);
      NotificationManager.error(`Download failed: ${error.message || 'Unknown error'}`);
    } finally {
      // Hide progress UI after a delay
      setTimeout(() => {
        hideDownloadProgress();
      }, 1000);
    }
  });
  
  // Handle change folder button click
  changeFolderBtn.addEventListener('click', async () => {
    try {
      await window.electron.setSaveFolder();
      updateSaveFolderDisplay();
      NotificationManager.info('Download folder updated');
    } catch (error) {
      console.error('Error setting save folder:', error);
      NotificationManager.error('Failed to update download folder');
    }
  });
}

// Show download progress UI
function showDownloadProgress() {
  const downloadProgress = document.getElementById('downloadProgress');
  
  // Reset progress
  document.getElementById('progressBar').style.width = '0%';
  document.getElementById('downloadSpeed').textContent = '0 KB/s';
  document.getElementById('downloadedSize').textContent = '0 MB';
  document.getElementById('totalSize').textContent = '0 MB';
  document.getElementById('eta').textContent = '00:00';
  
  // Show progress card with animation
  downloadProgress.classList.remove('d-none');
  gsap.fromTo(downloadProgress,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
  );
  
  // Set up download progress listener
  if (window.electron && window.electron.onDownloadProgress) {
    window.electron.onDownloadProgress(updateDownloadProgress);
  }
}

// Hide download progress UI
function hideDownloadProgress() {
  const downloadProgress = document.getElementById('downloadProgress');
  
  gsap.to(downloadProgress, {
    opacity: 0,
    y: -20,
    duration: 0.4,
    ease: "power2.in",
    onComplete: () => {
      downloadProgress.classList.add('d-none');
    }
  });
  
  // Remove download progress listener
  if (window.electron && window.electron.removeDownloadProgressListener) {
    window.electron.removeDownloadProgressListener();
  }
}

// Update download progress UI
function updateDownloadProgress(progress) {
  // Update progress bar
  const progressBar = document.getElementById('progressBar');
  progressBar.style.width = `${progress.percent || 0}%`;
  
  // Update download speed
  const downloadSpeed = document.getElementById('downloadSpeed');
  downloadSpeed.textContent = formatSpeed(progress.speed);
  
  // Update downloaded size
  const downloadedSize = document.getElementById('downloadedSize');
  downloadedSize.textContent = formatFileSize(progress.downloaded);
  
  // Update total size
  const totalSize = document.getElementById('totalSize');
  totalSize.textContent = formatFileSize(progress.total);
  
  // Update ETA
  const eta = document.getElementById('eta');
  eta.textContent = formatETA(progress.eta);
  
  // Add animation to progress bar
  gsap.to(progressBar, {
    width: `${progress.percent || 0}%`,
    duration: 0.3,
    ease: "power1.out"
  });
}

// Update save folder display
async function updateSaveFolderDisplay() {
  try {
    const folder = await window.electron.getSaveFolder();
    document.getElementById('saveFolder').textContent = folder;
  } catch (error) {
    console.error('Error getting save folder:', error);
  }
}

// Helper functions
function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond) return '0 KB/s';
  
  if (bytesPerSecond >= 1048576) {
    return `${(bytesPerSecond / 1048576).toFixed(1)} MB/s`;
  } else {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '0 MB';
  
  if (bytes >= 1073741824) {
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  } else {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}

function formatETA(seconds) {
  if (!seconds || seconds === Infinity) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Remove export - we're using globals now
// export {
//   showDownloadProgress,
//   hideDownloadProgress
// }; 