// Simple test script to verify ES modules are working
console.log('Test script loaded successfully!');

// Try importing gsap
try {
  const gsapModule = await import('../../../node_modules/gsap/dist/gsap.min.js');
  console.log('GSAP imported successfully!', gsapModule);
} catch (error) {
  console.error('Error importing GSAP:', error);
}

// Export a test function
export function testFunction() {
  console.log('Test function called!');
  return 'It works!';
} 