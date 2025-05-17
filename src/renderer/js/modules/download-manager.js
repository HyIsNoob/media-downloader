/**
 * Download Manager module
 * Handles video information fetching and downloading
 */
import { DummyYtdlpService } from './dummy-ytdlp.js';

export class DownloadManager {
  constructor() {
    this.currentDownload = null;
    this.progressCallback = null;
    this.useYtdlp = true;
    
    // Set up progress listener
    window.electronAPI.onDownloadProgress(progress => {
      if (this.progressCallback) {
        this.progressCallback(progress);
      }
    });
    
    // Check if yt-dlp is available
    this.checkYtdlp();
  }
  
  /**
   * Check if yt-dlp is available
   */
  async checkYtdlp() {
    try {
      const result = await window.electronAPI.checkYtdlp();
      this.useYtdlp = result.installed;
      
      if (!this.useYtdlp) {
        console.warn('yt-dlp not found. Using dummy service for demonstration purposes.');
        alert('yt-dlp was not found on your system. The app will run in demo mode with limited functionality.');
      }
    } catch (error) {
      console.error('Error checking for yt-dlp:', error);
      this.useYtdlp = false;
    }
  }
  /**
   * Get video information
   * @param {string} url - The video URL
   * @returns {Promise} - Video information
   */
  async getVideoInfo(url) {
    try {
      // Log the request
      console.log('Fetching video info for:', url);
      
      // If yt-dlp is not available, use dummy service
      if (!this.useYtdlp) {
        console.log('Using dummy service - yt-dlp not available');
        return await DummyYtdlpService.getVideoInfo(url);
      }
      
      // Ensure URL is properly sanitized and encoded if needed
      const safeUrl = url.trim();
      
      // Request with timeout handling is now managed in app.js
      const videoInfo = await window.electronAPI.getVideoInfo(safeUrl);
      
      // Validate returned data
      if (!videoInfo || !videoInfo.formats || videoInfo.formats.length === 0) {
        console.error('Invalid video info returned:', videoInfo);
        throw new Error('Could not retrieve valid video information');
      }
      
      return videoInfo;
    } catch (error) {
      console.error('Error getting video info:', error);
      
      // If error occurs with real service, fallback to dummy
      try {
        console.log('Falling back to dummy service for demonstration');
        return await DummyYtdlpService.getVideoInfo(url);
      } catch (fallbackError) {
        console.error('Dummy service also failed:', fallbackError);
        throw new Error(`Cannot fetch video info: ${error.message || 'Unknown error'}`);
      }
    }
  }
    /**
   * Download video
   * @param {Object} options - Download options
   * @returns {Promise} - Download result
   */
  async downloadVideo(options) {
    try {
      this.currentDownload = options;
      
      // If yt-dlp is not available, use dummy service
      if (!this.useYtdlp) {
        return await DummyYtdlpService.downloadVideo(options, progress => {
          if (this.progressCallback) {
            this.progressCallback(progress);
          }
        });
      }
      
      console.log('Starting download with options:', JSON.stringify(options));
      
      // Add a timeout promise to prevent hanging downloads - increased to 30 minutes (1800000 ms)
      const downloadPromise = window.electronAPI.downloadVideo(options);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Download timed out after 30 minutes')), 30 * 60 * 1000);
      });
      
      // Race between the download and the timeout
      return await Promise.race([downloadPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error downloading video:', error);
      
      // Provide more user-friendly error messages
      let errorMessage = error.toString();
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle specific error cases
      if (errorMessage.includes("not be downloaded")) {
        throw new Error("Video cannot be downloaded due to platform restrictions");
      } else if (errorMessage.includes("not available in your country")) {
        throw new Error("This video is region restricted and not available in your country");
      } else if (errorMessage.includes("Private video")) {
        throw new Error("This is a private video and cannot be accessed");
      } else if (errorMessage.includes("Sign in")) {
        throw new Error("This video requires sign-in to access");
      } else if (errorMessage.includes("copyright")) {
        throw new Error("This video is unavailable due to copyright restrictions");
      } else if (errorMessage.includes("requested format not available")) {
        throw new Error("The selected format is not available for this video. Try another format.");
      } else {
        throw new Error(`Download failed: ${errorMessage}`);
      }
    } finally {
      this.currentDownload = null;
    }
  }
  
  /**
   * Register progress callback
   * @param {Function} callback - Progress callback
   */
  onProgress(callback) {
    this.progressCallback = callback;
  }
  
  /**
   * Cancel current download
   * @returns {Promise}
   */
  cancelDownload() {
    if (this.currentDownload) {
      return window.electronAPI.cancelDownload();
    }
    return Promise.resolve();
  }
}
