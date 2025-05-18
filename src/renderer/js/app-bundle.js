// Main app bundle (non-ESM version)

// Add loading animation
document.addEventListener('DOMContentLoaded', () => {
  // Show loading animation
  const body = document.body;
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'fixed inset-0 bg-secondary-900 flex items-center justify-center z-50';
  loadingOverlay.id = 'loading-overlay';
  
  loadingOverlay.innerHTML = `
    <div class="text-center">
      <div class="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
      <p class="text-white text-lg">Loading...</p>
    </div>
  `;
  
  body.appendChild(loadingOverlay);
  
  // Remove loading overlay after all resources are loaded
  window.addEventListener('load', () => {
    setTimeout(() => {
      gsap.to(loadingOverlay, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          loadingOverlay.remove();
          initializeApp();
        }
      });
    }, 500); // Slight delay to ensure everything is ready
  });
});

// Initialize UI components when app is ready
function initializeApp() {
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
  }, 500);
  
  // Setup format type switcher
  setupFormatTypeSwitcher();
  
  // Setup quit button
  document.getElementById('quit-app')?.addEventListener('click', () => {
    if (window.electron) {
      window.electron.quitApp();
    }
  });
}

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

// Theme management - Global object
const ThemeManager = {
  // Get the current theme from localStorage or system preference
  getCurrentTheme() {
    if (localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      return 'dark';
    }
    return 'light';
  },
  
  // Initialize theme
  initialize() {
    const theme = this.getCurrentTheme();
    this.setTheme(theme);
    
    // Add theme toggle event listeners
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
      });
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  },
  
  // Set theme and store preference
  setTheme(theme) {
    // Update document classes
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.querySelector('html').setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.querySelector('html').setAttribute('data-theme', 'light');
    }
    
    // Save theme preference to localStorage
    localStorage.setItem('theme', theme);
    
    // Update theme toggle button if it exists
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    
    if (themeIcon) {
      // Use animation for icon change
      gsap.to(themeIcon, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
          themeIcon.className = theme === 'dark' 
            ? 'bi bi-sun-fill text-xl md:me-3' 
            : 'bi bi-moon-fill text-xl md:me-3';
          
          gsap.to(themeIcon, {
            opacity: 1,
            duration: 0.2
          });
        }
      });
    }
    
    if (themeText) {
      themeText.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
    
    // Set tippy theme if already initialized
    if (window.tippy) {
      document.querySelectorAll('[data-tippy-root]').forEach(tooltip => {
        const instance = tooltip._tippy;
        if (instance) {
          instance.setProps({ theme: theme });
        }
      });
    }
    
    // Save to electron settings if available
    if (window.electron && window.electron.saveSettings) {
      window.electron.saveSettings({
        theme: theme
      }).catch(err => console.error('Error saving theme to settings:', err));
    }
  }
};

// Make ThemeManager globally accessible
window.ThemeManager = ThemeManager;

// Toast notifications - Global object
const NotificationManager = {
  show(message, type = 'info', duration = 3000) {
    const backgroundColor = {
      success: 'linear-gradient(to right, #36d399, #36d399cc)',
      error: 'linear-gradient(to right, #f87272, #f87272cc)',
      info: 'linear-gradient(to right, #3abff8, #3abff8cc)',
      warning: 'linear-gradient(to right, #fbbd23, #fbbd23cc)'
    }[type];
    
    const icons = {
      success: '<i class="bi bi-check-circle-fill mr-2"></i>',
      error: '<i class="bi bi-x-circle-fill mr-2"></i>',
      info: '<i class="bi bi-info-circle-fill mr-2"></i>',
      warning: '<i class="bi bi-exclamation-triangle-fill mr-2"></i>'
    };
    
    return Toastify({
      text: `<div class="flex items-center">${icons[type] || ''}<span>${message}</span></div>`,
      duration,
      gravity: "bottom",
      position: "right",
      className: `toast-${type}`,
      escapeMarkup: false,
      style: {
        background: backgroundColor,
        padding: '10px 15px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      },
      onClick: function() {}
    }).showToast();
  },
  
  success(message, duration) {
    return this.show(message, 'success', duration);
  },
  
  error(message, duration) {
    return this.show(message, 'error', duration);
  },
  
  info(message, duration) {
    return this.show(message, 'info', duration);
  },
  
  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }
};

// Make NotificationManager globally accessible
window.NotificationManager = NotificationManager;

// Page transitions - Global object
const PageTransitions = {
  initialize() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    
    // Add click event listeners
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = link.getAttribute('data-page');
        this.navigateTo(targetPage);
      });
    });
  },
  
  navigateTo(pageId) {
    // Get current active page
    const currentPage = document.querySelector('.page.active');
    const targetPage = document.getElementById(pageId);
    
    if (!targetPage || currentPage === targetPage) return;
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-page') === pageId) {
        link.classList.add('active');
      }
    });
    
    // Animate page transition
    gsap.to(currentPage, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      onComplete: () => {
        currentPage.classList.remove('active');
        targetPage.classList.add('active');
        
        // Animate target page in
        gsap.fromTo(targetPage, 
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.3 }
        );
      }
    });
  }
};

// Initialize tooltips - Global object
const TooltipManager = {
  initialize() {
    tippy('[data-tippy-content]', {
      arrow: true,
      animation: 'scale',
      theme: ThemeManager.getCurrentTheme()
    });
  },
  
  // Dynamically add tooltips
  add(element, content) {
    tippy(element, {
      content,
      arrow: true,
      animation: 'scale',
      theme: ThemeManager.getCurrentTheme()
    });
  }
};

// Button animations - Global object
const ButtonAnimations = {
  initialize() {
    const buttons = document.querySelectorAll('.btn-animate');
    
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        gsap.to(button, {
          scale: 1.05,
          duration: 0.2,
          ease: 'power1.out'
        });
      });
      
      button.addEventListener('mouseleave', () => {
        gsap.to(button, {
          scale: 1,
          duration: 0.2,
          ease: 'power1.out'
        });
      });
      
      button.addEventListener('mousedown', () => {
        gsap.to(button, {
          scale: 0.95,
          duration: 0.1,
          ease: 'power1.out'
        });
      });
      
      button.addEventListener('mouseup', () => {
        gsap.to(button, {
          scale: 1.05,
          duration: 0.1,
          ease: 'power1.out'
        });
      });
    });
  }
}; 