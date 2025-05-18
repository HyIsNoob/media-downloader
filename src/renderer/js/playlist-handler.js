// playlist-handler.js - Handles playlist functionality
// Using globals instead of imports
// import { NotificationManager } from './ui-utils.js';
// import gsap from 'gsap';
// import { showDownloadProgress, hideDownloadProgress } from './download-manager.js';

// Store current playlist
let currentPlaylist = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setupPlaylistPage();
  
  // Make currentPlaylist accessible globally
  window.currentPlaylist = currentPlaylist;
});

// Setup playlist page
function setupPlaylistPage() {
  const fetchPlaylistBtn = document.getElementById('fetchPlaylistBtn');
  const playlistUrlInput = document.getElementById('playlistUrlInput');
  
  if (!fetchPlaylistBtn || !playlistUrlInput) return;
  
  // Get playlist info on button click
  fetchPlaylistBtn.addEventListener('click', async () => {
    const url = playlistUrlInput.value.trim();
    
    if (!url) {
      NotificationManager.error('Please enter a valid playlist URL');
      return;
    }
    
    try {
      // Show loading state
      fetchPlaylistBtn.disabled = true;
      const originalText = fetchPlaylistBtn.innerHTML;
      fetchPlaylistBtn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin me-2"></i> Loading...';
      
      // Fetch playlist info
      const playlist = await window.electron.getPlaylistInfo(url);
      
      if (!playlist || !playlist.entries || playlist.entries.length === 0) {
        throw new Error('No videos found in playlist');
      }
      
      // Store current playlist
      currentPlaylist = playlist;
      
      // Display playlist info
      displayPlaylistInfo(playlist);
      
      // Setup select all button
      setupSelectionButtons();
      
    } catch (error) {
      console.error('Error fetching playlist:', error);
      NotificationManager.error(`Failed to fetch playlist: ${error.message || 'Unknown error'}`);
    } finally {
      // Reset button state
      fetchPlaylistBtn.disabled = false;
      fetchPlaylistBtn.innerHTML = originalText;
    }
  });
  
  // Enable pressing Enter in URL input
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
  
  // Show playlist info section
  playlistInfo.classList.remove('d-none');
  
  // Clear previous items
  playlistItems.innerHTML = '';
  
  // Update video count
  videoCount.textContent = playlist.entries.length;
  
  // Create playlist item cards with staggered animation
  playlist.entries.forEach((item, index) => {
    const playlistItem = createPlaylistItemCard(item, index);
    playlistItems.appendChild(playlistItem);
    
    // Animate entry
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
  // Create container
  const playlistItem = document.createElement('div');
  playlistItem.className = 'glass-card p-4 hover:shadow-lg transition-shadow duration-300';
  
  // Format duration
  const duration = formatDuration(item.duration);
  
  // Set card content
  playlistItem.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="flex items-center mb-3">
        <input type="checkbox" class="playlist-item-checkbox w-5 h-5 rounded border-secondary-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-500" data-index="${index}">
        <span class="ml-2 text-secondary-500 dark:text-secondary-400 text-sm">#${index + 1}</span>
      </div>
      <div class="relative rounded-lg overflow-hidden mb-3">
        <img src="${item.thumbnail || './assets/placeholder.png'}" class="w-full h-32 object-cover" alt="Thumbnail">
        <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          ${duration}
        </div>
      </div>
      <h3 class="text-base font-medium mb-2 line-clamp-2" title="${item.title}">${item.title}</h3>
      <div class="mt-auto">
        <div class="flex justify-between gap-2">
          <button class="download-playlist-item px-3 py-1.5 flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm flex items-center justify-center transition-colors btn-animate" data-index="${index}" data-quality="best">
            <i class="bi bi-download me-1"></i> MP4
          </button>
          <button class="download-playlist-item px-3 py-1.5 flex-1 bg-secondary-200 hover:bg-secondary-300 dark:bg-secondary-700 dark:hover:bg-secondary-600 rounded text-sm flex items-center justify-center transition-colors btn-animate" data-index="${index}" data-quality="audio">
            <i class="bi bi-music-note-beamed me-1"></i> MP3
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners for download buttons
  playlistItem.querySelectorAll('.download-playlist-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      await downloadSinglePlaylistItem(index, btn.getAttribute('data-quality'));
    });
  });
  
  return playlistItem;
}

// Setup select all and download selected buttons
function setupSelectionButtons() {
  const selectAllBtn = document.getElementById('selectAllBtn');
  const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
  
  if (!selectAllBtn || !downloadSelectedBtn) return;
  
  // Select/deselect all
  selectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.playlist-item-checkbox');
    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
    
    checkboxes.forEach(checkbox => {
      checkbox.checked = !allChecked;
    });
  });
  
  // Download selected
  downloadSelectedBtn.addEventListener('click', async () => {
    const selectedCheckboxes = document.querySelectorAll('.playlist-item-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
      NotificationManager.error('Please select at least one video to download');
      return;
    }
    
    // Get selected item indices
    const selectedIndices = Array.from(selectedCheckboxes).map(checkbox => {
      return parseInt(checkbox.getAttribute('data-index'));
    });
    
    // Show format selection dialog
    const format = await showFormatSelectionDialog();
    
    if (!format) return; // User cancelled
    
    await downloadMultiplePlaylistItems(selectedIndices, format);
  });
}

// Download a single playlist item
async function downloadSinglePlaylistItem(index, qualityOption) {
  if (!currentPlaylist || !currentPlaylist.entries[index]) {
    NotificationManager.error('Playlist item not found');
    return;
  }
  
  const item = currentPlaylist.entries[index];
  
  try {
    // Convert quality option to format and isAudio
    let format, isAudio;
    
    if (qualityOption === 'audio') {
      format = 'bestaudio';
      isAudio = true;
    } else {
      format = 'bestvideo+bestaudio';
      isAudio = false;
    }
    
    // Show download progress
    showDownloadProgress();
    
    // Get save folder
    const saveFolder = await window.electron.getSaveFolder();
    
    // Create filename
    let filename = item.title.replace(/[\\/:*?"<>|]/g, '_');
    const ext = isAudio ? 'mp3' : 'mp4';
    let outputPath = `${saveFolder}/${filename}.${ext}`;
    
    // Check if file exists
    const fileExists = await window.electron.checkFileExists(outputPath);
    
    if (fileExists) {
      // Add timestamp to filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      outputPath = `${saveFolder}/${filename}_${timestamp}.${ext}`;
      NotificationManager.info('File already exists. Adding timestamp to filename.');
    }
    
    // Start download
    await window.electron.downloadVideo({
      url: item.url,
      format: format,
      isAudio: isAudio,
      outputPath: outputPath
    });
    
    // Add to history
    await window.electron.addToHistory({
      title: item.title,
      url: item.url,
      thumbnail: item.thumbnail,
      outputPath: outputPath,
      quality: isAudio ? 'Audio' : 'Best quality',
      isAudio: isAudio,
      downloadedAt: new Date().toISOString()
    });
    
    // Show success notification
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
    // Show download progress with multiple items message
    showDownloadProgress();
    document.querySelector('#downloadProgress h5').textContent = 
      `Downloading ${indices.length} videos from playlist...`;
    
    // Get save folder
    const saveFolder = await window.electron.getSaveFolder();
    
    // Download each item
    let completed = 0;
    let failed = 0;
    
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      const item = currentPlaylist.entries[index];
      
      try {
        // Update progress message
        document.querySelector('#downloadProgress h5').textContent = 
          `Downloading (${i+1}/${indices.length}): ${item.title}`;
        
        // Create filename
        let filename = item.title.replace(/[\\/:*?"<>|]/g, '_');
        const ext = format.isAudio ? 'mp3' : 'mp4';
        let outputPath = `${saveFolder}/${filename}.${ext}`;
        
        // Check if file exists
        const fileExists = await window.electron.checkFileExists(outputPath);
        
        if (fileExists) {
          // Add timestamp to filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          outputPath = `${saveFolder}/${filename}_${timestamp}.${ext}`;
        }
        
        // Download
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
    // Create modal overlay
    const overlayEl = document.createElement('div');
    overlayEl.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
    
    // Create dialog content
    overlayEl.innerHTML = `
      <div class="glass-card w-11/12 max-w-md p-6 animate-fade-in">
        <h3 class="text-xl font-bold mb-4">Select Download Format</h3>
        <div class="space-y-4 mb-6">
          <label class="flex items-center p-3 border border-secondary-200 dark:border-secondary-700 rounded-lg cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-800">
            <input type="radio" name="formatOption" value="best" class="w-5 h-5 text-primary-600" checked>
            <div class="ml-3">
              <div class="font-medium">Best Quality (MP4)</div>
              <div class="text-xs text-secondary-500 dark:text-secondary-400">Highest resolution available with audio</div>
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
              <div class="text-xs text-secondary-500 dark:text-secondary-400">Best audio quality, no video</div>
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
    
    // Add to DOM
    document.body.appendChild(overlayEl);
    
    // Add event listeners
    document.getElementById('cancelFormat').addEventListener('click', () => {
      // Remove dialog with animation
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
      // Get selected format
      const formatOption = document.querySelector('input[name="formatOption"]:checked').value;
      let formatId, isAudio;
      
      switch (formatOption) {
        case 'audio':
          formatId = 'bestaudio';
          isAudio = true;
          break;
        case '720p':
          formatId = 'bestvideo[height<=720]+bestaudio';
          isAudio = false;
          break;
        default:
          formatId = 'bestvideo+bestaudio';
          isAudio = false;
      }
      
      // Remove dialog with animation
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
    
    // Animate dialog entry
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