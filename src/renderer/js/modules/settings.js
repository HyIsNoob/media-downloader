/**
 * Settings module
 * Manages app settings
 */
export class Settings {  constructor() {
    this.settings = {
      autoFetch: false,
      autoPaste: false,
      lastUpdateCheck: null,
      skipVersion: null
    };
    
    // Get app version from package.json
    this.appVersion = '1.0.0'; // Default fallback version
    
    // Try to get actual version if available
    try {
      const packageInfo = require('../../../../package.json');
      this.appVersion = packageInfo.version;
    } catch (error) {
      console.error('Could not load package.json version:', error);
    }
  }
  
  /**
   * Load settings from storage
   * @returns {Promise} - Resolved with settings
   */
  async loadSettings() {
    try {
      this.settings = await window.electronAPI.getSettings();
      
      // Update UI
      document.getElementById('autoFetch').checked = this.settings.autoFetch;
      document.getElementById('autoPaste').checked = this.settings.autoPaste;
      
      return this.settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.settings;
    }
  }
  
  /**
   * Update settings
   * @param {Object} newSettings - New settings to save
   * @returns {Promise} - Resolved when saved
   */
  async updateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await window.electronAPI.saveSettings(this.settings);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }
  
  /**
   * Get current settings
   * @returns {Object} - Settings object
   */
  getSettings() {
    return this.settings;
  }
  
  /**
   * Get current app version
   * @returns {string} - Version string
   */
  getAppVersion() {
    return this.appVersion;
  }
  
  /**
   * Skip a specific update version
   * @param {string} version - Version to skip
   */
  async skipUpdate(version) {
    this.settings.skipVersion = version;
    await this.updateSettings(this.settings);
  }
  
  /**
   * Check if an update version should be skipped
   * @param {string} version - Version to check
   * @returns {boolean} - True if the version should be skipped
   */
  shouldSkipUpdate(version) {
    return this.settings.skipVersion === version;
  }
  
  /**
   * Update the last update check time
   */
  async updateLastUpdateCheck() {
    this.settings.lastUpdateCheck = new Date().toISOString();
    await this.updateSettings(this.settings);
  }
}
