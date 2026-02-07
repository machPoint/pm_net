/**
 * Health Metrics Manager for OPAL Admin Panel
 * Handles fetching and displaying server health metrics
 */

// Health Metrics Manager
window.HealthMetricsManager = {
  // Initialize the health metrics manager
  init() {
    console.log('Initializing Health Metrics Manager');
    
    // Get DOM elements
    this.refreshButton = document.getElementById('refresh-metrics-button');
    this.lastUpdatedSpan = document.getElementById('last-updated');
    
    // Add event listeners
    this.refreshButton.addEventListener('click', () => this.fetchMetrics());
    
    // Initial fetch
    this.fetchMetrics();
    
    // Set up auto-refresh every 60 seconds
    this.autoRefreshInterval = setInterval(() => this.fetchMetrics(), 60000);
  },
  
  // Clean up resources when tab is changed
  cleanup() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
  },
  
  // Format bytes to human-readable format
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },
  
  // Format milliseconds to human-readable uptime
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  },
  
  // Update the last updated timestamp
  updateLastUpdated() {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString();
    this.lastUpdatedSpan.textContent = `Last updated: ${formattedTime}`;
  },
  
  // Set server status indicator
  setServerStatus(status) {
    const indicator = document.getElementById('server-status-indicator');
    const statusText = document.getElementById('server-status-text');
    
    indicator.className = 'status-dot';
    
    switch (status) {
      case 'healthy':
        indicator.classList.add('status-green');
        statusText.textContent = 'Healthy';
        break;
      case 'degraded':
        indicator.classList.add('status-yellow');
        statusText.textContent = 'Degraded';
        break;
      case 'unhealthy':
        indicator.classList.add('status-red');
        statusText.textContent = 'Unhealthy';
        break;
      default:
        statusText.textContent = 'Unknown';
    }
  },
  
  // Update metrics display with data
  updateMetricsDisplay(data) {
    // Server status
    this.setServerStatus(data.status);
    
    // Server info
    document.getElementById('uptime-value').textContent = this.formatUptime(data.uptime);
    document.getElementById('version-value').textContent = data.version;
    document.getElementById('nodejs-value').textContent = data.nodejs;
    
    // Resource usage
    document.getElementById('cpu-usage-value').textContent = `${data.cpuUsage.toFixed(1)}%`;
    document.getElementById('memory-usage-value').textContent = 
      `${this.formatBytes(data.memoryUsage.used)} / ${this.formatBytes(data.memoryUsage.total)} (${data.memoryUsage.percentage.toFixed(1)}%)`;
    document.getElementById('disk-usage-value').textContent = 
      `${this.formatBytes(data.diskUsage.used)} / ${this.formatBytes(data.diskUsage.total)} (${data.diskUsage.percentage.toFixed(1)}%)`;
    
    // MCP API stats
    document.getElementById('total-requests-value').textContent = data.apiStats.totalRequests.toLocaleString();
    document.getElementById('requests-per-minute-value').textContent = data.apiStats.requestsPerMinute.toFixed(2);
    document.getElementById('active-sessions-value').textContent = data.apiStats.activeSessions;
    
    // Database info
    document.getElementById('db-size-value').textContent = this.formatBytes(data.database.size);
    document.getElementById('db-status-value').textContent = data.database.status;
    document.getElementById('last-backup-value').textContent = data.database.lastBackup || 'Never';
    
    // Recent errors
    const errorsContainer = document.getElementById('recent-errors');
    errorsContainer.innerHTML = '';
    
    if (data.recentErrors && data.recentErrors.length > 0) {
      data.recentErrors.forEach(error => {
        const errorEntry = document.createElement('div');
        errorEntry.className = 'error-entry';
        
        const errorTime = document.createElement('div');
        errorTime.className = 'error-time';
        errorTime.textContent = new Date(error.timestamp).toLocaleString();
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = error.message;
        
        errorEntry.appendChild(errorTime);
        errorEntry.appendChild(errorMessage);
        errorsContainer.appendChild(errorEntry);
      });
    } else {
      errorsContainer.innerHTML = '<p>No recent errors</p>';
    }
  },
  
  // Fetch health metrics from the server
  async fetchMetrics() {
    try {
      this.refreshButton.disabled = true;
      this.refreshButton.innerHTML = '<span class="spinner"></span> Loading...';
      
      // Make sure we're using the global ApiService
      const apiService = window.ApiService;
      
      if (!apiService || typeof apiService.request !== 'function') {
        throw new Error('API Service is not properly initialized');
      }
      
      const response = await apiService.request('/admin/health-metrics');
      
      if (response && response.success) {
        this.updateMetricsDisplay(response.data);
        this.updateLastUpdated();
      } else {
        console.error('Failed to fetch health metrics:', response.error);
        alert('Failed to fetch health metrics: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching health metrics:', error);
      alert('Error fetching health metrics: ' + error.message);
    } finally {
      this.refreshButton.disabled = false;
      this.refreshButton.textContent = 'Refresh Metrics';
    }
  }
};

// Initialize the health metrics manager when the tab is activated
document.addEventListener('DOMContentLoaded', () => {
  console.log('Health metrics script loaded');
  
  // Make sure ApiService is available
  if (!window.ApiService) {
    console.error('ApiService not found. Health metrics may not work properly.');
  }
  
  // Get the health tab element
  const healthTab = document.querySelector('.nav-tab[data-tab="health"]');
  
  // Add event listener to initialize health metrics when the tab is clicked
  if (healthTab) {
    console.log('Health tab found, adding click listener');
    
    healthTab.addEventListener('click', () => {
      console.log('Health tab clicked');
      // Initialize health metrics manager if not already initialized
      if (!HealthMetricsManager.initialized) {
        console.log('Initializing Health Metrics Manager');
        HealthMetricsManager.init();
        HealthMetricsManager.initialized = true;
      }
    });
    
    // Also initialize if the health tab is already active
    if (healthTab.classList.contains('active')) {
      console.log('Health tab is active on load, initializing');
      setTimeout(() => {
        HealthMetricsManager.init();
        HealthMetricsManager.initialized = true;
      }, 500); // Small delay to ensure DOM is ready
    }
  } else {
    console.error('Health tab element not found');
  }
});
