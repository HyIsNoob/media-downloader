// download-manager.js - Handles the download process
// Using global NotificationManager and gsap from loaded scripts

// Options for current single download (used by Pause = add to queue)
let currentDownloadOptions = null;
let userPausedToQueue = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('downloadBtn');
  const changeFolderBtn = document.getElementById('changeFolderBtn');
  
  if (downloadBtn && changeFolderBtn) {
    setupEventListeners();
    updateSaveFolderDisplay();
  }
  
  setupDownloadProgressActions();
  
  window.showDownloadProgress = showDownloadProgress;
  window.hideDownloadProgress = hideDownloadProgress;

  // Listen for completion event to prompt open folder
  if (window.electron && window.electron.onDownloadComplete) {
    window.electron.onDownloadComplete(({ filePath }) => {
      if (!filePath) return;
      NotificationManager.success('Download completed successfully!');
      // Show modal instead of confirm
      setTimeout(() => {
        showDownloadCompleteModal(filePath);
      }, 200);
    });
  }
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
      
      currentDownloadOptions = {
        url,
        title: currentVideoInfo.title,
        format: selectedFormat.formatId,
        isAudio: selectedFormat.isAudio,
        outputPath,
        thumbnail: currentVideoInfo.thumbnail || null,
        qualityLabel
      };
      
      const result = await window.electron.downloadVideo({
        url,
        format: selectedFormat.formatId,
        isAudio: selectedFormat.isAudio,
        outputPath
      });
      
      currentDownloadOptions = null;
      await window.electron.addToHistory({
        title: currentVideoInfo.title,
        url: url,
        thumbnail: currentVideoInfo.thumbnail,
        outputPath: outputPath,
        quality: qualityLabel,
        isAudio: selectedFormat.isAudio,
        downloadedAt: new Date().toISOString()
      });
      
      NotificationManager.success('Download completed successfully!');
      
    } catch (error) {
      const msg = error && (error.message || error.toString());
      if (msg && msg.includes('CancelledByUser')) {
        if (userPausedToQueue && currentDownloadOptions && typeof window.addToQueue === 'function') {
          window.addToQueue(currentDownloadOptions).then(() => {
            NotificationManager.success('Added to queue. Resume from Queue tab.');
          });
        } else {
          NotificationManager.info('Download cancelled');
        }
      } else {
        console.error('Download error:', error);
        NotificationManager.error(`Download failed: ${msg || 'Unknown error'}`);
      }
    } finally {
      userPausedToQueue = false;
      currentDownloadOptions = null;
      setTimeout(() => hideDownloadProgress(), 800);
    }
  });
  
  // Add to queue button
  const addToQueueBtn = document.getElementById('addToQueueBtn');
  if (addToQueueBtn) {
    addToQueueBtn.addEventListener('click', async () => {
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
        const url = document.getElementById('urlInput').value.trim();
        const saveFolder = await window.electron.getSaveFolder();
        const qualityLabel = document.querySelector('.format-item.ring-2 .format-name').textContent.trim().replace(/\s+/g, '_');
        let filename = currentVideoInfo.title.replace(/[\\/:*?"<>|]/g, '_');
        const ext = selectedFormat.isAudio ? 'mp3' : 'mp4';
        let outputPath = `${saveFolder}/${filename}_${qualityLabel}.${ext}`;
        const fileExists = await window.electron.checkFileExists(outputPath);
        if (fileExists) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          outputPath = `${saveFolder}/${filename}_${qualityLabel}_${timestamp}.${ext}`;
        }
        if (typeof window.addToQueue === 'function') {
          await window.addToQueue({
            url,
            title: currentVideoInfo.title,
            format: selectedFormat.formatId,
            isAudio: selectedFormat.isAudio,
            outputPath,
            thumbnail: currentVideoInfo.thumbnail || null,
            qualityLabel
          });
        }
      } catch (err) {
        console.error('Add to queue error:', err);
        NotificationManager.error(err.message || 'Failed to add to queue');
      }
    });
  }

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

function setupDownloadProgressActions() {
  const cancelBtn = document.getElementById('downloadCancelBtn');
  const pauseToQueueBtn = document.getElementById('downloadPauseToQueueBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (window.electron && window.electron.cancelCurrentDownload) {
        window.electron.cancelCurrentDownload();
      }
    });
  }
  if (pauseToQueueBtn) {
    pauseToQueueBtn.addEventListener('click', () => {
      if (!currentDownloadOptions) return;
      userPausedToQueue = true;
      if (window.electron && window.electron.cancelCurrentDownload) {
        window.electron.cancelCurrentDownload();
      }
    });
  }
}

// Show download progress UI
function showDownloadProgress() {
  const downloadProgress = document.getElementById('downloadProgress');
  const progressBar = document.getElementById('progressBar');
  if (progressBar) progressBar.style.width = '0%';
  const speedEl = document.getElementById('downloadSpeed');
  const downEl = document.getElementById('downloadedSize');
  const totalEl = document.getElementById('totalSize');
  const etaEl = document.getElementById('eta');
  if (speedEl) speedEl.textContent = '0 KB/s';
  if (downEl) downEl.textContent = '0 MB';
  if (totalEl) totalEl.textContent = '0 MB';
  if (etaEl) etaEl.textContent = '00:00';
  
  downloadProgress.classList.remove('d-none');
  gsap.fromTo(downloadProgress,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
  );
  
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
  const progressBar = document.getElementById('progressBar');
  const pct = typeof progress.percent === 'number' ? progress.percent : 0;
  progressBar.style.width = pct + '%';
  progressBar.setAttribute('aria-valuenow', pct.toFixed(2));

  // Numbers
  const downloadSpeed = document.getElementById('downloadSpeed');
  if (typeof progress.speedBytes === 'number' && progress.speedBytes > 0) {
    downloadSpeed.textContent = formatSpeed(progress.speedBytes);
  } else if (progress.speed) { // legacy field fallback
    downloadSpeed.textContent = progress.speed;
  }

  const downloadedSize = document.getElementById('downloadedSize');
  downloadedSize.textContent = formatFileSize(progress.downloaded || 0);

  const totalSize = document.getElementById('totalSize');
  totalSize.textContent = progress.total ? formatFileSize(progress.total) : '—';

  const eta = document.getElementById('eta');
  if (typeof progress.etaSeconds === 'number' && progress.etaSeconds > 0) {
    eta.textContent = formatETA(progress.etaSeconds);
  } else if (progress.eta) {
    eta.textContent = progress.eta;
  }

  // Animate
  gsap.to(progressBar, { width: pct + '%', duration: 0.25, ease: 'power1.out' });
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

// Modal helpers
function showDownloadCompleteModal(filePath) {
  const modal = document.getElementById('downloadCompleteModal');
  if (!modal) return;
  const fileNameEl = document.getElementById('dc-file-name');
  fileNameEl.textContent = filePath.split(/[/\\]/).pop();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  gsap.fromTo(modal.querySelector('.glass-card'), { y: 40, opacity: 0 }, { y:0, opacity:1, duration:0.35, ease:'power2.out' });

  // Wire buttons
  const openFileBtn = document.getElementById('dc-open-file');
  const openFolderBtn = document.getElementById('dc-open-folder');
  const copyPathBtn = document.getElementById('dc-copy-path');
  const closeBtns = modal.querySelectorAll('[data-modal-close]');

  openFileBtn.onclick = () => window.electron.openFile(filePath);
  openFolderBtn.onclick = () => {
    window.electron.openFolder(filePath);
  };
  copyPathBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(filePath);
      NotificationManager.success('Path copied');
    } catch { NotificationManager.error('Copy failed'); }
  };
  closeBtns.forEach(btn => btn.onclick = () => hideDownloadCompleteModal());
}

function hideDownloadCompleteModal() {
  const modal = document.getElementById('downloadCompleteModal');
  if (!modal) return;
  gsap.to(modal.querySelector('.glass-card'), { y:30, opacity:0, duration:0.25, ease:'power2.in', onComplete: () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }});
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