// history-manager.js - Handles download history
// Using global variables
// import { NotificationManager } from './ui-utils.js';
// import gsap from 'gsap';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Setup history page if we're in it
  const historyPage = document.getElementById('history');
  
  if (historyPage) {
    setupHistoryPage();
  }
  
  // Make renderHistory globally accessible
  window.renderHistory = renderHistory;
});

// Set up history page
async function setupHistoryPage() {
  // Get needed elements
  const historyItems = document.getElementById('historyItems');
  const emptyHistory = document.getElementById('emptyHistory');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  
  if (!historyItems || !emptyHistory || !clearHistoryBtn) return;
  
  // Add event listener for clear history button
  clearHistoryBtn.addEventListener('click', async () => {
    try {
      if (confirm('Are you sure you want to clear all download history?')) {
        await window.electron.clearHistory();
        await renderHistory();
        NotificationManager.success('History cleared successfully');
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      NotificationManager.error('Failed to clear history');
    }
  });
  
  // Add page transition event to refresh history
  document.querySelectorAll('.nav-link[data-page="history"]').forEach(link => {
    link.addEventListener('click', () => {
      renderHistory();
    });
  });
  
  // Initial render
  await renderHistory();
}

// Render history items
async function renderHistory() {
  const historyItems = document.getElementById('historyItems');
  const emptyHistory = document.getElementById('emptyHistory');
  
  if (!historyItems || !emptyHistory) return;
  
  try {
    // Get history
    const history = await window.electron.getHistory();
    
    // Clear current items
    historyItems.innerHTML = '';
    
    if (!history || history.length === 0) {
      // Show empty message
      historyItems.classList.add('hidden');
      emptyHistory.classList.remove('hidden');
      return;
    }
    
    // Hide empty message
    historyItems.classList.remove('hidden');
    emptyHistory.classList.add('hidden');
    
    // Check file existence and render each item with animation
    for (let i = 0; i < history.length; i++) {
      const item = history[i];
      const fileExists = await window.electron.checkFileExists(item.outputPath);
      
      // Create history item card
      const historyCard = createHistoryCard(item, i, fileExists);
      historyItems.appendChild(historyCard);
      
      // Animate entry
      gsap.fromTo(historyCard, 
        { opacity: 0, y: 20 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.3, 
          delay: i * 0.05, // Stagger effect
          ease: "power2.out"
        }
      );
    }
    
    // Add event listeners to history item buttons
    addHistoryItemEventListeners();
    
  } catch (error) {
    console.error('Error rendering history:', error);
    NotificationManager.error('Failed to load history');
  }
}

// Create a history item card
function createHistoryCard(item, index, fileExists) {
  // Create container
  const historyCard = document.createElement('div');
  historyCard.className = 'glass-card p-4 hover:shadow-lg transition-shadow duration-300';
  
  // Format date
  const downloadDate = item.downloadedAt ? new Date(item.downloadedAt).toLocaleDateString() : 'Unknown date';
  
  // Add appropriate icon based on file type
  const fileIcon = item.isAudio ? 'bi-file-earmark-music' : 'bi-file-earmark-play';
  const actionBtnText = item.isAudio ? 'Play' : 'Watch';
  
  // Set card content
  historyCard.innerHTML = `
    <div class="flex flex-col md:flex-row gap-4">
      <div class="w-full md:w-40 h-24 rounded-lg overflow-hidden relative">
        <img src="${item.thumbnail || './assets/placeholder.png'}" class="w-full h-full object-cover" alt="Thumbnail">
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          ${item.isAudio ? '<i class="bi bi-music-note-beamed me-1"></i> Audio' : '<i class="bi bi-camera-video me-1"></i> Video'}
        </div>
      </div>
      <div class="flex-1">
        <h3 class="text-lg font-medium mb-1 line-clamp-1">${item.title}</h3>
        <div class="text-sm text-secondary-500 dark:text-secondary-400 mb-2">
          <div><i class="bi bi-calendar3 me-2"></i>${downloadDate}</div>
          <div><i class="bi ${fileIcon} me-2"></i>${item.quality || 'Unknown quality'}</div>
          <div class="flex items-start">
            <i class="bi bi-folder2 me-2 mt-1 flex-shrink-0"></i>
            <span class="line-clamp-1" title="${item.outputPath}">${item.outputPath}</span>
            ${!fileExists ? '<span class="ml-2 text-error font-medium">(File not found)</span>' : ''}
          </div>
        </div>
        <div class="flex gap-2">
          <button class="open-file px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm flex items-center transition-colors btn-animate ${!fileExists ? 'opacity-50 cursor-not-allowed' : ''}" data-path="${item.outputPath}" ${!fileExists ? 'disabled' : ''}>
            <i class="bi bi-play-circle me-1"></i> ${actionBtnText}
          </button>
          <button class="open-folder px-3 py-1.5 bg-secondary-200 hover:bg-secondary-300 dark:bg-secondary-700 dark:hover:bg-secondary-600 rounded text-sm flex items-center transition-colors btn-animate" data-path="${item.outputPath}">
            <i class="bi bi-folder me-1"></i> Folder
          </button>
          <button class="delete-history px-3 py-1.5 bg-error/80 hover:bg-error text-white rounded text-sm flex items-center transition-colors btn-animate ml-auto" data-index="${index}">
            <i class="bi bi-trash me-1"></i> Remove
          </button>
        </div>
      </div>
    </div>
  `;
  
  return historyCard;
}

// Add event listeners to history item buttons
function addHistoryItemEventListeners() {
  // Open file buttons
  document.querySelectorAll('.open-file').forEach(btn => {
    if (btn.disabled) return;
    
    btn.addEventListener('click', async () => {
      try {
        const path = btn.getAttribute('data-path');
        await window.electron.openFile(path);
      } catch (error) {
        console.error('Error opening file:', error);
        NotificationManager.error('Failed to open file');
      }
    });
  });
  
  // Open folder buttons
  document.querySelectorAll('.open-folder').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const path = btn.getAttribute('data-path');
        await window.electron.openFolder(path);
      } catch (error) {
        console.error('Error opening folder:', error);
        NotificationManager.error('Failed to open folder');
      }
    });
  });
  
  // Delete history buttons
  document.querySelectorAll('.delete-history').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const index = parseInt(btn.getAttribute('data-index'));
        
        if (confirm('Remove this item from history?')) {
          await window.electron.deleteHistoryItem(index);
          
          // Animate removal
          const historyCard = btn.closest('.glass-card');
          gsap.to(historyCard, {
            opacity: 0,
            height: 0,
            marginBottom: 0,
            paddingTop: 0,
            paddingBottom: 0,
            duration: 0.3,
            onComplete: () => {
              historyCard.remove();
              renderHistory(); // Re-render to update indices
            }
          });
          
          NotificationManager.success('Item removed from history');
        }
      } catch (error) {
        console.error('Error deleting history item:', error);
        NotificationManager.error('Failed to remove item from history');
      }
    });
  });
}

// Remove exports - using globals now
// export {
//   renderHistory
// }; 