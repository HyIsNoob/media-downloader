// format-selector.js - Handles format selection
// Using global NotificationManager and gsap from loaded scripts
// import { NotificationManager } from './ui-utils.js';
// import gsap from 'gsap';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Set up format type switcher if present
  setupFormatSwitcher();
  
  // Make function globally accessible if needed
  window.setupFormatSwitcher = setupFormatSwitcher;
});

// Set up format type switcher
function setupFormatSwitcher() {
  const formatButtons = document.querySelectorAll('.format-type-btn');
  const videoFormats = document.getElementById('videoFormatsList');
  const audioFormats = document.getElementById('audioFormatsList');
  
  if (!formatButtons.length || !videoFormats || !audioFormats) return;
  
  formatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      formatButtons.forEach(b => {
        b.classList.remove('active', 'bg-primary-600', 'text-white');
      });
      
      // Add active class to clicked button
      btn.classList.add('active', 'bg-primary-600', 'text-white');
      
      // Show/hide appropriate format list with animation
      const formatType = btn.getAttribute('data-format-type');
      
      if (formatType === 'video') {
        // Hide audio formats
        gsap.to(audioFormats, {
          opacity: 0,
          duration: 0.2,
          onComplete: () => {
            audioFormats.classList.add('hidden');
            
            // Show video formats
            videoFormats.classList.remove('hidden');
            gsap.fromTo(videoFormats, 
              { opacity: 0, y: 10 },
              { opacity: 1, y: 0, duration: 0.3 }
            );
          }
        });
      } else {
        // Hide video formats
        gsap.to(videoFormats, {
          opacity: 0,
          duration: 0.2,
          onComplete: () => {
            videoFormats.classList.add('hidden');
            
            // Show audio formats
            audioFormats.classList.remove('hidden');
            gsap.fromTo(audioFormats, 
              { opacity: 0, y: 10 },
              { opacity: 1, y: 0, duration: 0.3 }
            );
          }
        });
      }
    });
  });
} 