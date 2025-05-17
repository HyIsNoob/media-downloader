/**
 * UI Manager module
 * Handles UI updates and interactions
 */
export class UIManager {
  constructor() {
    this.currentPage = 'home';
    this.currentVideoInfo = null;
    this.selectedFormat = null;
  }
  
  /**
   * Initialize UI
   */
  init() {
    this.showPage(this.currentPage);
  }
  
  /**
   * Show a specific page
   * @param {string} pageId - The page ID to show
   */
  showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    
    // Deactivate all nav links
    document.querySelectorAll('.nav-link').forEach(navLink => {
      navLink.classList.remove('active');
      navLink.classList.add('text-white');
    });
    
    // Show the selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.classList.add('active');
    }
    
    // Activate the nav link
    const targetNavLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (targetNavLink) {
      targetNavLink.classList.add('active');
      targetNavLink.classList.remove('text-white');
    }
    
    this.currentPage = pageId;
  }
  
  /**
   * Display video information
   * @param {Object} info - Video information
   */
  displayVideoInfo(info) {
    this.currentVideoInfo = info;
    
    // Show video info card
    const videoInfoCard = document.getElementById('videoInfo');
    videoInfoCard.classList.remove('d-none');
    
    // Update video info elements
    document.getElementById('thumbnail').src = info.thumbnail || '';
    document.getElementById('videoTitle').textContent = info.title || '';
    document.getElementById('channelName').textContent = info.channel || '';
    document.getElementById('viewCount').textContent = `${formatNumber(info.viewCount)} views • ${formatNumber(info.likeCount)} likes`;
    document.getElementById('description').textContent = info.description || '';
    document.getElementById('uploadDate').textContent = formatDate(info.uploadDate);
    document.getElementById('duration').textContent = formatDuration(info.duration);
  }  /**
   * Display format options
   * @param {Array} formats - Available formats
   */
  displayFormatOptions(formats) {
    const formatSelection = document.getElementById('formatSelection');
    const videoFormatsList = document.getElementById('videoFormatsList');
    const audioFormatsList = document.getElementById('audioFormatsList');
    
    console.log('Displaying formats:', formats);
    
    // Completely remove all existing elements and format type switcher
    videoFormatsList.innerHTML = '';
    audioFormatsList.innerHTML = '';
    
    // Remove any existing format type switcher
    const existingSwitcher = document.querySelector('.format-type-switcher');
    if (existingSwitcher) {
      existingSwitcher.remove();
    }
    
    // Show format selection
    formatSelection.classList.remove('d-none');
    
    // Group formats
    const videoFormats = formats.filter(f => !f.isAudioOnly);
    const audioFormats = formats.filter(f => f.isAudioOnly);
    
    // Sort by quality (resolution for video, bitrate for audio)
    videoFormats.sort((a, b) => {
      // Sort by height (resolution) descending (highest first)
      if (a.height && b.height) {
        return b.height - a.height;
      }
      return 0;
    });
    
    // Create format type selector
    const formatTypeSwitcher = document.createElement('div');
    formatTypeSwitcher.className = 'format-type-switcher mb-3';
    formatTypeSwitcher.innerHTML = `
      <div class="btn-group w-100" role="group">
        <input type="radio" class="btn-check" name="formatType" id="btnVideo" autocomplete="off" checked>
        <label class="btn btn-outline-primary" for="btnVideo">
          <i class="bi bi-film me-2"></i>Video (MP4)
        </label>
        <input type="radio" class="btn-check" name="formatType" id="btnAudio" autocomplete="off">
        <label class="btn btn-outline-primary" for="btnAudio">
          <i class="bi bi-music-note me-2"></i>Audio Only (MP3)
        </label>
      </div>
    `;
    
    // Get the card body to insert the switcher at the beginning
    const cardBody = formatSelection.querySelector('.card-body');
    if (cardBody) {
      // Insert the switcher at the beginning of the card body
      cardBody.insertBefore(formatTypeSwitcher, cardBody.firstChild);
    } else {
      // Fallback if the structure changed
      console.log('Card body not found, appending to formatSelection');
      formatSelection.appendChild(formatTypeSwitcher);
    }
    
    // Set up event listeners for the format type switcher
    document.getElementById('btnVideo').addEventListener('change', function() {
      videoFormatsList.classList.remove('d-none');
      audioFormatsList.classList.add('d-none');
    });
    
    document.getElementById('btnAudio').addEventListener('change', function() {
      videoFormatsList.classList.add('d-none');
      audioFormatsList.classList.remove('d-none');
    });
    
    // Add heading for video formats
    const videoHeading = document.createElement('div');
    videoHeading.className = 'format-category-heading';
    videoHeading.innerHTML = `<h5 class="mb-3 mt-2">Select Video Quality</h5>`;
    videoFormatsList.appendChild(videoHeading);
    
    // Add "Best Quality" option at the top
    const bestQualityOption = document.createElement('a');
    bestQualityOption.href = '#';
    bestQualityOption.className = 'list-group-item list-group-item-action format-item';
    bestQualityOption.setAttribute('data-format-id', 'best');
    bestQualityOption.setAttribute('data-is-audio', 'false');
    
    bestQualityOption.innerHTML = `
      <div class="d-flex w-100 justify-content-between">
        <h5 class="mb-1 format-name">
          <i class="bi bi-stars me-2"></i>Best
        </h5>
        <small><i class="bi bi-check-circle-fill text-success"></i></small>
      </div>
      <p class="mb-1">
        <small>
          <span class="badge bg-success me-1">MP4 with Best Audio</span>
          <span class="badge bg-primary">Recommended</span>
        </small>
      </p>
    `;
    
    videoFormatsList.appendChild(bestQualityOption);
    
    // Add video formats to list with quality labels
    videoFormats.forEach(format => {
      const formatItem = document.createElement('a');
      formatItem.href = '#';
      formatItem.className = 'list-group-item list-group-item-action format-item';
      formatItem.setAttribute('data-format-id', format.formatId);
      formatItem.setAttribute('data-is-audio', 'false');
      
      // Get the quality label from the format note
      const qualityLabel = format.formatNote || `${format.height}p`;
      
      // Show filesize with proper formatting
      const fileSize = format.filesize ? `(${formatFileSize(format.filesize)})` : '';
      
      // Simplified display with clearer quality indicators
      formatItem.innerHTML = `
        <div class="d-flex w-100 justify-content-between">
          <h5 class="mb-1 format-name">
            <i class="bi bi-film me-2"></i>${qualityLabel}
          </h5>
          <small>${fileSize}</small>
        </div>
        <p class="mb-1">
          <small>
            <span class="badge bg-success me-1">MP4 with Audio</span>
            ${format.tbr ? `<span class="badge bg-light text-dark">${Math.round(format.tbr)}kbps</span>` : ''}
          </small>
        </p>
      `;
      
      videoFormatsList.appendChild(formatItem);
    });
    
    // Add heading for audio formats
    const audioHeading = document.createElement('div');
    audioHeading.className = 'format-category-heading';
    audioHeading.innerHTML = `<h5 class="mb-3 mt-2">Select Audio Quality</h5>`;
    audioFormatsList.appendChild(audioHeading);
    
    // Initially hide audio formats (video is default)
    audioFormatsList.classList.add('d-none');

    // Sort audio formats - highest quality first  
    audioFormats.sort((a, b) => {
      // Extract bitrate from format note for sorting
      const getBitrate = (format) => {
        const note = format.formatNote || '';
        const match = note.match(/(\d+)kbps/);
        return match ? parseInt(match[1]) : 0;
      };
      return getBitrate(b) - getBitrate(a);
    });
      
    // Add audio formats to list
    audioFormats.forEach(format => {
      const formatItem = document.createElement('a');
      formatItem.href = '#';
      formatItem.className = 'list-group-item list-group-item-action format-item';
      formatItem.setAttribute('data-format-id', format.formatId);
      formatItem.setAttribute('data-is-audio', 'true');
      
      // Format audio quality with clear bitrate labels
      const formatNote = format.formatNote || 'Audio';
      const fileSize = format.filesize ? `(${formatFileSize(format.filesize)})` : '';
      const qualityLabel = format.quality || '';
      
      // Create badge color based on quality
      let badgeColor = 'bg-success';
      if (formatNote.includes('128')) {
        badgeColor = 'bg-secondary';
      } else if (formatNote.includes('192')) {
        badgeColor = 'bg-primary';
      }
      
      // Add icon and quality indicators for audio formats
      formatItem.innerHTML = `
        <div class="d-flex w-100 justify-content-between">
          <h5 class="mb-1 format-name">
            <i class="bi bi-music-note me-2"></i>${formatNote}
          </h5>
          <small>${fileSize}</small>
        </div>
        <p class="mb-1">
          <small>
            <span class="badge bg-primary me-1">MP3</span>
            <span class="badge ${badgeColor}">${qualityLabel}</span>
          </small>
        </p>
      `;
      
      audioFormatsList.appendChild(formatItem);
    });
  }
  
  /**
   * Select a format
   * @param {HTMLElement} formatElement - The selected format element
   */
  selectFormat(formatElement) {
    // Remove selection from all formats
    document.querySelectorAll('.format-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // Add selection to the clicked format
    formatElement.classList.add('selected');
    
    this.selectedFormat = {
      formatId: formatElement.getAttribute('data-format-id'),
      isAudio: formatElement.getAttribute('data-is-audio') === 'true'
    };
  }
  
  /**
   * Reset format selection
   */
  resetFormatSelection() {
    document.getElementById('videoInfo').classList.add('d-none');
    document.getElementById('formatSelection').classList.add('d-none');
    document.getElementById('downloadProgress').classList.add('d-none');
  }
  
  /**
   * Show download progress UI
   */
  showDownloadProgress() {
    document.getElementById('downloadProgress').classList.remove('d-none');
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('downloadSpeed').textContent = '0 KB/s';
    document.getElementById('downloadedSize').textContent = '0 MB';
    document.getElementById('totalSize').textContent = '0 MB';
    document.getElementById('eta').textContent = '00:00';
  }
  
  /**
   * Hide download progress UI
   */
  hideDownloadProgress() {
    document.getElementById('downloadProgress').classList.add('d-none');
  }
    /**
   * Update download progress
   * @param {Object} progress - Progress information
   */
  updateDownloadProgress(progress) {
    // Update UI elements with progress information
    try {
      console.log('Progress update:', progress);
      
      // Make sure we have valid progress data
      if (!progress || typeof progress !== 'object') {
        console.warn('Invalid progress data received:', progress);
        return;
      }
      
      // Update progress bar
      let percent = 0;
      if (typeof progress.percent === 'number') {
        percent = Math.min(100, Math.max(0, progress.percent)); // Ensure between 0-100
      } else if (progress.total && progress.downloaded) {
        // Calculate percent if not directly provided
        percent = Math.min(100, Math.max(0, (progress.downloaded / progress.total) * 100));
      }
      
      // Apply updates to UI
      const progressBar = document.getElementById('progressBar');
      progressBar.style.width = `${percent}%`;
      progressBar.setAttribute('aria-valuenow', percent);
      
      // Update speed display with fallback
      document.getElementById('downloadSpeed').textContent = progress.speed || '0 KB/s';
      
      // Format downloaded size properly 
      const downloaded = typeof progress.downloaded === 'number' ? progress.downloaded.toFixed(2) : '0';
      const downloadedEl = document.getElementById('downloadedSize');
      downloadedEl.textContent = `${downloaded} ${progress.unit || 'MB'}`;
      
      // Format total size properly
      const total = typeof progress.total === 'number' ? progress.total.toFixed(2) : '0';
      const totalEl = document.getElementById('totalSize');
      totalEl.textContent = `${total} ${progress.unit || 'MB'}`;
      
      // Update ETA with fallback
      document.getElementById('eta').textContent = progress.eta || '00:00';
      
      // Add visual indication that progress is actively updating
      const progressContainer = document.getElementById('downloadProgress');
      progressContainer.classList.add('active-download');
      
      // Remove the active class after a short time to create a pulse effect
      setTimeout(() => {
        progressContainer.classList.remove('active-download');
      }, 300);
    } catch (error) {
      console.error('Error updating download progress UI:', error);
    }
  }
  
  /**
   * Display playlist information
   * @param {Object} playlist - Playlist information
   */
  displayPlaylistInfo(playlist) {
    const playlistInfo = document.getElementById('playlistInfo');
    const playlistItems = document.getElementById('playlistItems');
    const videoCount = document.getElementById('videoCount');
    
    // Show playlist info
    playlistInfo.classList.remove('d-none');
    videoCount.textContent = playlist.entries.length;
    
    // Clear existing items
    playlistItems.innerHTML = '';
    
    // Add playlist items with checkboxes
    playlist.entries.forEach((video, index) => {
      const item = document.createElement('div');
      item.className = 'list-group-item playlist-item';
      
      // Format duration if available
      const duration = video.duration ? formatDuration(video.duration) : '';
      
      item.innerHTML = `
        <div class="d-flex align-items-center w-100">
          <div class="form-check">
            <input class="form-check-input playlist-item-checkbox" type="checkbox" value="${index}" data-index="${index}" id="playlist-item-${index}">
          </div>
          <div class="ms-2 thumbnail-container position-relative">
            <img src="${video.thumbnail}" class="rounded thumbnail" alt="Thumbnail">
            ${duration ? `<span class="duration-badge">${duration}</span>` : ''}
          </div>
          <div class="ms-3 flex-grow-1">
            <p class="mb-0 fw-medium">${video.title}</p>
            <small class="text-muted">${duration || 'Unknown duration'}</small>
          </div>
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">
              Download
            </button>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item download-playlist-item" href="#" data-index="${index}" data-quality="best">Best Quality</a></li>
              <li><a class="dropdown-item download-playlist-item" href="#" data-index="${index}" data-quality="720p">720p</a></li>
              <li><a class="dropdown-item download-playlist-item" href="#" data-index="${index}" data-quality="audio">Audio Only</a></li>
            </ul>
          </div>
        </div>
      `;
      
      playlistItems.appendChild(item);
    });
    
    // Add custom styles for playlist items
    const style = document.createElement('style');
    style.textContent = `
      .playlist-item {
        padding: 12px;
        transition: background-color 0.2s;
      }
      .playlist-item:hover {
        background-color: #f8f9fa;
      }
      .playlist-item .thumbnail-container {
        width: 120px;
        height: 67px;
        overflow: hidden;
        border-radius: 4px;
      }
      .playlist-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .playlist-item .dropdown {
        margin-left: 10px;
      }
    `;
    
    // Add style to head if it doesn't exist already
    if (!document.getElementById('playlist-item-styles')) {
      style.id = 'playlist-item-styles';
      document.head.appendChild(style);
    }
  }
  
  /**
   * Get current video info
   * @returns {Object} - Current video info
   */
  getCurrentVideoInfo() {
    return this.currentVideoInfo;
  }
}

// Helper functions
function formatNumber(num) {
  if (!num) return '0';
  return new Intl.NumberFormat().format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  
  // Convert YYYYMMDD to YYYY-MM-DD
  if (dateStr.length === 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    dateStr = `${year}-${month}-${day}`;
  }
  
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  
  return `${size.toFixed(2)} ${units[i]}`;
}
