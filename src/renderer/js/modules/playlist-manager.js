/**
 * Playlist Manager module
 * Handles playlist operations
 */
export class PlaylistManager {
  constructor() {
    this.currentPlaylist = null;
  }
  
  /**
   * Get playlist information
   * @param {string} url - Playlist URL
   * @returns {Promise} - Playlist info
   */
  async getPlaylistInfo(url) {
    try {
      console.log('Fetching playlist info for:', url);
      const playlistInfo = await window.electronAPI.getPlaylistInfo(url);
      
      // Validate returned data
      if (!playlistInfo || !playlistInfo.entries || playlistInfo.entries.length === 0) {
        console.error('Invalid playlist info returned:', playlistInfo);
        throw new Error('Could not retrieve valid playlist information');
      }
      
      // Store for later use
      this.currentPlaylist = playlistInfo;
      return playlistInfo;
    } catch (error) {
      console.error('Error getting playlist info:', error);
      throw new Error(`Cannot fetch playlist info: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Download a playlist item
   * @param {Object} options - Download options
   * @returns {Promise} - Download result
   */
  async downloadPlaylistItem(options) {
    try {
      console.log('Downloading playlist item:', options);
      return await window.electronAPI.downloadPlaylistItem(options);
    } catch (error) {
      console.error('Error downloading playlist item:', error);
      throw error;
    }
  }
  
  /**
   * Download multiple playlist items
   * @param {Array} items - Array of items to download
   * @param {string} format - Format ID to download
   * @param {boolean} isAudio - Whether to download as audio
   * @param {string} saveFolder - Folder to save downloads to
   * @returns {Promise} - Download results
   */
  async downloadMultipleItems(items, format, isAudio, saveFolder) {
    const results = {
      total: items.length,
      completed: 0,
      failed: 0,
      items: []
    };
    
    console.log(`Starting download of ${items.length} items`);
    
    // Download items sequentially
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        // Create a filename with the video title
        const filename = item.title.replace(/[\\/:*?"<>|]/g, '_');
        const ext = isAudio ? 'mp3' : 'mp4';
        const outputPath = `${saveFolder}/${filename}.${ext}`;
        
        // Add index to show progress
        console.log(`Downloading item ${i+1}/${items.length}: ${item.title}`);
        
        // Download the item
        const result = await this.downloadPlaylistItem({
          url: item.url,
          index: i,
          format: format,
          isAudio: isAudio,
          outputPath: outputPath
        });
        
        results.completed++;
        results.items.push({
          index: i,
          title: item.title,
          success: true,
          outputPath: result.filePath
        });
      } catch (error) {
        console.error(`Failed to download item ${i+1}:`, error);
        results.failed++;
        results.items.push({
          index: i,
          title: item.title,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Get current playlist
   * @returns {Object} Current playlist
   */
  getCurrentPlaylist() {
    return this.currentPlaylist;
  }
}
