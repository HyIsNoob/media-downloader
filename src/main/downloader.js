/**
 * Downloader utility for fetching yt-dlp binary
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { app } = require('electron');

/**
 * Download a file from a URL to a local path
 * 
 * @param {string} url - URL to download from
 * @param {string} destPath - Path to save the file
 * @returns {Promise<string>} - Path to the downloaded file
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from ${url} to ${destPath}`);
    
    // Make sure the directory exists
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create write stream
    const file = fs.createWriteStream(destPath);
    
    // Get the file
    https.get(url, (response) => {
      // Check for redirect
      if (response.statusCode === 302 || response.statusCode === 301) {
        console.log(`Redirect to ${response.headers.location}`);
        // Follow redirect recursively
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      // Check if response is OK
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file. Status code: ${response.statusCode}`));
        return;
      }
      
      // Pipe the response to the file
      response.pipe(file);
      
      // When the file is done downloading
      file.on('finish', () => {
        file.close(() => {
          console.log(`Download completed: ${destPath}`);
          // For executable files on Linux/Mac, make sure it's executable
          if (process.platform !== 'win32') {
            fs.chmodSync(destPath, 0o755);
          }
          resolve(destPath);
        });
      });
      
      // If there's an error writing to file
      file.on('error', (err) => {
        // Clean up file
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      // Clean up file
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Download the latest version of yt-dlp
 * 
 * @returns {Promise<string>} - Path to the downloaded yt-dlp executable
 */
async function downloadYtDlp() {
  try {
    // Determine the binary URL based on platform
    let url;
    let filename;
    
    if (process.platform === 'win32') {
      url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
      filename = 'yt-dlp.exe';
    } else if (process.platform === 'darwin') {
      url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
      filename = 'yt-dlp';
    } else {
      url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
      filename = 'yt-dlp';
    }
    
    // Create resources/bin directory in userData directory if it doesn't exist
    const userDataPath = app.getPath('userData');
    const binDir = path.join(userDataPath, 'resources', 'bin');
    
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }
    
    // Download the file
    const destPath = path.join(binDir, filename);
    const downloadedPath = await downloadFile(url, destPath);
    
    return downloadedPath;
  } catch (error) {
    console.error('Error downloading yt-dlp:', error);
    throw error;
  }
}

module.exports = {
  downloadYtDlp
};
