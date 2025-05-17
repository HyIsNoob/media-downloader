/**
 * History Manager module
 * Manages download history
 */
export class HistoryManager {
  constructor() {
    this.history = [];
  }
  
  /**
   * Load history from storage
   * @returns {Promise} - Resolved with history
   */
  async loadHistory() {
    try {
      this.history = await window.electronAPI.getHistory() || [];
      return this.history;
    } catch (error) {
      console.error('Error loading history:', error);
      this.history = [];
      return this.history;
    }
  }
  
  /**
   * Add item to history
   * @param {Object} item - History item to add
   * @returns {Promise} - Resolved when added
   */
  async addToHistory(item) {
    try {
      await window.electronAPI.addToHistory(item);
      await this.loadHistory(); // Reload history
      return true;
    } catch (error) {
      console.error('Error adding to history:', error);
      return false;
    }
  }
  
  /**
   * Clear all history
   * @returns {Promise} - Resolved when cleared
   */
  async clearHistory() {
    try {
      await window.electronAPI.clearHistory();
      this.history = [];
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }
  
  /**
   * Delete a specific history item
   * @param {number} index - Index of item to delete
   * @returns {Promise} - Resolved when deleted
   */
  async deleteHistoryItem(index) {
    try {
      await window.electronAPI.deleteHistoryItem(index);
      await this.loadHistory(); // Reload history
      return true;
    } catch (error) {
      console.error('Error deleting history item:', error);
      return false;
    }
  }
  
  /**
   * Get current history
   * @returns {Array} - History array
   */
  getHistory() {
    return this.history;
  }
}
