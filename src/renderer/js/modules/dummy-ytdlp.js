/**
 * Dummy service for testing when yt-dlp is not installed
 * This file provides mock implementations of video/audio download functionality
 */
export class DummyYtdlpService {
  /**
   * Check if yt-dlp is installed
   * @returns {Promise<boolean>} - True if installed, false otherwise
   */
  static async isInstalled() {
    // In a real implementation, this would check if yt-dlp is actually installed
    return false;
  }
  
  /**
   * Get sample video information
   * @param {string} url - The video URL
   * @returns {Promise<object>} - Video information
   */
  static async getVideoInfo(url) {
    // Generate mock video info for testing
    return {
      id: 'dQw4w9WgXcQ',
      title: 'Sample Video Title',
      description: 'This is a sample video description for testing when yt-dlp is not installed.',
      thumbnail: 'https://via.placeholder.com/1280x720?text=Sample+Video',
      channel: 'Sample Channel',
      duration: 213,
      uploadDate: '20210101',
      viewCount: 12345678,
      likeCount: 123456,
      formats: [
        {
          formatId: '22',
          formatNote: '720p',
          filesize: 20000000,
          ext: 'mp4',
          resolution: '1280x720',
          fps: 30,
          vcodec: 'avc1.64001F',
          acodec: 'mp4a.40.2',
          isAudioOnly: false,
          isVideoOnly: false
        },
        {
          formatId: '18',
          formatNote: '360p',
          filesize: 10000000,
          ext: 'mp4',
          resolution: '640x360',
          fps: 30,
          vcodec: 'avc1.42001E',
          acodec: 'mp4a.40.2',
          isAudioOnly: false,
          isVideoOnly: false
        },
        {
          formatId: '251',
          formatNote: '160kbps',
          filesize: 3000000,
          ext: 'webm',
          resolution: 'audio only',
          fps: null,
          vcodec: 'none',
          acodec: 'opus',
          isAudioOnly: true,
          isVideoOnly: false
        }
      ]
    };
  }
  
  /**
   * Get sample playlist information
   * @param {string} url - The playlist URL
   * @returns {Promise<object>} - Playlist information
   */
  static async getPlaylistInfo(url) {
    // Generate mock playlist info for testing
    return {
      id: 'PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-',
      title: 'Sample Playlist',
      entries: [
        {
          id: 'video1',
          title: 'Sample Video 1',
          duration: 180,
          thumbnail: 'https://via.placeholder.com/320x180?text=Video+1'
        },
        {
          id: 'video2',
          title: 'Sample Video 2',
          duration: 240,
          thumbnail: 'https://via.placeholder.com/320x180?text=Video+2'
        },
        {
          id: 'video3',
          title: 'Sample Video 3',
          duration: 300,
          thumbnail: 'https://via.placeholder.com/320x180?text=Video+3'
        },
        {
          id: 'video4',
          title: 'Sample Video 4',
          duration: 260,
          thumbnail: 'https://via.placeholder.com/320x180?text=Video+4'
        },
        {
          id: 'video5',
          title: 'Sample Video 5',
          duration: 190,
          thumbnail: 'https://via.placeholder.com/320x180?text=Video+5'
        }
      ]
    };
  }
  
  /**
   * Simulate a download with progress updates
   * @param {object} options - Download options
   * @param {Function} progressCallback - Progress callback
   * @returns {Promise<object>} - Download result
   */
  static async downloadVideo(options, progressCallback) {
    const { url, format, isAudio, outputPath } = options;
    
    // Simulate download progress
    const totalSeconds = 5; // 5 seconds to complete
    const totalSize = isAudio ? 3000000 : 20000000;
    const totalSizeUnit = 'MiB';
    const totalSizeMB = totalSize / 1000000;
    
    for (let i = 0; i <= 10; i++) {
      await new Promise(resolve => setTimeout(resolve, totalSeconds * 100));
      
      const percent = i * 10;
      const downloadedSize = (totalSizeMB * percent) / 100;
      const speed = `${(downloadedSize / ((i + 1) * totalSeconds / 10)).toFixed(2)} MiB/s`;
      const eta = `00:${totalSeconds - Math.floor((i * totalSeconds) / 10)}`;
      
      if (progressCallback) {
        progressCallback({
          percent,
          downloaded: downloadedSize,
          total: totalSizeMB,
          unit: totalSizeUnit,
          speed,
          eta
        });
      }
    }
    
    // Return success after "download" completes
    return {
      success: true,
      filePath: outputPath
    };
  }
}
