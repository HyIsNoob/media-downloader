// playlist-handler.js - Handles playlist functionality
// Using globals instead of imports
// import { NotificationManager } from './ui-utils.js';
// import gsap from 'gsap';
// import { showDownloadProgress, hideDownloadProgress } from './download-manager.js';

let currentPlaylist = null;

document.addEventListener('DOMContentLoaded', () => {
  setupPlaylistPage();
  
  window.currentPlaylist = currentPlaylist;
});

// Setup playlist page
function setupPlaylistPage() {
  const fetchPlaylistBtn = document.getElementById('fetchPlaylistBtn');
  const playlistUrlInput = document.getElementById('playlistUrlInput');
  
  if (!fetchPlaylistBtn || !playlistUrlInput) return;
  
  fetchPlaylistBtn.addEventListener('click', async () => {
    const url = playlistUrlInput.value.trim();
    
    if (!url) {
      NotificationManager.error('Please enter a valid playlist URL');
      return;
    }
    
    const originalText = fetchPlaylistBtn.innerHTML;
    try {
      fetchPlaylistBtn.disabled = true;
      fetchPlaylistBtn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin me-2"></i> Loading...';
      
      const playlist = await window.electron.getPlaylistInfo(url);
      
      if (!playlist || !playlist.entries || playlist.entries.length === 0) {
        throw new Error('No videos found in playlist');
      }
      
      currentPlaylist = playlist;
      window.currentPlaylist = currentPlaylist;
      
      displayPlaylistInfo(playlist);
      
      setupSelectionButtons();
      
    } catch (error) {
      console.error('Error fetching playlist:', error);
      NotificationManager.error(`Failed to fetch playlist: ${error.message || 'Unknown error'}`);
    } finally {
      fetchPlaylistBtn.disabled = false;
      fetchPlaylistBtn.innerHTML = originalText;
    }
  });
  
  playlistUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      fetchPlaylistBtn.click();
    }
  });
}

// Display playlist information
function displayPlaylistInfo(playlist) {
  const playlistInfo = document.getElementById('playlistInfo');
  const playlistItems = document.getElementById('playlistItems');
  const videoCount = document.getElementById('videoCount');
  const playlistTitleEl = document.getElementById('playlistTitle');
  const playlistDurationEl = document.getElementById('playlistTotalDuration');
  
  playlistInfo.classList.remove('d-none');
  
  playlistItems.innerHTML = '';
  
  videoCount.textContent = playlist.entries.length;
  if (playlistTitleEl) {
    playlistTitleEl.textContent = playlist.title || 'Playlist';
  }
  if (playlistDurationEl) {
    const totalSeconds = playlist.entries.reduce((sum, entry) => {
      if (!entry || !entry.duration) return sum;
      return sum + entry.duration;
    }, 0);
    playlistDurationEl.textContent = totalSeconds ? formatDuration(totalSeconds) : 'Unknown';
  }
  
  playlist.entries.forEach((item, index) => {
    const playlistItem = createPlaylistItemCard(item, index);
    playlistItems.appendChild(playlistItem);
    
    gsap.fromTo(playlistItem, 
      { opacity: 0, y: 20 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.3, 
        delay: index * 0.05, // Stagger effect
        ease: "power2.out"
      }
    );
  });
}

// Create playlist item card
function createPlaylistItemCard(item, index) {
  const playlistItem = document.createElement('div');
  playlistItem.className = 'w-full border-b border-secondary-200 dark:border-secondary-700 pb-3';
  
  const duration = formatDuration(item.duration);
  const hasThumbnail = !!item.thumbnail;
  
  playlistItem.innerHTML = `
    <div class="flex items-start gap-3">
      ${hasThumbnail ? `
        <div class="w-16 h-10 rounded overflow-hidden flex-shrink-0">
          <img src="${item.thumbnail}" class="w-full h-full object-cover" alt="">
        </div>
      ` : ''}
      <div class="flex-1">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400">
            <input type="checkbox" class="playlist-item-checkbox w-4 h-4 rounded border-secondary-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-500" data-index="${index}">
            <span>#${index + 1}</span>
          </div>
          <span class="text-xs text-secondary-500 dark:text-secondary-400">${duration}</span>
        </div>
        <h3 class="text-sm font-medium mb-1 line-clamp-2" title="${item.title}">${item.title}</h3>
        <div class="flex gap-2 mt-1 flex-wrap">
          <button class="download-playlist-item px-3 py-1 flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs flex items-center justify-center transition-colors btn-animate" data-index="${index}" data-quality="best">
            <i class="bi bi-download me-1"></i> MP4
          </button>
          <button class="download-playlist-item px-3 py-1 flex-1 bg-secondary-200 hover:bg-secondary-300 dark:bg-secondary-700 dark:hover:bg-secondary-600 rounded text-xs flex items-center justify-center transition-colors btn-animate" data-index="${index}" data-quality="audio">
            <i class="bi bi-music-note-beamed me-1"></i> MP3
          </button>
          <button class="add-playlist-item-to-queue px-3 py-1 border border-secondary-300 dark:border-secondary-600 rounded text-xs flex items-center justify-center hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors btn-animate" data-index="${index}" title="Add to queue">
            <i class="bi bi-list-plus"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  
  playlistItem.querySelectorAll('.download-playlist-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      await downloadSinglePlaylistItem(index, btn.getAttribute('data-quality'));
    });
  });
  const queueBtn = playlistItem.querySelector('.add-playlist-item-to-queue');
  if (queueBtn) {
    queueBtn.addEventListener('click', () => addPlaylistItemToQueue(index));
  }
  
  return playlistItem;
}

async function addPlaylistItemToQueue(index) {
  if (!currentPlaylist || !currentPlaylist.entries[index]) return;
  const item = currentPlaylist.entries[index];
  const format = await showFormatSelectionDialog();
  if (!format) return;
  const saveFolder = await window.electron.getSaveFolder();
  const playlistTitle = currentPlaylist.title || 'Playlist';
  const safePlaylistTitle = playlistTitle.replace(/[\\/:*?"<>|]/g, '_');
  const baseFolder = `${saveFolder}/${safePlaylistTitle}`;
  const indexPadded = String(index + 1).padStart(2, '0');
  let filename = `${indexPadded} - ${item.title.replace(/[\\/:*?"<>|]/g, '_')}`;
  const ext = format.isAudio ? 'mp3' : 'mp4';
  let outputPath = `${baseFolder}/${filename}.${ext}`;
  const fileExists = await window.electron.checkFileExists(outputPath);
  if (fileExists) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    outputPath = `${baseFolder}/${filename}_${timestamp}.${ext}`;
  }
  if (typeof window.addToQueue === 'function') {
    await window.addToQueue({
      url: item.url,
      title: item.title,
      format: format.formatId,
      isAudio: format.isAudio,
      outputPath,
      thumbnail: item.thumbnail || null,
      qualityLabel: format.isAudio ? 'Audio' : 'Video'
    });
  }
}

// Setup select all and download selected buttons
function setupSelectionButtons() {
  const selectAllBtn = document.getElementById('selectAllBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const addSelectedToQueueBtn = document.getElementById('addSelectedToQueueBtn');
  const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
  
  if (!selectAllBtn || !downloadSelectedBtn) return;
  
  selectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.playlist-item-checkbox');
    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
    
    checkboxes.forEach(checkbox => {
      checkbox.checked = !allChecked;
    });
  });
  
  downloadSelectedBtn.addEventListener('click', async () => {
    const selectedCheckboxes = document.querySelectorAll('.playlist-item-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
      NotificationManager.error('Please select at least one video to download');
      return;
    }
    
    const selectedIndices = Array.from(selectedCheckboxes).map(checkbox => {
      return parseInt(checkbox.getAttribute('data-index'));
    });
    
    const format = await showFormatSelectionDialog();
    
    if (!format) return; // User cancelled
    
    await downloadMultiplePlaylistItems(selectedIndices, format);
  });

  if (addSelectedToQueueBtn) {
    addSelectedToQueueBtn.addEventListener('click', async () => {
      const selectedCheckboxes = document.querySelectorAll('.playlist-item-checkbox:checked');
      if (selectedCheckboxes.length === 0) {
        NotificationManager.error('Please select at least one video');
        return;
      }
      const selectedIndices = Array.from(selectedCheckboxes).map(cb => parseInt(cb.getAttribute('data-index')));
      const format = await showFormatSelectionDialog();
      if (!format) return;
      const saveFolder = await window.electron.getSaveFolder();
      const playlistTitle = currentPlaylist.title || 'Playlist';
      const safePlaylistTitle = playlistTitle.replace(/[\\/:*?"<>|]/g, '_');
      const baseFolder = `${saveFolder}/${safePlaylistTitle}`;
      for (const index of selectedIndices) {
        const item = currentPlaylist.entries[index];
        if (!item) continue;
        const indexPadded = String(index + 1).padStart(2, '0');
        let filename = `${indexPadded} - ${item.title.replace(/[\\/:*?"<>|]/g, '_')}`;
        const ext = format.isAudio ? 'mp3' : 'mp4';
        let outputPath = `${baseFolder}/${filename}.${ext}`;
        if (await window.electron.checkFileExists(outputPath)) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          outputPath = `${baseFolder}/${filename}_${timestamp}.${ext}`;
        }
        if (typeof window.addToQueue === 'function') {
          await window.addToQueue({
            url: item.url,
            title: item.title,
            format: format.formatId,
            isAudio: format.isAudio,
            outputPath,
            thumbnail: item.thumbnail || null,
            qualityLabel: format.isAudio ? 'Audio' : 'Video'
          });
        }
      }
      NotificationManager.success(`Added ${selectedIndices.length} item(s) to queue`);
    });
  }
  
  if (downloadAllBtn) {
    downloadAllBtn.addEventListener('click', async () => {
      if (!currentPlaylist || !currentPlaylist.entries || currentPlaylist.entries.length === 0) {
        NotificationManager.error('No playlist available');
        return;
      }
      const allIndices = currentPlaylist.entries.map((_, index) => index);
      const format = await showFormatSelectionDialog();
      if (!format) return;
      await downloadMultiplePlaylistItems(allIndices, format);
    });
  }
}

// Download a single playlist item
async function downloadSinglePlaylistItem(index, qualityOption) {
  if (!currentPlaylist || !currentPlaylist.entries[index]) {
    NotificationManager.error('Playlist item not found');
    return;
  }
  
  const item = currentPlaylist.entries[index];
  
  try {
    let format, isAudio;
    
    if (qualityOption === 'audio') {
      format = 'audio-320';
      isAudio = true;
    } else {
      format = 'best-mp4';
      isAudio = false;
    }
    
    showDownloadProgress();
    
    const saveFolder = await window.electron.getSaveFolder();
    
    const playlistTitle = currentPlaylist.title || 'Playlist';
    const safePlaylistTitle = playlistTitle.replace(/[\\/:*?"<>|]/g, '_');
    const indexPadded = String(index + 1).padStart(2, '0');
    const baseFolder = `${saveFolder}/${safePlaylistTitle}`;
    let filename = `${indexPadded} - ${item.title.replace(/[\\/:*?"<>|]/g, '_')}`;
    const ext = isAudio ? 'mp3' : 'mp4';
    let outputPath = `${baseFolder}/${filename}.${ext}`;
    
    const fileExists = await window.electron.checkFileExists(outputPath);
    
    if (fileExists) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      outputPath = `${baseFolder}/${filename}_${timestamp}.${ext}`;
      NotificationManager.info('File already exists. Adding timestamp to filename.');
    }
    
    await window.electron.downloadVideo({
      url: item.url,
      format: format,
      isAudio: isAudio,
      outputPath: outputPath
    });
    
    await window.electron.addToHistory({
      title: item.title,
      url: item.url,
      thumbnail: item.thumbnail,
      outputPath: outputPath,
      quality: isAudio ? 'Audio' : 'Best quality',
      isAudio: isAudio,
      downloadedAt: new Date().toISOString()
    });
    
    NotificationManager.success(`Downloaded: ${item.title}`);
    
  } catch (error) {
    console.error('Error downloading playlist item:', error);
    NotificationManager.error(`Failed to download: ${error.message || 'Unknown error'}`);
  } finally {
    // Hide progress UI after a delay
    setTimeout(() => {
      hideDownloadProgress();
    }, 1000);
  }
}

// Download multiple playlist items
async function downloadMultiplePlaylistItems(indices, format) {
  if (!currentPlaylist || !currentPlaylist.entries) {
    NotificationManager.error('No playlist available');
    return;
  }
  
  try {
    showDownloadProgress();
    document.querySelector('#downloadProgress h5').textContent = 
      `Downloading ${indices.length} videos from playlist...`;
    
    const saveFolder = await window.electron.getSaveFolder();
    const playlistTitle = currentPlaylist.title || 'Playlist';
    const safePlaylistTitle = playlistTitle.replace(/[\\/:*?"<>|]/g, '_');
    const baseFolder = `${saveFolder}/${safePlaylistTitle}`;
    
    let completed = 0;
    let failed = 0;
    
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      const item = currentPlaylist.entries[index];
      
      try {
        document.querySelector('#downloadProgress h5').textContent = 
          `Downloading (${i+1}/${indices.length}): ${item.title}`;
        
        const indexPadded = String(index + 1).padStart(2, '0');
        let filename = `${indexPadded} - ${item.title.replace(/[\\/:*?"<>|]/g, '_')}`;
        const ext = format.isAudio ? 'mp3' : 'mp4';
        let outputPath = `${baseFolder}/${filename}.${ext}`;
        
        const fileExists = await window.electron.checkFileExists(outputPath);
        
        if (fileExists) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          outputPath = `${baseFolder}/${filename}_${timestamp}.${ext}`;
        }
        
        await window.electron.downloadVideo({
          url: item.url,
          format: format.formatId,
          isAudio: format.isAudio,
          outputPath: outputPath
        });
        
        // Add to history
        await window.electron.addToHistory({
          title: item.title,
          url: item.url,
          thumbnail: item.thumbnail,
          outputPath: outputPath,
          quality: format.isAudio ? 'Audio' : 'Best quality',
          isAudio: format.isAudio,
          downloadedAt: new Date().toISOString()
        });
        
        completed++;
      } catch (error) {
        console.error(`Error downloading item ${index}:`, error);
        failed++;
      }
    }
    
    // Show summary notification
    NotificationManager.success(`Downloaded ${completed} out of ${indices.length} videos. Failed: ${failed}`);
    
  } catch (error) {
    console.error('Error downloading playlist:', error);
    NotificationManager.error(`Failed to download playlist: ${error.message || 'Unknown error'}`);
  } finally {
    // Hide progress UI after a delay
    setTimeout(() => {
      hideDownloadProgress();
    }, 1000);
  }
}

// Show format selection dialog for playlist downloads
async function showFormatSelectionDialog() {
  return new Promise((resolve) => {
    const overlayEl = document.createElement('div');
    overlayEl.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
    
    overlayEl.innerHTML = `
      <div class="glass-card w-11/12 max-w-md p-6 animate-fade-in">
        <h3 class="text-xl font-bold mb-4">Select Download Format</h3>
        <div class="space-y-4 mb-6">
          <label class="flex items-center p-3 border border-secondary-200 dark:border-secondary-700 rounded-lg cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-800">
            <input type="radio" name="formatOption" value="best" class="w-5 h-5 text-primary-600" checked>
            <div class="ml-3">
              <div class="font-medium">Best (MP4)</div>
              <div class="text-xs text-secondary-500 dark:text-secondary-400">Best quality with MP4 container</div>
            </div>
          </label>
          
          <label class="flex items-center p-3 border border-secondary-200 dark:border-secondary-700 rounded-lg cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-800">
            <input type="radio" name="formatOption" value="720p" class="w-5 h-5 text-primary-600">
            <div class="ml-3">
              <div class="font-medium">Medium Quality (MP4)</div>
              <div class="text-xs text-secondary-500 dark:text-secondary-400">720p resolution with audio</div>
            </div>
          </label>
          
          <label class="flex items-center p-3 border border-secondary-200 dark:border-secondary-700 rounded-lg cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-800">
            <input type="radio" name="formatOption" value="audio" class="w-5 h-5 text-primary-600">
            <div class="ml-3">
              <div class="font-medium">Audio Only (MP3)</div>
              <div class="text-xs text-secondary-500 dark:text-secondary-400">Best audio quality (320 kbps)</div>
            </div>
          </label>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button id="cancelFormat" class="px-4 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors btn-animate">
            Cancel
          </button>
          <button id="confirmFormat" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors btn-animate">
            Download
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlayEl);
    
    document.getElementById('cancelFormat').addEventListener('click', () => {
      gsap.to(overlayEl.firstElementChild, {
        scale: 0.9,
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
          document.body.removeChild(overlayEl);
          resolve(null);
        }
      });
    });
    
    document.getElementById('confirmFormat').addEventListener('click', () => {
      const formatOption = document.querySelector('input[name="formatOption"]:checked').value;
      let formatId, isAudio;
      
      switch (formatOption) {
        case 'audio':
          formatId = 'audio-320';
          isAudio = true;
          break;
        case '720p':
          formatId = 'res-720';
          isAudio = false;
          break;
        default:
          formatId = 'best-mp4';
          isAudio = false;
      }
      
      gsap.to(overlayEl.firstElementChild, {
        scale: 0.9,
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
          document.body.removeChild(overlayEl);
          resolve({ formatId, isAudio });
        }
      });
    });
    
    gsap.fromTo(overlayEl.firstElementChild,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.3 }
    );
  });
}

// Format duration in seconds to mm:ss or hh:mm:ss
function formatDuration(seconds) {
  if (!seconds) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
} 