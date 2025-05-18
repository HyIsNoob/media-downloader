const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure the tailwind-output.css directory exists
const outputDir = path.join(__dirname, 'src', 'renderer', 'css');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create empty input file if it doesn't exist
const inputFile = path.join(outputDir, 'tailwind-input.css');
if (!fs.existsSync(inputFile)) {
  fs.writeFileSync(inputFile, '@tailwind base;\n@tailwind components;\n@tailwind utilities;');
}

// Create empty output file if it doesn't exist
const outputFile = path.join(outputDir, 'tailwind-output.css');
if (!fs.existsSync(outputFile)) {
  fs.writeFileSync(outputFile, '');
}

// Run tailwindcss CLI to generate output file
try {
  console.log('Building Tailwind CSS...');
  execSync('npx tailwindcss -i ./src/renderer/css/tailwind-input.css -o ./src/renderer/css/tailwind-output.css', { stdio: 'inherit' });
  console.log('Tailwind CSS built successfully!');
} catch (error) {
  console.error('Error building Tailwind CSS:', error);
  process.exit(1);
} 