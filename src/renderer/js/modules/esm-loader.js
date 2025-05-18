// esm-loader.js - Provides access to modules dynamically

// Helper function to load script
function loadScript(src, callback) {
  const script = document.createElement('script');
  script.src = src;
  script.onload = callback;
  document.head.appendChild(script);
}

// Initialize dependencies
document.addEventListener('DOMContentLoaded', function() {
  console.log('ESM loader initializing...');
  
  // Load GSAP directly
  loadScript('../../node_modules/gsap/dist/gsap.min.js', function() {
    console.log('GSAP loaded');
    
    // Make GSAP available globally
    window.gsapLoaded = true;
  });
  
  // Load Toastify-js
  loadScript('../../node_modules/toastify-js/src/toastify.js', function() {
    console.log('Toastify loaded');
    window.toastifyLoaded = true;
  });
  
  // Load Tippy.js and its dependency
  loadScript('../../node_modules/@popperjs/core/dist/umd/popper.min.js', function() {
    console.log('Popper loaded');
    
    loadScript('../../node_modules/tippy.js/dist/tippy-bundle.umd.min.js', function() {
      console.log('Tippy loaded');
      window.tippyLoaded = true;
    });
  });
}); 