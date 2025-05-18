const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up new UI dependencies...');

// Install dependencies
console.log('📦 Installing new dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully!');
} catch (error) {
  console.error('❌ Error installing dependencies:', error);
  process.exit(1);
}

// Build Tailwind CSS
console.log('🎨 Building Tailwind CSS...');
try {
  execSync('npm run build:css', { stdio: 'inherit' });
  console.log('✅ Tailwind CSS built successfully!');
} catch (error) {
  console.error('❌ Error building Tailwind CSS:', error);
  process.exit(1);
}

console.log('\n✨ Setup complete! You can now run the app with the new UI:');
console.log('   npm start      - Run in production mode');
console.log('   npm run dev    - Run in development mode with hot reload');

console.log('\n🎮 New UI features:');
console.log('   - Modern design with glassmorphism effects');
console.log('   - Dark/light mode support');
console.log('   - Smooth animations and transitions');
console.log('   - Responsive layout for all screen sizes');
console.log('   - Beautiful notifications and tooltips');
console.log('   - Enhanced UX with visual feedback'); 