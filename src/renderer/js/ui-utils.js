// UI Utilities for Media Downloader

// Import dependencies
import gsap from 'gsap';
import Toastify from 'toastify-js';
import tippy from 'tippy.js';

// Theme management
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
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const currentTheme = this.getCurrentTheme();
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      this.setTheme(newTheme);
    });
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  },
  
  // Set theme and store preference
  setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.querySelector('html').setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.querySelector('html').setAttribute('data-theme', 'light');
    }
    localStorage.setItem('theme', theme);
    
    // Update theme toggle button if it exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.innerHTML = theme === 'dark' 
        ? '<i class="bi bi-sun-fill text-xl md:me-3"></i><span class="hidden md:block">Light Mode</span>' 
        : '<i class="bi bi-moon-fill text-xl md:me-3"></i><span class="hidden md:block">Dark Mode</span>';
    }
  }
};

// Toast notifications
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

// Page transitions
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

// Initialize tooltips with tippy.js
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

// Button animations
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

// Export all modules
export {
  ThemeManager,
  NotificationManager,
  PageTransitions,
  TooltipManager,
  ButtonAnimations
}; 