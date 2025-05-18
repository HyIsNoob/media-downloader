// video-info.js - Handles video information fetching and display
// Using global NotificationManager from app-bundle.js instead of importing
// Import { NotificationManager } from './ui-utils.js';
// Using global gsap loaded from script tag
// import gsap from 'gsap';

// Store current video information
let currentVideoInfo = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get elements
  const urlInput = document.getElementById('urlInput');
  const fetchBtn = document.getElementById('fetchBtn');
  
  console.log('DOM Content Loaded in video-info.js');
  console.log('URL Input element:', urlInput);
  console.log('Fetch Button element:', fetchBtn);
  
  // Directly attach the event listener to the fetchBtn here
  if (fetchBtn) {
    console.log('Attaching direct click handler to Fetch button');
    fetchBtn.onclick = async function() {
      console.log('Fetch button clicked (direct handler)');
      const url = urlInput.value.trim();
      
      if (!url) {
        if (window.NotificationManager) {
          window.NotificationManager.error('Please enter a valid URL');
        } else {
          alert('Please enter a valid URL');
        }
        return;
      }
      
      if (!isValidURL(url)) {
        if (window.NotificationManager) {
          window.NotificationManager.error('Only YouTube, Facebook, and TikTok URLs are supported');
        } else {
          alert('Only YouTube, Facebook, and TikTok URLs are supported');
        }
        return;
      }
      
      try {
        // Show loading state
        fetchBtn.disabled = true;
        const originalButtonText = fetchBtn.innerHTML;  // Store the original button text
        fetchBtn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin me-2"></i> Loading...';
        
        // Reset UI
        resetVideoInfo();
        
        console.log('Calling window.electron.getVideoInfo with URL:', url);
        
        if (!window.electron || !window.electron.getVideoInfo) {
          throw new Error('Electron API is not available');
        }
        
        // Fetch video info through IPC
        const info = await window.electron.getVideoInfo(url);
        console.log('Video info received:', info);
        
        if (!info || !info.formats || info.formats.length === 0) {
          throw new Error('No valid formats found for this video');
        }
        
        // Store current video info
        currentVideoInfo = info;
        window.currentVideoInfo = info; // Update the global reference
        
        // Display video info with animation
        displayVideoInfo(info);
        
        // Show format selection
        displayFormatOptions(info.formats);
        
      } catch (error) {
        console.error('Error fetching video info:', error);
        if (window.NotificationManager) {
          window.NotificationManager.error(`Failed to fetch video info: ${error.message || 'Unknown error'}`);
        } else {
          alert(`Failed to fetch video info: ${error.message || 'Unknown error'}`);
        }
      } finally {
        // Reset button state
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = originalButtonText;  // Use the stored original button text
      }
    };
    
    // Also handle enter key in URL input
    if (urlInput) {
      urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          fetchBtn.click();
        }
      });
    }
  }
  
  // Setup clipboard detection
  setupClipboardDetection();
  
  // Make variables and functions globally accessible after they're defined
  window.currentVideoInfo = currentVideoInfo;
  window.getSelectedFormat = getSelectedFormat;
});

// Set up event listeners for the video info section
function setupEventListeners() {
  const urlInput = document.getElementById('urlInput');
  const fetchBtn = document.getElementById('fetchBtn');
  
  console.log('Setting up fetch button handler');
  
  // Event listener for fetch button
  fetchBtn.addEventListener('click', async () => {
    console.log('Fetch button clicked');
    const url = urlInput.value.trim();
    
    if (!url) {
      if (window.NotificationManager) {
        window.NotificationManager.error('Please enter a valid URL');
      } else {
        alert('Please enter a valid URL');
      }
      return;
    }
    
    if (!isValidURL(url)) {
      if (window.NotificationManager) {
        window.NotificationManager.error('Only YouTube, Facebook, and TikTok URLs are supported');
      } else {
        alert('Only YouTube, Facebook, and TikTok URLs are supported');
      }
      return;
    }
    
    try {
      // Show loading state
      fetchBtn.disabled = true;
      const originalText = fetchBtn.innerHTML;
      fetchBtn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin me-2"></i> Loading...';
      
      // Reset UI
      resetVideoInfo();
      
      console.log('Calling window.electron.getVideoInfo with URL:', url);
      console.log('window.electron available?', !!window.electron);
      console.log('window.electron.getVideoInfo available?', !!window.electron?.getVideoInfo);
      
      if (!window.electron || !window.electron.getVideoInfo) {
        throw new Error('Electron API is not available');
      }
      
      // Fetch video info through IPC
      const info = await window.electron.getVideoInfo(url);
      console.log('Video info received:', info);
      
      if (!info || !info.formats || info.formats.length === 0) {
        throw new Error('No valid formats found for this video');
      }
      
      // Store current video info
      currentVideoInfo = info;
      window.currentVideoInfo = info; // Update the global reference
      
      // Display video info with animation
      displayVideoInfo(info);
      
      // Show format selection
      displayFormatOptions(info.formats);
      
    } catch (error) {
      console.error('Error fetching video info:', error);
      if (window.NotificationManager) {
        window.NotificationManager.error(`Failed to fetch video info: ${error.message || 'Unknown error'}`);
      } else {
        alert(`Failed to fetch video info: ${error.message || 'Unknown error'}`);
      }
    } finally {
      // Reset button state
      fetchBtn.disabled = false;
      fetchBtn.innerHTML = originalText;
    }
  });
  
  // Enable pressing Enter in URL input
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      fetchBtn.click();
    }
  });
}

// Set up clipboard detection for video URLs
function setupClipboardDetection() {
  // This is now managed centrally by settings-manager.js
  console.log('Clipboard detection is managed by settings-manager.js');
  // No longer need to set up a separate interval here
}

// Reset video info UI
function resetVideoInfo() {
  // Hide video info and format selection
  document.getElementById('videoInfo').classList.add('d-none');
  document.getElementById('formatSelection').classList.add('d-none');
  
  // Reset video info elements
  document.getElementById('videoTitle').textContent = '';
  document.getElementById('channelName').textContent = '';
  document.getElementById('duration').textContent = '';
  document.getElementById('uploadDate').textContent = '';
  document.getElementById('viewCount').textContent = '';
  document.getElementById('description').textContent = '';
  document.getElementById('thumbnail').src = '';
  
  // Reset format options
  document.getElementById('videoFormatsList').innerHTML = '';
  document.getElementById('audioFormatsList').innerHTML = '';
  
  // Disable download button
  document.getElementById('downloadBtn').disabled = true;
}

// Display video information
function displayVideoInfo(info) {
  const videoInfoCard = document.getElementById('videoInfo');
  
  console.log('Displaying video info:', info);
  
  // Set video info elements with better fallbacks for missing data
  document.getElementById('videoTitle').textContent = info.title || info.fulltitle || info.alt_title || 'Unknown Title';
  
  // Handle channel name with more fallbacks
  const channelName = info.channel || info.uploader || info.creator || info.artist || 
                      info.channel_id || info.uploader_id || info.uploader_url?.split('/').pop() || 'Unknown Channel';
  document.getElementById('channelName').textContent = channelName;
  
  // Format duration with better fallback
  let duration = 'Unknown duration';
  if (info.duration) {
    duration = formatDuration(info.duration);
  } else if (info.duration_string) {
    duration = info.duration_string;
  } else if (info.formats && info.formats.length > 0) {
    // Try to find duration in one of the formats
    const formatWithDuration = info.formats.find(f => f.duration);
    if (formatWithDuration) {
      duration = formatDuration(formatWithDuration.duration);
    }
  }
  document.getElementById('duration').textContent = duration;
  
  // Format date with more options and better parsing
  let uploadDate = 'Unknown date';
  const dateFields = ['upload_date', 'release_date', 'release_timestamp', 'timestamp', 'modified_date'];
  
  for (const field of dateFields) {
    if (info[field]) {
      const formattedDate = formatDate(info[field]);
      if (formattedDate) {
        uploadDate = formattedDate;
        break;
      }
    }
  }
  document.getElementById('uploadDate').textContent = uploadDate;
  
  // Format view count with better fallback
  const viewCount = formatViewCount(info.view_count || info.views || info.play_count || 0);
  document.getElementById('viewCount').textContent = viewCount;
  
  // Handle description with fallback and better formatting
  const description = info.description || info.summary || info.synopsis || 
                      info.comment || info.full_description || 'No description available';
  document.getElementById('description').textContent = description;
  
  // Set thumbnail with loading animation and multiple fallback options
  const thumbnail = document.getElementById('thumbnail');
  const thumbnailUrl = getThumbnailUrl(info);
  
  if (thumbnailUrl) {
    // Create a new image to preload
    const img = new Image();
    img.onload = () => {
      thumbnail.src = thumbnailUrl;
      // Animate thumbnail
      gsap.fromTo(thumbnail, 
        { opacity: 0, scale: 0.9 }, 
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.2)" }
      );
    };
    img.onerror = () => {
      // Use fallback image on error
      thumbnail.src = './assets/placeholder.png';
      gsap.fromTo(thumbnail, 
        { opacity: 0, scale: 0.9 }, 
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.2)" }
      );
    };
    img.src = thumbnailUrl;
  } else {
    // Use fallback image
    thumbnail.src = './assets/placeholder.png';
  }
  
  // Show video info card with animation
  videoInfoCard.classList.remove('d-none');
  gsap.fromTo(videoInfoCard,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
  );
}

// Helper function to get the best thumbnail URL
function getThumbnailUrl(info) {
  // Check for thumbnails array (prefer largest)
  if (info.thumbnails && info.thumbnails.length > 0) {
    // Sort by preference: resolution, filesize, or just take the last one
    const sortedThumbnails = [...info.thumbnails].sort((a, b) => {
      if (a.height && b.height) return b.height - a.height;
      if (a.width && b.width) return b.width - a.width;
      if (a.filesize && b.filesize) return b.filesize - a.filesize;
      return 0;
    });
    
    return sortedThumbnails[0].url;
  }
  
  // Check for standard thumbnail field
  if (info.thumbnail) {
    return info.thumbnail;
  }
  
  // Check for format thumbnails
  if (info.formats && info.formats.length > 0) {
    const formatWithThumbnail = info.formats.find(f => f.thumbnail);
    if (formatWithThumbnail) {
      return formatWithThumbnail.thumbnail;
    }
  }
  
  // Additional checks for common thumbnail patterns in different platforms
  if (info.thumbnail_url) return info.thumbnail_url;
  if (info.display_id && info.extractor === 'youtube') {
    return `https://i.ytimg.com/vi/${info.display_id}/hqdefault.jpg`;
  }
  
  return null;
}

// Display format options
function displayFormatOptions(formats) {
  const formatSelectionCard = document.getElementById('formatSelection');
  const videoFormats = document.getElementById('videoFormatsList');
  const audioFormats = document.getElementById('audioFormatsList');
  
  console.log('Processing formats:', formats);
  
  // Clear previous format options
  videoFormats.innerHTML = '';
  audioFormats.innerHTML = '';
  
  // Create standard video resolutions list
  const standardVideoFormats = [];
  
  // First add the best quality option
  standardVideoFormats.push({
    formatId: 'best',
    formatNote: 'Best Quality',
    height: 9999, // Set highest for sorting
    ext: 'mp4',
    vcodec: 'auto',
    filesize: null
  });
  
  // Process formats
  const videoResolutions = [4320, 2160, 1440, 1080, 720, 480, 360, 240, 144];
  
  // Find formats for each standard resolution
  videoResolutions.forEach(resolution => {
    // Find formats that match this resolution
    const matchingFormats = formats.filter(format => 
      format.height === resolution && format.vcodec !== 'none'
    );
    
    if (matchingFormats.length > 0) {
      // Pick the best format for this resolution (prefer formats with audio, then higher bitrate)
      const bestFormat = matchingFormats.reduce((best, current) => {
        // Prefer formats with audio
        if (best.acodec === 'none' && current.acodec !== 'none') {
          return current;
        }
        // If both have audio or both don't have audio, prefer higher bitrate
        if ((best.acodec !== 'none' && current.acodec !== 'none') ||
            (best.acodec === 'none' && current.acodec === 'none')) {
          return current.tbr > best.tbr ? current : best;
        }
        return best;
      }, matchingFormats[0]);
      
      // Calculate filesize if available or use estimated size based on bitrate and duration
      let filesize = bestFormat.filesize;
      if (!filesize && bestFormat.tbr && currentVideoInfo.duration) {
        // Estimate: bitrate (kbps) * duration (seconds) * 1000 / 8 = bytes
        const estimatedSizeBytes = (bestFormat.tbr * currentVideoInfo.duration * 1000) / 8;
        filesize = estimatedSizeBytes;
      }
      
      standardVideoFormats.push({
        formatId: bestFormat.format_id || `res-${resolution}`,
        formatNote: `${resolution}p${bestFormat.fps > 30 ? ' ' + bestFormat.fps + 'fps' : ''}`,
        height: resolution,
        ext: bestFormat.ext || 'mp4',
        vcodec: bestFormat.vcodec,
        filesize: filesize
      });
    }
  });
  
  // Create standard audio formats
  const audioQualityOptions = [
    { id: 'audio-320', name: '320 kbps', quality: 'Best Quality', bitrate: 320 },
    { id: 'audio-192', name: '192 kbps', quality: 'High Quality', bitrate: 192 },
    { id: 'audio-128', name: '128 kbps', quality: 'Standard Quality', bitrate: 128 }
  ];
  
  // Calculate estimated audio file sizes if possible
  if (currentVideoInfo.duration) {
    audioQualityOptions.forEach(option => {
      // Estimate: bitrate (kbps) * duration (seconds) * 1000 / 8 = bytes
      option.filesize = (option.bitrate * currentVideoInfo.duration * 1000) / 8;
    });
  }
  
  // Add audio formats
  audioQualityOptions.forEach((option, index) => {
    const formatCard = createFormatCard({
      format_id: option.id,
      ext: 'mp3',
      vcodec: 'none',
      acodec: 'mp3',
      filesize: option.filesize || null
    }, option.name, 'audio', index === 0); 
    
    audioFormats.appendChild(formatCard);
  });
  
  // Sort video formats by resolution (highest first)
  standardVideoFormats.sort((a, b) => b.height - a.height);
  
  // Create video format cards
  standardVideoFormats.forEach((format, index) => {
    const formatCard = createFormatCard({
      format_id: format.formatId,
      ext: format.ext,
      vcodec: format.vcodec,
      acodec: 'mp4a',
      filesize: format.filesize,
      height: format.height
    }, format.formatNote, 'video', index === 0);
    
    videoFormats.appendChild(formatCard);
  });
  
  // Show format selection card with animation
  formatSelectionCard.classList.remove('d-none');
  gsap.fromTo(formatSelectionCard,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.4, delay: 0.2, ease: "power2.out" }
  );
}

// Create a format selection card
function createFormatCard(format, qualityLabel, type, isDefault = false) {
  // Create container
  const formatCard = document.createElement('div');
  formatCard.className = `format-item p-4 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors cursor-pointer ${isDefault ? 'ring-2 ring-primary-500' : ''}`;
  formatCard.setAttribute('data-format-id', format.format_id);
  formatCard.setAttribute('data-is-audio', type === 'audio' ? 'true' : 'false');
  if (format.height) {
    formatCard.setAttribute('data-resolution', format.height);
  }
  
  // Set card content
  const icon = type === 'audio' ? 'bi-file-earmark-music' : 'bi-camera-video';
  
  // Format file size if available
  let fileSize = 'Unknown size';
  if (format.filesize) {
    fileSize = formatFileSize(format.filesize);
  } else if (format.height && currentVideoInfo && currentVideoInfo.duration) {
    // Estimate size based on resolution and duration for video
    const estimatedBitrate = {
      9999: 12000, // Best quality - approximate high bitrate
      4320: 80000, // 8K
      2160: 45000, // 4K
      1440: 20000, // 2K
      1080: 8000,  // Full HD
      720: 5000,   // HD
      480: 2500,   // SD
      360: 1000,   // Low
      240: 700,    // Very low
      144: 500     // Lowest
    }[format.height] || 2000;
    
    // Calculate estimated size: bitrate (kbps) * duration (s) * 1000 / 8 = bytes
    const estimatedBytes = (estimatedBitrate * currentVideoInfo.duration * 1000) / 8;
    fileSize = formatFileSize(estimatedBytes) + ' (est.)';
  }
  
  // Format codec information
  let codecInfo = 'Unknown codec';
  if (type === 'audio') {
    codecInfo = format.acodec || 'MP3';
  } else {
    codecInfo = format.vcodec || 'MP4';
  }
  
  // Simplify codec display (remove complex version strings)
  if (codecInfo.includes('.')) {
    codecInfo = codecInfo.split('.')[0];
  }
  
  formatCard.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300">
          <i class="bi ${icon}"></i>
        </div>
        <div class="ml-3">
          <div class="format-name font-medium">${qualityLabel}</div>
          <div class="text-xs text-secondary-500 dark:text-secondary-400">
            ${fileSize} • ${codecInfo}
          </div>
        </div>
      </div>
      <div class="bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
        ${type === 'audio' ? 'MP3' : 'MP4'}
      </div>
    </div>
  `;
  
  // Add click event to select format
  formatCard.addEventListener('click', () => {
    // Remove selection from all format items
    document.querySelectorAll('.format-item').forEach(item => {
      item.classList.remove('ring-2', 'ring-primary-500');
    });
    
    // Add selection to clicked item
    formatCard.classList.add('ring-2', 'ring-primary-500');
    
    // Enable download button
    document.getElementById('downloadBtn').disabled = false;
  });
  
  return formatCard;
}

// Get selected format
function getSelectedFormat() {
  const selectedFormatItem = document.querySelector('.format-item.ring-2');
  
  if (!selectedFormatItem) {
    return null;
  }
  
  return {
    formatId: selectedFormatItem.getAttribute('data-format-id'),
    isAudio: selectedFormatItem.getAttribute('data-is-audio') === 'true'
  };
}

// Helper functions
function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  
  try {
    // Convert YYYYMMDD to YYYY-MM-DD
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString();
  } catch (e) {
    return dateString;
  }
}

function formatViewCount(viewCount) {
  if (!viewCount) return 'Unknown views';
  
  if (viewCount >= 1000000) {
    return `${(viewCount / 1000000).toFixed(1)}M views`;
  } else if (viewCount >= 1000) {
    return `${(viewCount / 1000).toFixed(1)}K views`;
  } else {
    return `${viewCount} views`;
  }
}

function formatFileSize(bytes) {
  if (!bytes) return 'Unknown size';
  
  if (bytes >= 1073741824) {
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  } else if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${bytes} B`;
  }
}

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

// Remove export statement - we're using global variables instead
// export {
//   currentVideoInfo,
//   getSelectedFormat,
//   resetVideoInfo
// }; 