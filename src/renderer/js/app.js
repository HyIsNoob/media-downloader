// Main app.js - Entry point for renderer process
import { ThemeManager, NotificationManager, PageTransitions, TooltipManager, ButtonAnimations } from './ui-utils.js';

// Import application-specific modules
import './video-info.js';
import './format-selector.js';
import './download-manager.js';
import './playlist-handler.js';
import './history-manager.js';
import './settings-manager.js';

// Initialize UI components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing UI components...');
  
  // Initialize theme system
  ThemeManager.initialize();
  
  // Initialize page transitions
  PageTransitions.initialize();
  
  // Initialize tooltips
  TooltipManager.initialize();
  
  // Initialize button animations
  ButtonAnimations.initialize();
  
  // Welcome notification
  setTimeout(() => {
    NotificationManager.success('Welcome to Media Downloader!');
  }, 1000);
  
  // Setup format type switcher
  setupFormatTypeSwitcher();
  
  // Setup quit button
  document.getElementById('quit-app')?.addEventListener('click', () => {
    if (window.electron) {
      window.electron.quitApp();
    }
  });
});

// Format type switcher functionality
function setupFormatTypeSwitcher() {
  const formatButtons = document.querySelectorAll('.format-type-btn');
  const videoFormats = document.getElementById('videoFormatsList');
  const audioFormats = document.getElementById('audioFormatsList');
  
  formatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      formatButtons.forEach(b => b.classList.remove('active', 'bg-primary-600', 'text-white'));
      
      // Add active class to clicked button
      btn.classList.add('active', 'bg-primary-600', 'text-white');
      
      // Show/hide appropriate format list
      const formatType = btn.getAttribute('data-format-type');
      if (formatType === 'video') {
        videoFormats.classList.remove('hidden');
        audioFormats.classList.add('hidden');
      } else {
        videoFormats.classList.add('hidden');
        audioFormats.classList.remove('hidden');
      }
    });
  });
}
